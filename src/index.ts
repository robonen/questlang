import type { QuestProgram } from './ast';
import type { ModuleHost } from './module-loader';
import { QuestInterpreter } from './interpreter';
import { Lexer } from './lexer';
import { Parser } from './parser';

/**
 * Main QuestLang processor
 */
export class QuestLang {
  /**
   * Parse QuestLang source code and return AST
   */
  public static parse(source: string): QuestProgram {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new Parser(tokens);
    return parser.parse();
  }

  /**
   * Create interpreter from source code
   */
  public static interpret(source: string, filePath?: string, host?: ModuleHost): QuestInterpreter {
    const ast = this.parse(source);
    return new QuestInterpreter(ast, filePath, host);
  }

  /**
   * Validate QuestLang source code
   */
  public static validate(source: string, filePath?: string, host?: ModuleHost): { isValid: boolean; errors: string[] } {
    try {
      const interpreter = this.interpret(source, filePath, host);
      return interpreter.validate();
    }
    catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown parsing error'],
      };
    }
  }
}

export * from './ast';
export { QuestInterpreter } from './interpreter';
export { Lexer } from './lexer';
export type { ModuleHost } from './module-loader';
export { Parser } from './parser';
