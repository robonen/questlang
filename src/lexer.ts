import type { Token } from './ast';
import { TokenType } from './ast';

/**
 * Lexical analyzer for QuestLang
 */
export class Lexer {
  private source: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  // Keywords mapping
  private readonly keywords = new Map<string, TokenType>([
    ['квест', TokenType.QUEST],
    ['цель', TokenType.GOAL],
    ['граф', TokenType.GRAPH],
    ['узлы', TokenType.NODES],
    ['начало', TokenType.START],
    ['конец', TokenType.END],
    ['тип', TokenType.TYPE],
    ['описание', TokenType.DESCRIPTION],
    ['переходы', TokenType.TRANSITIONS],
    ['варианты', TokenType.OPTIONS],
    ['название', TokenType.TITLE],
    // Module system
    ['модуль', TokenType.MODULE],
    ['импорт', TokenType.IMPORT],
    ['экспорт', TokenType.EXPORT],
    ['из', TokenType.FROM],
    ['начальный', TokenType.INITIAL],
    ['действие', TokenType.ACTION],
    ['концовка', TokenType.ENDING],
  ]);

  constructor(source: string) {
    this.source = source;
  }

  /**
   * Tokenize the entire source code
   */
  public tokenize(): Token[] {
    this.tokens = [];
    this.position = 0;
    this.line = 1;
    this.column = 1;

    while (!this.isAtEnd()) {
      this.scanToken();
    }

    this.addToken(TokenType.EOF, '');

    return this.tokens;
  }

  private scanToken(): void {
    const start = this.position;
    const startLine = this.line;
    const startColumn = this.column;
    const c = this.advance();

    switch (c) {
      case ' ':
      case '\r':
      case '\t':
        // Skip whitespace
        break;
      case '\n':
        this.line++;
        this.column = 1;
        break;
      case ';':
        this.addToken(TokenType.SEMICOLON, c, start, startLine, startColumn);
        break;
      case ':':
        this.addToken(TokenType.COLON, c, start, startLine, startColumn);
        break;
      case ',':
        this.addToken(TokenType.COMMA, c, start, startLine, startColumn);
        break;
      case '.':
        this.addToken(TokenType.DOT, c, start, startLine, startColumn);
        break;
      case '@':
        this.addToken(TokenType.AT, c, start, startLine, startColumn);
        break;
      case '{':
        this.addToken(TokenType.LEFT_BRACE, c, start, startLine, startColumn);
        break;
      case '}':
        this.addToken(TokenType.RIGHT_BRACE, c, start, startLine, startColumn);
        break;
      case '[':
        this.addToken(TokenType.LEFT_BRACKET, c, start, startLine, startColumn);
        break;
      case ']':
        this.addToken(TokenType.RIGHT_BRACKET, c, start, startLine, startColumn);
        break;
      case '(':
        this.addToken(TokenType.LEFT_PAREN, c, start, startLine, startColumn);
        break;
      case ')':
        this.addToken(TokenType.RIGHT_PAREN, c, start, startLine, startColumn);
        break;
      case '/':
        if (this.match('/')) {
          this.scanComment(start, startLine, startColumn);
        }
        else {
          throw new Error(`Unexpected character: ${c} at ${startLine}:${startColumn}`);
        }
        break;
      case '"':
        this.scanString(start, startLine, startColumn);
        break;
      default:
        if (this.isDigit(c)) {
          this.scanNumber(start, startLine, startColumn);
        }
        else if (this.isAlpha(c)) {
          this.scanIdentifier(start, startLine, startColumn);
        }
        else {
          throw new Error(`Unexpected character: ${c} at ${startLine}:${startColumn}`);
        }
        break;
    }
  }

  private scanComment(start: number, startLine: number, startColumn: number): void {
    while (this.peek() !== '\n' && !this.isAtEnd()) {
      this.advance();
    }
    const value = this.source.substring(start, this.position);
    this.addToken(TokenType.COMMENT, value, start, startLine, startColumn);
  }

  private scanString(start: number, startLine: number, startColumn: number): void {
    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === '\n') {
        this.line++;
        this.column = 1;
      }
      this.advance();
    }

    if (this.isAtEnd()) {
      throw new Error(`Unterminated string at ${startLine}:${startColumn}`);
    }

    // Consume closing "
    this.advance();

    // Get string content without quotes
    const value = this.source.substring(start + 1, this.position - 1);
    this.addToken(TokenType.STRING, value, start, startLine, startColumn);
  }

  private scanNumber(start: number, startLine: number, startColumn: number): void {
    while (this.isDigit(this.peek())) {
      this.advance();
    }

    // Look for decimal part
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance(); // consume '.'
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    const value = this.source.substring(start, this.position);
    this.addToken(TokenType.NUMBER, value, start, startLine, startColumn);
  }

  private scanIdentifier(start: number, startLine: number, startColumn: number): void {
    while (this.isAlphaNumeric(this.peek()) || this.peek() === '_') {
      this.advance();
    }

    const value = this.source.substring(start, this.position);
    const type = this.keywords.get(value) || TokenType.IDENTIFIER;
    this.addToken(type, value, start, startLine, startColumn);
  }

  private addToken(type: TokenType, value: string, start?: number, line?: number, column?: number): void {
    this.tokens.push({
      type,
      value,
      line: line || this.line,
      column: column || this.column,
      start: start || this.position,
      end: this.position,
    });
  }

  private advance(): string {
    const char = this.source.charAt(this.position);
    this.position++;
    this.column++;
    return char;
  }

  private match(expected: string): boolean {
    if (this.isAtEnd())
      return false;
    if (this.source.charAt(this.position) !== expected)
      return false;
    this.position++;
    this.column++;
    return true;
  }

  private peek(): string {
    if (this.isAtEnd())
      return '\0';
    return this.source.charAt(this.position);
  }

  private peekNext(): string {
    if (this.position + 1 >= this.source.length)
      return '\0';
    return this.source.charAt(this.position + 1);
  }

  private isAtEnd(): boolean {
    return this.position >= this.source.length;
  }

  private isDigit(c: string): boolean {
    return c >= '0' && c <= '9';
  }

  private isAlpha(c: string): boolean {
    return (c >= 'a' && c <= 'z')
      || (c >= 'A' && c <= 'Z')
      || (c >= 'а' && c <= 'я')
      || (c >= 'А' && c <= 'Я')
      || c === 'ё' || c === 'Ё'
      || c === '_';
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }
}
