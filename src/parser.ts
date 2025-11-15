import type { ActionNode, EndingNode, GraphNode, ImportNode, InitialNode, ModuleNode, NodeDefinition, OptionChoice, QuestProgram, Token } from './ast';
import { TokenType } from './ast';

/**
 * Parser for QuestLang
 */
export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    // Filter out comments and whitespace
    this.tokens = tokens.filter(token =>
      token.type !== TokenType.COMMENT
      && token.type !== TokenType.WHITESPACE,
    );
  }

  /**
   * Parse the entire program strictly as a quest (backward compatibility for existing API)
   */
  public parse(): QuestProgram {
    return this.parseQuest();
  }

  /**
   * Parse either a module or a quest program.
   */
  public parseAny(): QuestProgram | ModuleNode {
    if (this.check(TokenType.MODULE)) {
      return this.parseModule();
    }
    return this.parseQuest();
  }

  private parseQuest(): QuestProgram {
    const questToken = this.consume(TokenType.QUEST, 'Expected \'квест\'');
    const name = this.consume(TokenType.IDENTIFIER, 'Expected quest name').value;
    this.consume(TokenType.SEMICOLON, 'Expected \';\' after quest name');

    const goal = this.parseGoal();
    const imports = this.parseImports();
    const graph = this.parseGraph();

    this.consume(TokenType.END, 'Expected \'конец\'');
    this.consume(TokenType.SEMICOLON, 'Expected \';\' after \'конец\'');

    return {
      type: 'QuestProgram',
      name,
      goal,
      graph,
      // Only attach if there were imports to preserve older shape
      ...(imports.length > 0 ? { imports } : {}),
      line: questToken.line,
      column: questToken.column,
    };
  }

  private parseModule(): ModuleNode {
    const moduleToken = this.consume(TokenType.MODULE, 'Expected \'модуль\'');
    const name = this.consume(TokenType.IDENTIFIER, 'Expected module name').value;
    this.consume(TokenType.SEMICOLON, 'Expected \';\' after module name');

    const nodes: Record<string, NodeDefinition> = {};
    let exports: string[] = [];
    const imports: ImportNode[] = [];

    // Module body: allow 'узлы { ... }' and optional 'экспорт [..];' in any order
    while (!this.isAtEnd()) {
      if (this.match(TokenType.IMPORT)) {
        // Rewind one token back because parseImports expects current to be on IMPORT
        this.current--;
        const more = this.parseImports();
        imports.push(...more);
      }
      else if (this.match(TokenType.NODES)) {
        this.parseNodes(nodes);
      }
      else if (this.match(TokenType.EXPORT)) {
        exports = this.parseExports();
      }
      else if (this.check(TokenType.EOF)) {
        break;
      }
      else {
        // Unknown token — be explicit
        throw new Error(`Unexpected token in module: ${this.peek().type} at ${this.peek().line}:${this.peek().column}`);
      }
    }

    return {
      type: 'Module',
      name,
      nodes,
      exports,
      ...(imports.length > 0 ? { imports } : {}),
      line: moduleToken.line,
      column: moduleToken.column,
    } as ModuleNode;
  }

  private parseGoal(): string {
    this.consume(TokenType.GOAL, 'Expected \'цель\'');
    const goalValue = this.consume(TokenType.STRING, 'Expected goal description').value;
    this.consume(TokenType.SEMICOLON, 'Expected \';\' after goal');
    return goalValue;
  }

  private parseGraph(): GraphNode {
    const graphToken = this.consume(TokenType.GRAPH, 'Expected \'граф\'');
    this.consume(TokenType.LEFT_BRACE, 'Expected \'{\' after \'граф\'');

    const nodes: Record<string, NodeDefinition> = {};
    let start = '';

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.NODES)) {
        this.parseNodes(nodes);
      }
      else if (this.match(TokenType.START)) {
        this.consume(TokenType.COLON, 'Expected \':\' after \'начало\'');
        start = this.consume(TokenType.IDENTIFIER, 'Expected start node identifier').value;
        this.consume(TokenType.SEMICOLON, 'Expected \';\' after start node');
      }
      else {
        throw new Error(`Unexpected token in graph: ${this.peek().type} at ${this.peek().line}:${this.peek().column}`);
      }
    }

    this.consume(TokenType.RIGHT_BRACE, 'Expected \'}\' after graph body');

    return {
      type: 'Graph',
      nodes,
      start,
      line: graphToken.line,
      column: graphToken.column,
    };
  }

  private parseNodes(nodes: Record<string, NodeDefinition>): void {
    this.consume(TokenType.LEFT_BRACE, 'Expected \'{\' after \'узлы\'');

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      const nodeId = this.consume(TokenType.IDENTIFIER, 'Expected node identifier').value;
      this.consume(TokenType.COLON, 'Expected \':\' after node identifier');
      this.consume(TokenType.LEFT_BRACE, 'Expected \'{\' after node identifier');

      const node = this.parseNodeDefinition(nodeId);
      nodes[nodeId] = node;

      this.consume(TokenType.RIGHT_BRACE, 'Expected \'}\' after node definition');
    }

    this.consume(TokenType.RIGHT_BRACE, 'Expected \'}\' after nodes');
  }

  private parseNodeDefinition(id: string): NodeDefinition {
    const startToken = this.peek();
    let nodeType: 'начальный' | 'действие' | 'концовка' = 'действие';
    let description = '';
    const transitions: string[] = [];
    const options: OptionChoice[] = [];
    let title = '';

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.TYPE)) {
        this.consume(TokenType.COLON, 'Expected \':\' after \'тип\'');
        const typeToken = this.advance();
        if (typeToken.type === TokenType.INITIAL) {
          nodeType = 'начальный';
        }
        else if (typeToken.type === TokenType.ACTION) {
          nodeType = 'действие';
        }
        else if (typeToken.type === TokenType.ENDING) {
          nodeType = 'концовка';
        }
        else {
          throw new Error(`Invalid node type: ${typeToken.value} at ${typeToken.line}:${typeToken.column}`);
        }
        this.consume(TokenType.SEMICOLON, 'Expected \';\' after node type');
      }
      else if (this.match(TokenType.DESCRIPTION)) {
        this.consume(TokenType.COLON, 'Expected \':\' after \'описание\'');
        description = this.consume(TokenType.STRING, 'Expected description string').value;
        this.consume(TokenType.SEMICOLON, 'Expected \';\' after description');
      }
      else if (this.match(TokenType.TRANSITIONS)) {
        this.consume(TokenType.COLON, 'Expected \':\' after \'переходы\'');
        this.parseTransitions(transitions);
      }
      else if (this.match(TokenType.OPTIONS)) {
        this.consume(TokenType.COLON, 'Expected \':\' after \'варианты\'');
        this.parseOptions(options);
      }
      else if (this.match(TokenType.TITLE)) {
        this.consume(TokenType.COLON, 'Expected \':\' after \'название\'');
        title = this.consume(TokenType.STRING, 'Expected title string').value;
        this.consume(TokenType.SEMICOLON, 'Expected \';\' after title');
      }
      else {
        throw new Error(`Unexpected token in node definition: ${this.peek().type} at ${this.peek().line}:${this.peek().column}`);
      }
    }

    // Create appropriate node type
    const baseNode = {
      id,
      nodeType,
      description,
      line: startToken.line,
      column: startToken.column,
    };

    switch (nodeType) {
      case 'начальный':
        return {
          ...baseNode,
          type: 'InitialNode',
          transitions,
        } as InitialNode;
      case 'действие':
        return {
          ...baseNode,
          type: 'ActionNode',
          options,
        } as ActionNode;
      case 'концовка':
        return {
          ...baseNode,
          type: 'EndingNode',
          title,
        } as EndingNode;
    }
  }

  private parseTransitions(transitions: string[]): void {
    this.consume(TokenType.LEFT_BRACKET, 'Expected \'[\' for transitions');

    if (!this.check(TokenType.RIGHT_BRACKET)) {
      do {
        const transition = this.parseTargetString();
        transitions.push(transition);
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_BRACKET, 'Expected \']\' after transitions');
    this.consume(TokenType.SEMICOLON, 'Expected \';\' after transitions');
  }

  private parseOptions(options: OptionChoice[]): void {
    this.consume(TokenType.LEFT_BRACKET, 'Expected \'[\' for options');

    if (!this.check(TokenType.RIGHT_BRACKET)) {
      do {
        const optionToken = this.peek();
        this.consume(TokenType.LEFT_PAREN, 'Expected \'(\' for option');
        const text = this.consume(TokenType.STRING, 'Expected option text').value;
        this.consume(TokenType.COMMA, 'Expected \',\' in option');
        const target = this.parseTargetString();
        this.consume(TokenType.RIGHT_PAREN, 'Expected \')\' after option');

        options.push({
          type: 'OptionChoice',
          text,
          target,
          line: optionToken.line,
          column: optionToken.column,
        });
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_BRACKET, 'Expected \']\' after options');
    this.consume(TokenType.SEMICOLON, 'Expected \';\' after options');
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd())
      return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd())
      this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current] || { type: TokenType.EOF, value: '', line: 0, column: 0, start: 0, end: 0 };
  }

  private previous(): Token {
    return this.tokens[this.current - 1] || { type: TokenType.EOF, value: '', line: 0, column: 0, start: 0, end: 0 };
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type))
      return this.advance();

    const current = this.peek();
    throw new Error(`${message}. Got ${current.type} at ${current.line}:${current.column}`);
  }

  /**
   * Parse zero or more import declarations appearing before the graph.
   */
  private parseImports(): ImportNode[] {
    const imports: ImportNode[] = [];

    while (this.match(TokenType.IMPORT)) {
      const importTok = this.previous();
      const moduleName = this.consume(TokenType.IDENTIFIER, 'Expected module name').value;

      // Optional alias syntax: <name> как <alias> (not implemented now)

      this.consume(TokenType.FROM, 'Expected \'из\'');
      const modulePathTok = this.consume(TokenType.STRING, 'Expected module path');
      this.consume(TokenType.SEMICOLON, 'Expected \';\' after import');

      imports.push({
        type: 'Import',
        moduleName,
        modulePath: modulePathTok.value,
        line: importTok.line,
        column: importTok.column,
      });
    }

    return imports;
  }

  /**
   * Parse export list: экспорт [a, b];
   */
  private parseExports(): string[] {
    this.consume(TokenType.LEFT_BRACKET, 'Expected \'[\' after \'экспорт\'');
    const exports: string[] = [];

    if (!this.check(TokenType.RIGHT_BRACKET)) {
      do {
        const id = this.consume(TokenType.IDENTIFIER, 'Expected exported node identifier').value;
        exports.push(id);
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_BRACKET, '] expected after export list');
    this.consume(TokenType.SEMICOLON, 'Expected \';\' after export list');

    return exports;
  }

  /**
   * Parse a local or module-qualified target into a raw string.
   * Examples: идентификатор | @Модуль.ид
   */
  private parseTargetString(): string {
    if (this.match(TokenType.AT)) {
      const moduleName = this.consume(TokenType.IDENTIFIER, 'Expected module name after @').value;
      this.consume(TokenType.DOT, 'Expected \'.\' after module name');
      const nodeId = this.consume(TokenType.IDENTIFIER, 'Expected node identifier after module name').value;
      return `@${moduleName}.${nodeId}`;
    }
    // Local identifier
    return this.consume(TokenType.IDENTIFIER, 'Expected target identifier').value;
  }
}
