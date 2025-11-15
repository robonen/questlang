# QuestLang Syntax Highlighting

VS Code extension for syntax highlighting of QuestLang - a specialized language for creating interactive text quests.

## Features

- ✨ **Syntax highlighting** for `.ql` files
- 🔤 **Support for Russian keywords**
- 💬 **Comment highlighting** (`//`)
- 🎨 **Color highlighting for strings and numbers**
- 🔧 **Automatic bracket closing**
- 📐 **Automatic indentation**
- 📦 **Modules and imports** (`модуль`, `импорт`, `экспорт`, `из`)
- 🧭 **Cross-module references** `@Модуль.узел`

## Supported Language Elements

### Keywords
- `квест`, `цель`, `граф`, `узлы`, `начало`, `конец`
- `модуль`, `импорт`, `экспорт`, `из`
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
модуль Локации;
узлы {
    лес: { тип: концовка; название: "Лес"; описание: "Вы в лесу"; }
}
экспорт [лес];

квест МойКвест;
цель "Описание цели квеста";

импорт Локации из "./locations.ql";

граф {
    узлы {
        старт: {
            тип: начальный;
            описание: "Начало приключения";
            переходы: [выбор];
        }

        выбор: {
            тип: действие;
            описание: "Что вы будете делать?";
            варианты: [
                ("Идти в лес", @Локации.лес)
            ];
        }
    }

    начало: старт;
}

конец;
```

## Usage

After installing the extension, all files with `.ql` extension will be automatically recognized as QuestLang files with syntax highlighting.

## License

MIT
