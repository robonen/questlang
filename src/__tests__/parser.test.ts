import { describe, expect, it } from 'vitest';
import { Lexer } from '../lexer';
import { Parser } from '../parser';

describe('parser', () => {
  const parseSource = (source: string) => {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
  };

  it('should parse simple quest', () => {
    const source = `
      квест ТестКвест;
      цель "Тестовое описание";
      
      граф {
        узлы {
          старт: {
            тип: начальный;
            описание: "Начало";
            переходы: [действие1];
          }
          
          действие1: {
            тип: действие;
            описание: "Первое действие";
            варианты: [
              ("Выбор 1", конец1),
              ("Выбор 2", конец2)
            ];
          }
          
          конец1: {
            тип: концовка;
            название: "Первый финал";
            описание: "Описание финала";
          }
          
          конец2: {
            тип: концовка;
            название: "Второй финал";
            описание: "Описание второго финала";
          }
        }
        
        начало: старт;
      }
      конец;
    `;

    const ast = parseSource(source);

    expect(ast.type).toBe('QuestProgram');
    expect(ast.name).toBe('ТестКвест');
    expect(ast.goal).toBe('Тестовое описание');
    expect(ast.graph.start).toBe('старт');

    const nodes = ast.graph.nodes;
    expect(Object.keys(nodes)).toHaveLength(4);
    expect(nodes.старт?.nodeType).toBe('начальный');
    expect(nodes.действие1?.nodeType).toBe('действие');
    expect(nodes.конец1?.nodeType).toBe('концовка');
    expect(nodes.конец2?.nodeType).toBe('концовка');
  });

  it('should parse action node with options', () => {
    const source = `
      квест Тест;
      цель "Тест";
      граф {
        узлы {
          действие1: {
            тип: действие;
            описание: "Выберите действие";
            варианты: [
              ("Первый вариант", цель1),
              ("Второй вариант", цель2)
            ];
          }
        }
        начало: действие1;
      }
      конец;
    `;

    const ast = parseSource(source);
    const actionNode = ast.graph.nodes.действие1 as any;

    expect(actionNode.nodeType).toBe('действие');
    expect(actionNode.options).toHaveLength(2);
    expect(actionNode.options[0].text).toBe('Первый вариант');
    expect(actionNode.options[0].target).toBe('цель1');
    expect(actionNode.options[1].text).toBe('Второй вариант');
    expect(actionNode.options[1].target).toBe('цель2');
  });

  it('should parse ending node with title', () => {
    const source = `
      квест Тест;
      цель "Тест";
      граф {
        узлы {
          финал: {
            тип: концовка;
            название: "Название финала";
            описание: "Описание финала";
          }
        }
        начало: финал;
      }
      конец;
    `;

    const ast = parseSource(source);
    const endingNode = ast.graph.nodes.финал as any;

    expect(endingNode.nodeType).toBe('концовка');
    expect(endingNode.title).toBe('Название финала');
    expect(endingNode.description).toBe('Описание финала');
  });

  it('should throw error on missing semicolon', () => {
    const source = 'квест Тест цель "Описание"';

    expect(() => parseSource(source)).toThrow('Expected \';\' after quest name');
  });

  it('should throw error on invalid node type', () => {
    const source = `
      квест Тест;
      цель "Тест";
      граф {
        узлы {
          узел1: {
            тип: неправильныйТип;
            описание: "Тест";
          }
        }
        начало: узел1;
      }
      конец;
    `;

    expect(() => parseSource(source)).toThrow('Invalid node type');
  });
});
