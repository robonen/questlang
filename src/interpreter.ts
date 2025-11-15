import type {
  ActionNode,
  EndingNode,
  InitialNode,
  NodeDefinition,
  OptionChoice,
  QuestProgram,
} from './ast';
import { ModuleLoader } from './module-loader';
import type { ModuleHost } from './module-loader';

/**
 * Runtime state of the quest
 */
export interface QuestState {
  currentNode: string;
  history: string[];
  isComplete: boolean;
  endingTitle?: string;
}

/**
 * Result of executing a choice
 */
export interface ExecutionResult {
  success: boolean;
  newState: QuestState;
  error?: string;
}

/**
 * Visitor interface for quest nodes
 */
export interface QuestVisitor {
  visitInitialNode: (node: InitialNode, state: QuestState) => void;
  visitActionNode: (node: ActionNode, state: QuestState) => void;
  visitEndingNode: (node: EndingNode, state: QuestState) => void;
}

/**
 * Interpreter for QuestLang programs
 */
export class QuestInterpreter {
  private program: QuestProgram;
  private currentState: QuestState;
  private moduleLoader?: ModuleLoader;

  constructor(program: QuestProgram, questFilePath?: string, host?: ModuleHost) {
    this.program = program;
    this.currentState = {
      currentNode: program.graph.start,
      history: [],
      isComplete: false,
    };

    // Initialize module loader if imports present and quest file path provided
    if (questFilePath && host && program.imports && program.imports.length > 0) {
      this.moduleLoader = new ModuleLoader(host);
      // Load modules
      this.moduleLoader.loadQuest(questFilePath);
    }
  }

  /**
   * Get the current quest state
   */
  public getState(): QuestState {
    return { ...this.currentState };
  }

  /**
   * Get quest information
   */
  public getQuestInfo(): { name: string; goal: string; isComplete: boolean } {
    return {
      name: this.program.name,
      goal: this.program.goal,
      isComplete: this.currentState.isComplete,
    };
  }

  /**
   * Get the quest program
   */
  public getProgram(): QuestProgram {
    return this.program;
  }

  /**
   * Get current node information
   */
  public getCurrentNode(): NodeDefinition | null {
    const nodeId = this.currentState.currentNode;
    return this.resolveNode(nodeId);
  }

  /**
   * Get available choices for current action node
   */
  public getAvailableChoices(): OptionChoice[] {
    const currentNode = this.getCurrentNode();
    if (!currentNode || currentNode.nodeType !== 'действие') {
      return [];
    }
    return (currentNode as ActionNode).options;
  }

  /**
   * Execute a choice by index
   */
  public executeChoice(choiceIndex: number): ExecutionResult {
    const currentNode = this.getCurrentNode();

    if (!currentNode) {
      return {
        success: false,
        newState: this.currentState,
        error: `Current node '${this.currentState.currentNode}' not found`,
      };
    }

    if (currentNode.nodeType !== 'действие') {
      return {
        success: false,
        newState: this.currentState,
        error: `Cannot execute choice on node type '${currentNode.nodeType}'`,
      };
    }

    const actionNode = currentNode as ActionNode;
    const choices = actionNode.options;

    if (choiceIndex < 0 || choiceIndex >= choices.length) {
      return {
        success: false,
        newState: this.currentState,
        error: `Invalid choice index: ${choiceIndex}. Available choices: 0-${choices.length - 1}`,
      };
    }

    const choice = choices[choiceIndex];
    if (!choice) {
      return {
        success: false,
        newState: this.currentState,
        error: `Choice at index ${choiceIndex} is undefined`,
      };
    }
    return this.moveToNode(choice.target);
  }

  /**
   * Move to a specific node
   */
  public moveToNode(nodeId: string): ExecutionResult {
    const targetNode = this.resolveNode(nodeId);

    if (!targetNode) {
      return {
        success: false,
        newState: this.currentState,
        error: `Target node '${nodeId}' not found`,
      };
    }

    // Update state
    const newState: QuestState = {
      currentNode: nodeId,
      history: [...this.currentState.history, this.currentState.currentNode],
      isComplete: targetNode.nodeType === 'концовка',
      endingTitle: targetNode.nodeType === 'концовка' ? (targetNode as EndingNode).title : undefined,
    };

    this.currentState = newState;

    return {
      success: true,
      newState: { ...newState },
    };
  }

  /**
   * Reset quest to initial state
   */
  public reset(): void {
    this.currentState = {
      currentNode: this.program.graph.start,
      history: [],
      isComplete: false,
    };
  }

  /**
   * Get all possible paths from current state (for debugging/analysis)
   */
  public getAllPaths(): string[][] {
    const paths: string[][] = [];
    const visited = new Set<string>();

    this.findPaths(this.currentState.currentNode, [this.currentState.currentNode], paths, visited);

    return paths;
  }

  private findPaths(nodeId: string, currentPath: string[], allPaths: string[][], visited: Set<string>): void {
    const node = this.resolveNode(nodeId);

    if (!node || visited.has(nodeId)) {
      return;
    }

    if (node.nodeType === 'концовка') {
      allPaths.push([...currentPath]);
      return;
    }

    visited.add(nodeId);

    if (node.nodeType === 'действие') {
      const actionNode = node as ActionNode;
      for (const option of actionNode.options) {
        this.findPaths(option.target, [...currentPath, option.target], allPaths, new Set(visited));
      }
    }
    else if (node.nodeType === 'начальный') {
      const initialNode = node as InitialNode;
      for (const transition of initialNode.transitions) {
        this.findPaths(transition, [...currentPath, transition], allPaths, new Set(visited));
      }
    }
  }

  /**
   * Validate the quest graph for consistency
   */
  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const nodeIds = Object.keys(this.program.graph.nodes);

    // Check if start node exists
    if (!this.resolveNode(this.program.graph.start)) {
      errors.push(`Start node '${this.program.graph.start}' does not exist`);
    }

    // Check all node references
    for (const [nodeId, node] of Object.entries(this.program.graph.nodes)) {
      if (node.nodeType === 'действие') {
        const actionNode = node as ActionNode;
        for (const option of actionNode.options) {
          if (!this.resolveNode(option.target)) {
            if (option.target.startsWith('@') && this.moduleLoader) {
              const ref = option.target.slice(1);
              const dot = ref.indexOf('.');
              const modName = dot >= 0 ? ref.slice(0, dot) : ref;
              const nid = dot >= 0 ? ref.slice(dot + 1) : '';
              const check = dot >= 0 ? this.moduleLoader.resolveExport(modName, nid) : { ok: false, error: `Invalid module reference '${option.target}'` } as const;
              errors.push(check.ok ? `Node '${nodeId}' references non-existent target '${option.target}'` : check.error);
            }
            else {
              errors.push(`Node '${nodeId}' references non-existent target '${option.target}'`);
            }
          }
        }
      }
      else if (node.nodeType === 'начальный') {
        const initialNode = node as InitialNode;
        for (const transition of initialNode.transitions) {
          if (!this.resolveNode(transition)) {
            if (transition.startsWith('@') && this.moduleLoader) {
              const ref = transition.slice(1);
              const dot = ref.indexOf('.');
              const modName = dot >= 0 ? ref.slice(0, dot) : ref;
              const nid = dot >= 0 ? ref.slice(dot + 1) : '';
              const check = dot >= 0 ? this.moduleLoader.resolveExport(modName, nid) : { ok: false, error: `Invalid module reference '${transition}'` } as const;
              errors.push(check.ok ? `Initial node '${nodeId}' references non-existent transition '${transition}'` : check.error);
            }
            else {
              errors.push(`Initial node '${nodeId}' references non-existent transition '${transition}'`);
            }
          }
        }
      }
    }

    // Check for unreachable nodes
    const reachable = new Set<string>();
    this.findReachableNodes(this.program.graph.start, reachable);

    for (const nodeId of nodeIds) {
      if (!reachable.has(nodeId)) {
        errors.push(`Node '${nodeId}' is unreachable`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private findReachableNodes(nodeId: string, reachable: Set<string>): void {
    if (reachable.has(nodeId))
      return;

    const node = this.resolveNode(nodeId);
    if (!node)
      return;

    reachable.add(nodeId);

    if (node.nodeType === 'действие') {
      const actionNode = node as ActionNode;
      for (const option of actionNode.options) {
        this.findReachableNodes(option.target, reachable);
      }
    }
    else if (node.nodeType === 'начальный') {
      const initialNode = node as InitialNode;
      for (const transition of initialNode.transitions) {
        this.findReachableNodes(transition, reachable);
      }
    }
  }

  /**
   * Resolve either local node id or module-qualified reference '@Module.node'
   */
  private resolveNode(id: string): NodeDefinition | null {
    // Module-qualified
    if (id.startsWith('@')) {
      const ref = id.slice(1);
      const dot = ref.indexOf('.');
      if (dot === -1)
        return null;
      const moduleName = ref.slice(0, dot);
      const nodeId = ref.slice(dot + 1);

      if (!this.moduleLoader)
        return null;
      const check = this.moduleLoader.resolveExport(moduleName, nodeId);
      if (!check.ok)
        return null;
      const mod = this.moduleLoader.getModuleByName(moduleName);
      if (!mod)
        return null;
      return mod.ast.nodes[nodeId] || null;
    }

    // Local
    return this.program.graph.nodes[id] || null;
  }
}
