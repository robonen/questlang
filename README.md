# QuestLang Interpreter

A modern TypeScript interpreter for the QuestLang programming language - a domain-specific language for creating interactive text-based quests and adventures.

## Features

- 🚀 **Modern TypeScript**: Built with latest TypeScript features and ES modules
- 📦 **Modular Architecture**: Clean separation between lexer, parser, AST, and interpreter
- 🧪 **Comprehensive Testing**: Full test coverage with Vitest
- 🔍 **Validation & Analysis**: Built-in quest validation and structural analysis
- 🎮 **Interactive CLI**: Command-line interface for playing and analyzing quests
- 📊 **Graph-based**: Declarative graph representation of quest flow

## Installation

```bash
npm install questlang
```

Or for development:

```bash
git clone <repo-url>
cd questlang
npm install
```

## Usage

### Command Line Interface

QuestLang comes with two CLI variants:

#### Standard CLI
```bash
# Play a quest
questlang play quest.ql

# Validate quest syntax and structure
questlang validate quest.ql

# Analyze quest structure and show statistics
questlang analyze quest.ql
```

### Programmatic API

```typescript
import { QuestLang } from 'questlang';

// Parse quest source code
const ast = QuestLang.parse(sourceCode);

// Create interpreter
const interpreter = QuestLang.interpret(sourceCode);

// Get quest information
const questInfo = interpreter.getQuestInfo();
console.log(`Playing: ${questInfo.name}`);

// Navigate through the quest
const currentNode = interpreter.getCurrentNode();
const choices = interpreter.getAvailableChoices();

// Execute player choice
const result = interpreter.executeChoice(0);

// Validate quest
const validation = QuestLang.validate(sourceCode);
if (!validation.isValid) {
  console.error('Quest has errors:', validation.errors);
}
```

## QuestLang Syntax

QuestLang uses a declarative graph-based syntax for defining interactive quests:

```questlang
квест MyQuest;
цель "Find the treasure in the ancient castle";

граф {
  узлы {
    старт: {
      тип: начальный;
      описание: "You stand before an ancient castle";
      переходы: [entrance];
    }

    entrance: {
      тип: действие;
      описание: "There are two doors. Which do you choose?";
      варианты: [
        ("Enter the left door", left_room),
        ("Enter the right door", right_room)
      ];
    }

    left_room: {
      тип: концовка;
      название: "Victory!";
      описание: "You found the treasure!";
    }

    right_room: {
      тип: концовка;
      название: "Defeat";
      описание: "You fell into a trap";
    }
  }

  начало: старт;
}
конец;
```

### Language Elements

- **квест** - Quest declaration with name
- **цель** - Quest goal/description
- **граф** - Graph definition containing all nodes
- **узлы** - Node definitions section
- **начало** - Starting node reference

### Node Types

- **начальный** - Initial node (entry point)
- **действие** - Action node with player choices
- **концовка** - Ending node (quest completion)

### Node Properties

- **тип** - Node type
- **описание** - Node description shown to player
- **варианты** - Available choices (action nodes only)
- **переходы** - Direct transitions (initial nodes only)
- **название** - Ending title (ending nodes only)

## Architecture

The interpreter follows best practices for language implementation:

### 1. Lexical Analysis (Lexer)
- Tokenizes source code into meaningful tokens
- Handles Russian keywords and identifiers
- Provides detailed position information for error reporting

### 2. Syntax Analysis (Parser)
- Builds Abstract Syntax Tree (AST) from tokens
- Implements recursive descent parsing
- Comprehensive error handling with meaningful messages

### 3. Semantic Analysis & Interpretation
- Validates quest graph structure
- Detects unreachable nodes and broken references
- Runtime quest execution and state management

### 4. CLI & Tools
- Interactive quest player
- Validation and analysis tools
- Development utilities

## Project Structure

```
src/
├── types.ts          # Token and type definitions
├── lexer.ts          # Lexical analyzer
├── ast.ts            # Abstract Syntax Tree definitions
├── parser.ts         # Syntax parser
├── interpreter.ts    # Quest interpreter and runtime
├── index.ts          # Main API exports
├── cli.ts            # Command-line interface
└── __tests__/        # Test suites
    ├── lexer.test.ts
    ├── parser.test.ts
    ├── interpreter.test.ts
    └── integration.test.ts
```

## License

MIT License - see LICENSE file for details

## Language Design Goals

QuestLang was designed with the following principles:

- **Declarative**: Describe what the quest is, not how to execute it
- **Graph-based**: Natural representation for branching narratives
- **Readable**: Clear syntax that non-programmers can understand
- **Validatable**: Built-in validation to catch structural issues
- **Extensible**: Architecture allows for easy feature additions

## Future Roadmap

- [ ] Visual quest graph editor
- [ ] Quest debugging tools
- [ ] Export to other formats (Ink, Twine)
- [ ] Advanced scripting features
- [ ] Multiplayer quest support
- [ ] Web-based quest player
