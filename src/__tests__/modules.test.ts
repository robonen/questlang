import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { QuestLang } from '..';
import { Lexer } from '../lexer';
import { Parser } from '../parser';

describe('module system', () => {
  it('parses a module with exports', () => {
    const src = `
      модуль Тест;
      узлы {
        финал: { тип: концовка; название: "x"; описание: "y"; }
      }
      экспорт [финал];
    `;
    const lexer = new Lexer(src);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parseAny() as any;

    expect(ast.type).toBe('Module');
    expect(ast.name).toBe('Тест');
    expect(ast.nodes.финал).toBeDefined();
    expect(ast.exports).toEqual(['финал']);
  });

  it('imports a module and validates module-qualified references', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ql-mod-'));

    const modulePath = path.join(dir, 'loc.ql');
    fs.writeFileSync(modulePath, `
      модуль Локации;
      узлы {
        лес: { тип: концовка; название: "Лес"; описание: "Вы в лесу"; }
      }
      экспорт [лес];
    `);

    const questPath = path.join(dir, 'main.ql');
    const quest = `
      квест Модульный;
      цель "Тест модулей";
      импорт Локации из "./loc.ql";
      граф {
        узлы {
          старт: { тип: начальный; описание: "начало"; переходы: [шаг]; }
          шаг: { тип: действие; описание: "куда?"; варианты: [("В лес", @Локации.лес)]; }
        }
        начало: старт;
      }
      конец;
    `;
    fs.writeFileSync(questPath, quest);

    const interpreter = QuestLang.interpret(quest, questPath);
    const validation = interpreter.validate();
    expect(validation.isValid).toBe(true);
  });

  it('supports cyclic imports between modules', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ql-mod-'));

    // Module A imports B and points to @B.b
    const aPath = path.join(dir, 'a.ql');
    fs.writeFileSync(aPath, `
      модуль A;
      импорт B из "./b.ql";
      узлы {
        a: { тип: действие; описание: "a"; варианты: [("go", @B.b)]; }
      }
      экспорт [a];
    `);

    // Module B imports A and points to @A.a
    const bPath = path.join(dir, 'b.ql');
    fs.writeFileSync(bPath, `
      модуль B;
      импорт A из "./a.ql";
      узлы {
        b: { тип: действие; описание: "b"; варианты: [("go", @A.a)]; }
      }
      экспорт [b];
    `);

    // Main quest imports A and can reach @A.a
    const qPath = path.join(dir, 'main.ql');
    fs.writeFileSync(qPath, `
      квест Q;
      цель "cyclic";
      импорт A из "./a.ql";
      граф {
        узлы {
          старт: { тип: начальный; описание: "s"; переходы: [go]; }
          go: { тип: действие; описание: "go"; варианты: [("to A", @A.a)]; }
        }
        начало: старт;
      }
      конец;
    `);

    const interpreter = QuestLang.interpret(fs.readFileSync(qPath, 'utf8'), qPath);
    const validation = interpreter.validate();
    expect(validation.isValid).toBe(true);
  });

  it('fails validation when referencing non-exported node', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ql-mod-'));

    const modulePath = path.join(dir, 'loc.ql');
    fs.writeFileSync(modulePath, `
      модуль Локации;
      узлы {
        секрет: { тип: концовка; название: "секрет"; описание: "секрет"; }
      }
      экспорт [];
    `);

    const questPath = path.join(dir, 'main.ql');
    const quest = `
      квест Модульный;
      цель "Тест модулей";
      импорт Локации из "./loc.ql";
      граф {
        узлы {
          старт: { тип: начальный; описание: "начало"; переходы: [шаг]; }
          шаг: { тип: действие; описание: "куда?"; варианты: [("Секрет", @Локации.секрет)]; }
        }
        начало: старт;
      }
      конец;
    `;
    fs.writeFileSync(questPath, quest);

    const interpreter = QuestLang.interpret(quest, questPath);
    const validation = interpreter.validate();
    expect(validation.isValid).toBe(false);
    expect(validation.errors.some(e => e.includes('non-existent') || e.includes('not exported'))).toBe(true);
  });
});
