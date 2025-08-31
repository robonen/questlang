# QuestLang Syntax Highlighting

VS Code extension for syntax highlighting of QuestLang - a specialized language for creating interactive text quests.

## Features

- ✨ **Syntax highlighting** for `.ql` files
- 🔤 **Support for Russian keywords**
- 💬 **Comment highlighting** (`//`)
- 🎨 **Color highlighting for strings and numbers**
- 🔧 **Automatic bracket closing**
- 📐 **Automatic indentation**

## Supported Language Elements

### Keywords
- `квест`, `цель`, `граф`, `узлы`, `начало`, `конец`
- `тип`, `описание`, `переходы`, `варианты`, `название`
- `начальный`, `действие`, `концовка`

### Syntax Elements
- Strings in double quotes: `"Text"`
- Numbers: `123`, `45.67`
- Comments: `// this is a comment`
- Brackets: `{}`, `[]`, `()`
- Delimiters: `;`, `:`, `,`

## Code Example

```questlang
квест MyQuest;
    цель "Quest objective description";

граф {
    узлы {
        старт: {
            тип: начальный;
            описание: "Beginning of the adventure";
            переходы: [выбор];
        }

        выбор: {
            тип: действие;
            описание: "What will you do?";
            варианты: [
                ("Go right", правый_путь),
                ("Go left", левый_путь)
            ];
        }
    }

    начало: старт;
}

конец;
```

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "QuestLang Syntax Highlighting"
4. Click Install

## Usage

After installing the extension, all files with `.ql` extension will be automatically recognized as QuestLang files with syntax highlighting.

## License

MIT
