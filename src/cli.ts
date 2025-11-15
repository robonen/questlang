#!/usr/bin/env node

import type { QuestInterpreter } from '.';
import type { InitialNode, NodeDefinition } from './ast.js';
import fs from 'node:fs';
import process from 'node:process';
import * as p from '@clack/prompts';
import { QuestLang } from '.';

/**
 * Beautiful command-line interface for QuestLang using clack
 */
class ClackCLI {
  /**
   * Run the CLI
   */
  public async run(): Promise<void> {
    const args = process.argv.slice(2);

    console.clear();

    p.intro('🎮 QuestLang Interpreter');

    if (args.length === 0) {
      await this.showInteractiveMenu();
      return;
    }

    const command = args[0];

    switch (command) {
      case 'play':
        if (args.length < 2) {
          p.outro('❌ Usage: questlang-clack play <file.ql>');
          process.exit(1);
        }
        await this.playQuest(args[1]!);
        break;

      case 'validate':
        if (args.length < 2) {
          p.outro('❌ Usage: questlang-clack validate <file.ql>');
          process.exit(1);
        }
        await this.validateQuest(args[1]!);
        break;

      case 'analyze':
        if (args.length < 2) {
          p.outro('❌ Usage: questlang-clack analyze <file.ql>');
          process.exit(1);
        }
        await this.analyzeQuest(args[1]!);
        break;

      default:
        p.outro(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
  }

  private async showInteractiveMenu(): Promise<void> {
    const questFiles = this.findQuestFiles();

    if (questFiles.length === 0) {
      p.outro('❌ No .ql quest files found in current directory');
      process.exit(1);
    }

    const action = await p.select({
      message: 'What would you like to do?',
      options: [
        { value: 'play', label: '🎮 Play a quest', hint: 'Start an interactive quest game' },
        { value: 'validate', label: '✅ Validate a quest', hint: 'Check quest syntax and structure' },
        { value: 'analyze', label: '📊 Analyze a quest', hint: 'Show detailed quest statistics' },
      ],
    });

    if (p.isCancel(action)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    const file = await p.select({
      message: 'Choose a quest file:',
      options: questFiles.map(file => ({ value: file, label: file })),
    });

    if (p.isCancel(file)) {
      p.cancel('Operation cancelled');
      process.exit(0);
    }

    switch (action) {
      case 'play':
        await this.playQuest(file as string);
        break;
      case 'validate':
        await this.validateQuest(file as string);
        break;
      case 'analyze':
        await this.analyzeQuest(file as string);
        break;
    }
  }

  private findQuestFiles(): string[] {
    try {
      return fs.readdirSync('.')
        .filter(file => file.endsWith('.ql'))
        .sort();
    }
    catch {
      return [];
    }
  }

  private async playQuest(filename: string): Promise<void> {
    const spinner = p.spinner();

    try {
      spinner.start('Loading quest...');

      const source = this.readFile(filename);
      const interpreter = QuestLang.interpret(source, filename);

      // Validate first
      const validation = interpreter.validate();
      if (!validation.isValid) {
        spinner.stop('❌ Quest validation failed');

        p.log.error('Validation errors:');
        validation.errors.forEach(error => p.log.error(`  • ${error}`));
        p.outro('Fix the errors and try again');
        process.exit(1);
      }

      const questInfo = interpreter.getQuestInfo();
      spinner.stop('✅ Quest loaded successfully');

      p.note(`📖 ${questInfo.goal}`, `🎮 ${questInfo.name}`);

      await this.gameLoop(interpreter);
    }
    catch (error) {
      spinner.stop('❌ Error loading quest');
      p.log.error(error instanceof Error ? error.message : String(error));
      p.outro('Failed to start quest');
      process.exit(1);
    }
  }

  private async gameLoop(interpreter: QuestInterpreter): Promise<void> {
    while (!interpreter.getState().isComplete) {
      const currentNode = interpreter.getCurrentNode();

      if (!currentNode) {
        p.log.error('Current node not found');
        break;
      }

      // Show current node description
      p.log.step(currentNode.description);

      if (currentNode.nodeType === 'действие') {
        const choices = interpreter.getAvailableChoices();

        const choice = await p.select({
          message: 'What do you want to do?',
          options: choices.map((choice, index) => ({
            value: index,
            label: choice.text,
          })),
        });

        if (p.isCancel(choice)) {
          p.cancel('Quest cancelled');
          return;
        }

        const result = interpreter.executeChoice(choice as number);

        if (!result.success) {
          p.log.error(`Error: ${result.error}`);
          break;
        }
      }
      else if (currentNode.nodeType === 'начальный') {
        // Auto-advance from initial nodes to first transition
        const initialNode = currentNode as InitialNode;
        if (initialNode.transitions && initialNode.transitions.length > 0) {
          const firstTransition = initialNode.transitions[0];
          if (!firstTransition) {
            p.log.error('First transition is undefined');
            break;
          }
          const result = interpreter.moveToNode(firstTransition);
          if (!result.success) {
            p.log.error(`Error: ${result.error}`);
            break;
          }
        }
        else {
          p.log.error('Initial node has no transitions');
          break;
        }
      }
    }

    // Show ending
    const state = interpreter.getState();
    if (state.isComplete && state.endingTitle) {
      const finalNode = interpreter.getCurrentNode();
      p.note(
        finalNode?.description || 'Quest completed',
        `🏆 ${state.endingTitle}`,
      );

      const playAgain = await p.confirm({
        message: 'Would you like to play again?',
      });

      if (!p.isCancel(playAgain) && playAgain) {
        interpreter.reset();
        await this.gameLoop(interpreter);
      }
      else {
        p.outro('Thanks for playing! 🎉');
      }
    }
  }

  private async validateQuest(filename: string): Promise<void> {
    const spinner = p.spinner();

    try {
      spinner.start('Validating quest...');

      const source = this.readFile(filename);
      const validation = QuestLang.validate(source, filename);

      if (validation.isValid) {
        spinner.stop('✅ Validation completed');
        p.log.success('Quest is valid!');
        p.outro('🎉 No issues found');
      }
      else {
        spinner.stop('❌ Validation failed');

        p.log.error('Validation errors:');
        validation.errors.forEach(error => p.log.error(`  • ${error}`));
        p.outro('Fix the errors and try again');
        process.exit(1);
      }
    }
    catch (error) {
      spinner.stop('❌ Error during validation');
      p.log.error(error instanceof Error ? error.message : String(error));
      p.outro('Validation failed');
      process.exit(1);
    }
  }

  private async analyzeQuest(filename: string): Promise<void> {
    const spinner = p.spinner();

    try {
      spinner.start('Analyzing quest...');

      const source = this.readFile(filename);
      const interpreter = QuestLang.interpret(source, filename);
      const questInfo = interpreter.getQuestInfo();

      spinner.stop('✅ Analysis completed');

      const nodes = Object.values(interpreter.getProgram().graph.nodes) as NodeDefinition[];
      const initialNodes = nodes.filter(n => n.nodeType === 'начальный');
      const actionNodes = nodes.filter(n => n.nodeType === 'действие');
      const endingNodes = nodes.filter(n => n.nodeType === 'концовка');

      p.note(
        `📊 Quest Analysis Results\n\n`
        + `Total nodes: ${nodes.length}\n`
        + `  • Initial nodes: ${initialNodes.length}\n`
        + `  • Action nodes: ${actionNodes.length}\n`
        + `  • Ending nodes: ${endingNodes.length}`,
        `📖 ${questInfo.name}`,
      );

      // Analyze paths
      const paths = interpreter.getAllPaths();

      if (paths.length > 0) {
        const avgPathLength = paths.reduce((sum, path) => sum + path.length, 0) / paths.length;
        const shortestPath = Math.min(...paths.map(path => path.length));
        const longestPath = Math.max(...paths.map(path => path.length));

        p.log.info('📈 Path Analysis:');
        p.log.info(`  • Possible paths: ${paths.length}`);
        p.log.info(`  • Average path length: ${avgPathLength.toFixed(1)} steps`);
        p.log.info(`  • Shortest path: ${shortestPath} steps`);
        p.log.info(`  • Longest path: ${longestPath} steps`);
      }

      // Validation
      const validation = interpreter.validate();

      if (validation.isValid) {
        p.log.success('✅ Quest structure is valid');
        p.outro('🎉 Analysis completed successfully');
      }
      else {
        p.log.warn('⚠️  Quest has validation issues:');
        validation.errors.forEach(error => p.log.warn(`  • ${error}`));
        p.outro('Consider fixing these issues');
      }
    }
    catch (error) {
      spinner.stop('❌ Error during analysis');
      p.log.error(error instanceof Error ? error.message : String(error));
      p.outro('Analysis failed');
      process.exit(1);
    }
  }

  private readFile(filename: string): string {
    if (!fs.existsSync(filename)) {
      throw new Error(`File not found: ${filename}`);
    }

    return fs.readFileSync(filename, 'utf-8');
  }
}

const cli = new ClackCLI();

cli.run().catch((error) => {
  p.log.error(`Unexpected error: ${error}`);
  p.outro('❌ CLI crashed');
  process.exit(1);
});
