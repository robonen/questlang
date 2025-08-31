import { describe, expect, it } from 'vitest';
import { QuestLang } from '..';

describe('questLang Integration', () => {
  it('should parse and validate complete quest', () => {
    const questSource = `
      квест ИнтеграционныйТест;
      цель "Полная проверка функциональности";
      
      граф {
        узлы {
          старт: {
            тип: начальный;
            описание: "Начало квеста";
            переходы: [действие1];
          }
          
          действие1: {
            тип: действие;
            описание: "Первое решение";
            варианты: [
              ("Вариант А", действие2),
              ("Вариант Б", концовка1)
            ];
          }
          
          действие2: {
            тип: действие;
            описание: "Второе решение";
            варианты: [
              ("Продолжить", концовка2)
            ];
          }
          
          концовка1: {
            тип: концовка;
            название: "Быстрый финал";
            описание: "Вы завершили квест быстро";
          }
          
          концовка2: {
            тип: концовка;
            название: "Полный финал";
            описание: "Вы прошли весь квест";
          }
        }
        
        начало: старт;
      }
      конец;
    `;

    // Test parsing
    const ast = QuestLang.parse(questSource);
    expect(ast.name).toBe('ИнтеграционныйТест');
    expect(ast.goal).toBe('Полная проверка функциональности');

    // Test interpretation
    const interpreter = QuestLang.interpret(questSource);
    expect(interpreter.getQuestInfo().name).toBe('ИнтеграционныйТест');

    // Test validation
    const validation = QuestLang.validate(questSource);
    expect(validation.isValid).toBe(true);

    // Test gameplay flow
    interpreter.moveToNode('действие1');
    const choices = interpreter.getAvailableChoices();
    expect(choices).toHaveLength(2);

    const result = interpreter.executeChoice(0);
    expect(result.success).toBe(true);
    expect(result.newState.currentNode).toBe('действие2');
  });

  it('should handle parsing errors gracefully', () => {
    const invalidSource = 'квест без точки с запятой';

    const validation = QuestLang.validate(invalidSource);
    expect(validation.isValid).toBe(false);
    expect(validation.errors[0]).toContain('Expected');
  });

  it('should work with the original quest example', () => {
    const originalQuest = `
      квест Шашлык;
      цель "Сегодня день труда и отдыха и надо купить шашлык. На пути нас встречают разнообразные трудности.";

      граф {
        узлы {
          старт: {
            тип: начальный;
            описание: "Начало приключения";
            переходы: [выбор_пути];
          }
          
          выбор_пути: {
            тип: действие;
            описание: "Ближайшая дешёвая шашлычная находится в 100 метрах от вас. Хорошая - в 1 км. Куда идти?";
            варианты: [
              ("Пойти в дешёвую шашлычную", дешевая_очередь),
              ("Пойти в хорошую шашлычную", дорога_к_хорошей),
              ("Пойти домой", поход_в_магазин)
            ];
          }
          
          дешевая_очередь: {
            тип: концовка;
            название: "В очереди";
            описание: "Вы стоите в очереди за шашлыком";
          }
          
          дорога_к_хорошей: {
            тип: концовка;
            название: "Дорога к хорошей шашлычной";
            описание: "Вы идёте к хорошей шашлычной";
          }
          
          поход_в_магазин: {
            тип: концовка;
            название: "В магазине";
            описание: "Вы пошли в магазин за продуктами";
          }
        }
        
        начало: старт;
      }
      конец;
    `;

    const validation = QuestLang.validate(originalQuest);
    expect(validation.isValid).toBe(true);

    const interpreter = QuestLang.interpret(originalQuest);
    expect(interpreter.getQuestInfo().name).toBe('Шашлык');

    // Test navigation
    interpreter.moveToNode('выбор_пути');
    const choices = interpreter.getAvailableChoices();
    expect(choices).toHaveLength(3);
    expect(choices[0]?.text).toBe('Пойти в дешёвую шашлычную');
  });
});
