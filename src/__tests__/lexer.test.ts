import { describe, expect, it } from 'vitest';
import { TokenType } from '..';
import { Lexer } from '../lexer';

describe('lexer', () => {
  it('should tokenize quest keywords', () => {
    const source = 'квест Тест; цель "Описание"; конец;';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0]?.type).toBe(TokenType.QUEST);
    expect(tokens[0]?.value).toBe('квест');

    expect(tokens[1]?.type).toBe(TokenType.IDENTIFIER);
    expect(tokens[1]?.value).toBe('Тест');

    expect(tokens[2]?.type).toBe(TokenType.SEMICOLON);

    expect(tokens[3]?.type).toBe(TokenType.GOAL);
    expect(tokens[3]?.value).toBe('цель');

    expect(tokens[4]?.type).toBe(TokenType.STRING);
    expect(tokens[4]?.value).toBe('Описание');
  });

  it('should tokenize strings correctly', () => {
    const source = '"Тестовая строка с пробелами"';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0]?.type).toBe(TokenType.STRING);
    expect(tokens[0]?.value).toBe('Тестовая строка с пробелами');
  });

  it('should tokenize numbers', () => {
    const source = '42 3.14';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0]?.type).toBe(TokenType.NUMBER);
    expect(tokens[0]?.value).toBe('42');

    expect(tokens[1]?.type).toBe(TokenType.NUMBER);
    expect(tokens[1]?.value).toBe('3.14');
  });

  it('should handle comments', () => {
    const source = '// это комментарий\nквест';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0]?.type).toBe(TokenType.COMMENT);
    expect(tokens[0]?.value).toBe('// это комментарий');

    expect(tokens[1]?.type).toBe(TokenType.QUEST);
  });

  it('should track line and column numbers', () => {
    const source = 'квест\nТест';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0]?.line).toBe(1);
    expect(tokens[0]?.column).toBe(1);

    expect(tokens[1]?.line).toBe(2);
    expect(tokens[1]?.column).toBe(1);
  });

  it('should handle all symbols', () => {
    const source = '{ } [ ] ( ) : ; , .';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const expectedTypes = [
      TokenType.LEFT_BRACE,
      TokenType.RIGHT_BRACE,
      TokenType.LEFT_BRACKET,
      TokenType.RIGHT_BRACKET,
      TokenType.LEFT_PAREN,
      TokenType.RIGHT_PAREN,
      TokenType.COLON,
      TokenType.SEMICOLON,
      TokenType.COMMA,
      TokenType.DOT,
    ];

    expectedTypes.forEach((expectedType, index) => {
      expect(tokens[index]?.type).toBe(expectedType);
    });
  });

  it('should throw error on unexpected character', () => {
    const source = 'квест @';
    const lexer = new Lexer(source);

    expect(() => lexer.tokenize()).toThrow('Unexpected character');
  });

  it('should throw error on unterminated string', () => {
    const source = 'квест "незакрытая строка';
    const lexer = new Lexer(source);

    expect(() => lexer.tokenize()).toThrow('Unterminated string');
  });
});
