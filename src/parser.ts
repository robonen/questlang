import { TokenType } from './ast';
import type { Token } from './ast';
import type {
  ASTNode,
  QuestProgram,
  GraphNode,
  NodeDefinition,
  InitialNode,
  ActionNode,
  EndingNode,
  OptionChoice,
  StringLiteral,
  Identifier
} from './ast';

/**
 * Parser for QuestLang
 */
export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    // Filter out comments and whitespace
    this.tokens = tokens.filter(token => 
      token.type !== TokenType.COMMENT && 
      token.type !== TokenType.WHITESPACE
    );
  }

  /**
   * Parse the entire program
   */
  public parse(): QuestProgram {
    return this.parseQuest();
  }

  private parseQuest(): QuestProgram {
    const questToken = this.consume(TokenType.QUEST, "Expected 'квест'");
    const name = this.consume(TokenType.IDENTIFIER, "Expected quest name").value;
    this.consume(TokenType.SEMICOLON, "Expected ';' after quest name");

    const goal = this.parseGoal();
    const graph = this.parseGraph();

    this.consume(TokenType.END, "Expected 'конец'");
    this.consume(TokenType.SEMICOLON, "Expected ';' after 'конец'");

    return {
      type: 'QuestProgram',
      name,
      goal,
      graph,
      line: questToken.line,
      column: questToken.column
    };
  }

  private parseGoal(): string {
    this.consume(TokenType.GOAL, "Expected 'цель'");
    const goalValue = this.consume(TokenType.STRING, "Expected goal description").value;
    this.consume(TokenType.SEMICOLON, "Expected ';' after goal");
    return goalValue;
  }

  private parseGraph(): GraphNode {
    const graphToken = this.consume(TokenType.GRAPH, "Expected 'граф'");
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after 'граф'");

    const nodes: Record<string, NodeDefinition> = {};
    let start = '';

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.NODES)) {
        this.parseNodes(nodes);
      } else if (this.match(TokenType.START)) {
        this.consume(TokenType.COLON, "Expected ':' after 'начало'");
        start = this.consume(TokenType.IDENTIFIER, "Expected start node identifier").value;
        this.consume(TokenType.SEMICOLON, "Expected ';' after start node");
      } else {
        throw new Error(`Unexpected token in graph: ${this.peek().type} at ${this.peek().line}:${this.peek().column}`);
      }
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after graph body");

    return {
      type: 'Graph',
      nodes,
      start,
      line: graphToken.line,
      column: graphToken.column
    };
  }

  private parseNodes(nodes: Record<string, NodeDefinition>): void {
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after 'узлы'");

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      const nodeId = this.consume(TokenType.IDENTIFIER, "Expected node identifier").value;
      this.consume(TokenType.COLON, "Expected ':' after node identifier");
      this.consume(TokenType.LEFT_BRACE, "Expected '{' after node identifier");

      const node = this.parseNodeDefinition(nodeId);
      nodes[nodeId] = node;

      this.consume(TokenType.RIGHT_BRACE, "Expected '}' after node definition");
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after nodes");
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
        this.consume(TokenType.COLON, "Expected ':' after 'тип'");
        const typeToken = this.advance();
        if (typeToken.type === TokenType.INITIAL) {
          nodeType = 'начальный';
        } else if (typeToken.type === TokenType.ACTION) {
          nodeType = 'действие';
        } else if (typeToken.type === TokenType.ENDING) {
          nodeType = 'концовка';
        } else {
          throw new Error(`Invalid node type: ${typeToken.value} at ${typeToken.line}:${typeToken.column}`);
        }
        this.consume(TokenType.SEMICOLON, "Expected ';' after node type");
      } else if (this.match(TokenType.DESCRIPTION)) {
        this.consume(TokenType.COLON, "Expected ':' after 'описание'");
        description = this.consume(TokenType.STRING, "Expected description string").value;
        this.consume(TokenType.SEMICOLON, "Expected ';' after description");
      } else if (this.match(TokenType.TRANSITIONS)) {
        this.consume(TokenType.COLON, "Expected ':' after 'переходы'");
        this.parseTransitions(transitions);
      } else if (this.match(TokenType.OPTIONS)) {
        this.consume(TokenType.COLON, "Expected ':' after 'варианты'");
        this.parseOptions(options);
      } else if (this.match(TokenType.TITLE)) {
        this.consume(TokenType.COLON, "Expected ':' after 'название'");
        title = this.consume(TokenType.STRING, "Expected title string").value;
        this.consume(TokenType.SEMICOLON, "Expected ';' after title");
      } else {
        throw new Error(`Unexpected token in node definition: ${this.peek().type} at ${this.peek().line}:${this.peek().column}`);
      }
    }

    // Create appropriate node type
    const baseNode = {
      id,
      nodeType,
      description,
      line: startToken.line,
      column: startToken.column
    };

    switch (nodeType) {
      case 'начальный':
        return {
          ...baseNode,
          type: 'InitialNode',
          transitions
        } as InitialNode;
      case 'действие':
        return {
          ...baseNode,
          type: 'ActionNode',
          options
        } as ActionNode;
      case 'концовка':
        return {
          ...baseNode,
          type: 'EndingNode',
          title
        } as EndingNode;
    }
  }

  private parseTransitions(transitions: string[]): void {
    this.consume(TokenType.LEFT_BRACKET, "Expected '[' for transitions");
    
    if (!this.check(TokenType.RIGHT_BRACKET)) {
      do {
        const transition = this.consume(TokenType.IDENTIFIER, "Expected transition identifier").value;
        transitions.push(transition);
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after transitions");
    this.consume(TokenType.SEMICOLON, "Expected ';' after transitions");
  }

  private parseOptions(options: OptionChoice[]): void {
    this.consume(TokenType.LEFT_BRACKET, "Expected '[' for options");
    
    if (!this.check(TokenType.RIGHT_BRACKET)) {
      do {
        const optionToken = this.peek();
        this.consume(TokenType.LEFT_PAREN, "Expected '(' for option");
        const text = this.consume(TokenType.STRING, "Expected option text").value;
        this.consume(TokenType.COMMA, "Expected ',' in option");
        const target = this.consume(TokenType.IDENTIFIER, "Expected target identifier").value;
        this.consume(TokenType.RIGHT_PAREN, "Expected ')' after option");

        options.push({
          type: 'OptionChoice',
          text,
          target,
          line: optionToken.line,
          column: optionToken.column
        });
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after options");
    this.consume(TokenType.SEMICOLON, "Expected ';' after options");
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
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    
    const current = this.peek();
    throw new Error(`${message}. Got ${current.type} at ${current.line}:${current.column}`);
  }
}
