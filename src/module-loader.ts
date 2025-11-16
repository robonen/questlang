import type { ImportNode, ModuleNode, QuestProgram } from './ast';
import { Lexer } from './lexer';
import { Parser } from './parser';

export interface ModuleHost {
  readFile: (file: string) => string;
  resolve: (fromFile: string, specifier: string) => string;
}

export enum VisitState {
  Unvisited,
  Visiting,
  Visited,
}

export interface LoadedModule {
  name: string;
  file: string;
  ast: ModuleNode;
}

/**
 * Cycle-tolerant module loader: parse first, link/validate later.
 */
export class ModuleLoader {
  private byFile = new Map<string, LoadedModule>();
  private visit = new Map<string, VisitState>();

  constructor(private host: ModuleHost) {}

  public loadQuest(questFile: string): { program: QuestProgram; modules: LoadedModule[] } {
    const source = this.host.readFile(questFile);
    const program = this.parseQuest(source);

    // Parse imports (if any)
    const imports: ImportNode[] = program.imports || [];

    for (const imp of imports) {
      const abs = this.host.resolve(questFile, imp.modulePath);
      this.dfsParse(abs);
    }

    return { program, modules: [...this.byFile.values()] };
  }

  private dfsParse(file: string): void {
    const state = this.visit.get(file) ?? VisitState.Unvisited;
    if (state === VisitState.Visited)
      return;
    if (state === VisitState.Visiting) {
      // cycle detected — allowed, just return
      return;
    }

    this.visit.set(file, VisitState.Visiting);

    if (!this.byFile.has(file)) {
      const src = this.host.readFile(file);
      const ast = this.parseModule(src, file);
      this.byFile.set(file, { name: ast.name, file, ast });

      // Follow module's own imports (if any)
      const ownImports = ast.imports || [];
      for (const imp of ownImports) {
        const dep = this.host.resolve(file, imp.modulePath);
        this.dfsParse(dep);
      }
    }

    this.visit.set(file, VisitState.Visited);
  }

  private parseQuest(src: string): QuestProgram {
    const lexer = new Lexer(src);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    return ast;
  }

  private parseModule(src: string, file: string): ModuleNode {
    const lexer = new Lexer(src);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const any = parser.parseAny();
    if ((any as any).type !== 'Module') {
      throw new Error(`Expected module in ${file}`);
    }
    return any as ModuleNode;
  }

  /** Resolve an exported node existence */
  public resolveExport(moduleName: string, nodeId: string): { ok: true } | { ok: false; error: string } {
    for (const mod of this.byFile.values()) {
      if (mod.ast.name === moduleName) {
        if (!mod.ast.nodes[nodeId]) {
          return { ok: false, error: `Module '${moduleName}' has no node '${nodeId}'` };
        }
        if (!mod.ast.exports.includes(nodeId)) {
          return { ok: false, error: `Node '${nodeId}' is not exported by module '${moduleName}'` };
        }
        return { ok: true };
      }
    }
    return { ok: false, error: `Module '${moduleName}' not found` };
  }

  public getModuleByName(name: string): LoadedModule | undefined {
    for (const mod of this.byFile.values()) {
      if (mod.ast.name === name)
        return mod;
    }
    return undefined;
  }

  public getAllModules(): LoadedModule[] {
    return [...this.byFile.values()];
  }

  /** Validate module-level invariants (exports exist, etc.) */
  public validateModules(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    for (const mod of this.byFile.values()) {
      for (const exp of mod.ast.exports) {
        if (!mod.ast.nodes[exp]) {
          errors.push(`Module ${mod.ast.name}: exported node '${exp}' does not exist`);
        }
      }
    }
    return { isValid: errors.length === 0, errors };
  }
}
