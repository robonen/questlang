# QuestLang VS Code Extension - Manual Installation Guide

This guide explains how to manually install the QuestLang syntax highlighting extension without using the VS Code Extensions Marketplace.

## Prerequisites

- Visual Studio Code installed on your system
- Access to the extension files (this directory)

## Installation Methods

### Method 1: Install from VSIX Package

If you have a `.vsix` package file:

1. Open VS Code
2. Open the Command Palette (`Ctrl+Shift+P` on Windows/Linux, `Cmd+Shift+P` on macOS)
3. Type `Extensions: Install from VSIX...` and select it
4. Browse to the `.vsix` file location and select it
5. VS Code will install the extension automatically
6. Restart VS Code if prompted

### Method 2: Copy to Extensions Directory

If you want to install directly from source files:

1. **Find your VS Code extensions directory:**
   - **Windows**: `%USERPROFILE%\.vscode\extensions\`
   - **macOS**: `~/.vscode/extensions/`
   - **Linux**: `~/.vscode/extensions/`

2. **Create the extension directory:**
   ```bash
   mkdir ~/.vscode/extensions/questlang-syntax-highlighting
   ```

3. **Copy extension files:**
   Copy all files from this directory to the newly created extension directory:
   - `package.json`
   - `language-configuration.json`
   - `syntaxes/questlang.tmLanguage.json`
   - Any other configuration files

4. **Restart VS Code** to load the extension

### Method 3: Symbolic Link (Development)

For development purposes, you can create a symbolic link:

1. Navigate to your VS Code extensions directory:
   ```bash
   cd ~/.vscode/extensions/
   ```

2. Create a symbolic link to this extension directory:
   ```bash
   ln -s /path/to/questlang/vscode-extension questlang-syntax-highlighting
   ```

3. Restart VS Code

## Building VSIX Package (Optional)

If you want to create a `.vsix` package for easier distribution:

1. **Install vsce (Visual Studio Code Extension manager):**
   ```bash
   npm install -g vsce
   ```

2. **Navigate to the extension directory:**
   ```bash
   cd /path/to/questlang/vscode-extension
   ```

3. **Package the extension:**
   ```bash
   vsce package
   ```

4. This will create a `.vsix` file that can be installed using Method 1

## Verification

After installation, verify that the extension is working:

1. Open VS Code
2. Create a new file with `.ql` extension (e.g., `test.ql`)
3. Add some QuestLang code:
   ```questlang
   квест TestQuest;
       цель "Test quest";
   
   граф {
       узлы {
           старт: {
               тип: начальный;
               описание: "Test description";
           }
       }
   }
   
   конец;
   ```

4. Check that syntax highlighting is applied (keywords should be colored)

## Troubleshooting

### Extension not loading
- Make sure all files are copied correctly
- Check that `package.json` is valid JSON
- Restart VS Code completely
- Check VS Code's Developer Console (`Help > Toggle Developer Tools`) for errors

### Syntax highlighting not working
- Verify the file has `.ql` extension
- Check that `syntaxes/questlang.tmLanguage.json` exists and is valid
- Ensure the language configuration is correct in `package.json`

### Permission issues
- Make sure you have write permissions to the extensions directory
- On macOS/Linux, you might need to use `sudo` for system-wide installation

## Uninstallation

To remove the manually installed extension:

1. Navigate to your VS Code extensions directory
2. Delete the `questlang-syntax-highlighting` directory (or whatever you named it)
3. Restart VS Code

## Support

If you encounter any issues with manual installation, please check:
- VS Code version compatibility
- File permissions
- Extension file integrity
- VS Code error logs
