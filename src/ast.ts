/**
 * Token types for QuestLang
 */
export enum TokenType {
  // Literals
  IDENTIFIER = 'IDENTIFIER',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  
  // Keywords
  QUEST = 'квест',
  GOAL = 'цель',
  GRAPH = 'граф',
  NODES = 'узлы',
  START = 'начало',
  END = 'конец',
  TYPE = 'тип',
  DESCRIPTION = 'описание',
  TRANSITIONS = 'переходы',
  OPTIONS = 'варианты',
  TITLE = 'название',
  
  // Node types
  INITIAL = 'начальный',
  ACTION = 'действие',
  ENDING = 'концовка',
  
  // Symbols
  SEMICOLON = ';',
  COLON = ':',
  COMMA = ',',
  DOT = '.',
  LEFT_BRACE = '{',
  RIGHT_BRACE = '}',
  LEFT_BRACKET = '[',
  RIGHT_BRACKET = ']',
  LEFT_PAREN = '(',
  RIGHT_PAREN = ')',
  
  // Special
  EOF = 'EOF',
  NEWLINE = 'NEWLINE',
  COMMENT = 'COMMENT',
  WHITESPACE = 'WHITESPACE'
}

/**
 * Represents a token in the source code
 */
export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  start: number;
  end: number;
}

/**
 * Position in source code
 */
export interface Position {
  line: number;
  column: number;
  offset: number;
}

/**
 * Abstract Syntax Tree node types for QuestLang
 */
export interface ASTNode {
  type: string;
  line: number;
  column: number;
}

/**
 * Root node of the program
 */
export interface QuestProgram extends ASTNode {
  type: 'QuestProgram';
  name: string;
  goal: string;
  graph: GraphNode;
}

/**
 * Graph definition
 */
export interface GraphNode extends ASTNode {
  type: 'Graph';
  nodes: Record<string, NodeDefinition>;
  start: string;
}

/**
 * Base node definition
 */
export interface NodeDefinition extends ASTNode {
  nodeType: 'начальный' | 'действие' | 'концовка';
  id: string;
  description: string;
}

/**
 * Initial node
 */
export interface InitialNode extends NodeDefinition {
  nodeType: 'начальный';
  transitions: string[];
}

/**
 * Action node
 */
export interface ActionNode extends NodeDefinition {
  nodeType: 'действие';
  options: OptionChoice[];
}

/**
 * Ending node
 */
export interface EndingNode extends NodeDefinition {
  nodeType: 'концовка';
  title: string;
}

/**
 * Option choice in action nodes
 */
export interface OptionChoice extends ASTNode {
  type: 'OptionChoice';
  text: string;
  target: string;
}

/**
 * String literal
 */
export interface StringLiteral extends ASTNode {
  type: 'StringLiteral';
  value: string;
}

/**
 * Identifier
 */
export interface Identifier extends ASTNode {
  type: 'Identifier';
  name: string;
}
