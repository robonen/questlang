import { beforeEach, describe, expect, it } from 'vitest';
import { QuestLang } from '..';

describe('questInterpreter', () => {
  const questSource = `
    квест ТестКвест;
    цель "Найти выход из лабиринта";
    
    граф {
      узлы {
        старт: {
          тип: начальный;
          описание: "Вы стоите перед входом в лабиринт";
          переходы: [выбор];
        }
        
        выбор: {
          тип: действие;
          описание: "Перед вами два коридора. Куда пойти?";
          варианты: [
            ("Налево", налево),
            ("Направо", направо)
          ];
        }
        
        налево: {
          тип: действие;
          описание: "Вы идете налево и находите сокровище!";
          варианты: [
            ("Взять сокровище", победа)
          ];
        }
        
        направо: {
          тип: концовка;
          название: "Ловушка!";
          описание: "Вы попали в ловушку и проиграли";
        }
        
        победа: {
          тип: концовка;
          название: "Победа!";
          описание: "Вы нашли сокровище и победили";
        }
      }
      
      начало: старт;
    }
    конец;
  `;

  let interpreter: any;

  beforeEach(() => {
    interpreter = QuestLang.interpret(questSource);
  });

  it('should initialize with correct quest info', () => {
    const questInfo = interpreter.getQuestInfo();

    expect(questInfo.name).toBe('ТестКвест');
    expect(questInfo.goal).toBe('Найти выход из лабиринта');
    expect(questInfo.isComplete).toBe(false);
  });

  it('should start with correct initial state', () => {
    const state = interpreter.getState();

    expect(state.currentNode).toBe('старт');
    expect(state.history).toHaveLength(0);
    expect(state.isComplete).toBe(false);
  });

  it('should get current node information', () => {
    const currentNode = interpreter.getCurrentNode();

    expect(currentNode).toBeDefined();
    expect(currentNode?.id).toBe('старт');
    expect(currentNode?.nodeType).toBe('начальный');
  });

  it('should move to next node', () => {
    const result = interpreter.moveToNode('выбор');

    expect(result.success).toBe(true);
    expect(result.newState.currentNode).toBe('выбор');
    expect(result.newState.history).toContain('старт');
  });

  it('should get available choices for action node', () => {
    interpreter.moveToNode('выбор');
    const choices = interpreter.getAvailableChoices();

    expect(choices).toHaveLength(2);
    expect(choices[0].text).toBe('Налево');
    expect(choices[0].target).toBe('налево');
    expect(choices[1].text).toBe('Направо');
    expect(choices[1].target).toBe('направо');
  });

  it('should execute choice correctly', () => {
    interpreter.moveToNode('выбор');
    const result = interpreter.executeChoice(0); // Choose "Налево"

    expect(result.success).toBe(true);
    expect(result.newState.currentNode).toBe('налево');
  });

  it('should handle invalid choice index', () => {
    interpreter.moveToNode('выбор');
    const result = interpreter.executeChoice(5); // Invalid index

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid choice index');
  });

  it('should complete quest when reaching ending', () => {
    interpreter.moveToNode('направо'); // Go to ending
    const state = interpreter.getState();

    expect(state.isComplete).toBe(true);
    expect(state.endingTitle).toBe('Ловушка!');
  });

  it('should reset to initial state', () => {
    interpreter.moveToNode('выбор');
    interpreter.reset();

    const state = interpreter.getState();
    expect(state.currentNode).toBe('старт');
    expect(state.history).toHaveLength(0);
    expect(state.isComplete).toBe(false);
  });

  it('should validate quest structure', () => {
    const validation = interpreter.validate();

    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should detect invalid quest structure', () => {
    const invalidSource = `
      квест Неправильный;
      цель "Тест";
      граф {
        узлы {
          старт: {
            тип: действие;
            описание: "Тест";
            варианты: [
              ("Выбор", несуществующийУзел)
            ];
          }
        }
        начало: старт;
      }
      конец;
    `;

    const invalidInterpreter = QuestLang.interpret(invalidSource);
    const validation = invalidInterpreter.validate();

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Node \'старт\' references non-existent target \'несуществующийУзел\'');
  });

  it('should find all possible paths', () => {
    const paths = interpreter.getAllPaths();

    expect(paths.length).toBeGreaterThan(0);
    // Should have at least two paths (налево->победа and направо)
    expect(paths.some(path => path.includes('победа'))).toBe(true);
    expect(paths.some(path => path.includes('направо'))).toBe(true);
  });
});
