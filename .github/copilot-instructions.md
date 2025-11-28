# AL Navigator - AI Coding Agent Instructions

## Project Overview
AL Navigator is a VS Code extension for Microsoft Dynamics 365 Business Central AL development. It provides intelligent variable creation, report management, translation features, and navigation shortcuts for AL files.

## Architecture

### Extension Structure
- **Entry Point**: `src/extension.ts` - Contains `activate()` function that registers all commands and providers
- **Command Registration Pattern**: Commands are registered in two places:
  1. In `package.json` under `contributes.commands` (defines UI labels and command IDs)
  2. In `extension.ts` via `context.subscriptions.push(commands.registerCommand(...))` (implements functionality)

### Key Components

#### 1. AL File Management (`src/al/`)
- **`ALFiles`**: Central file manager with file watchers for `.al` and `.app` files
- **`ALFile`**: Represents individual AL files with object metadata
- **`ALObject`**: Parsed AL object structure (Tables, Pages, Reports, etc.)
- **`ALVariable`**: Variable declarations with type information

#### 2. Code Actions Provider (`src/al/codeActions/`)
- **Pattern**: Implements `vscode.CodeActionProvider` interface for quick fixes
- **Key Class**: `ALCodeActionsProvider` provides "Add variable" suggestions for AL0118 errors
- **Command Types**: Uses `CommandType` enum (LocalVariable, GlobalVariable, Parameter)
- **Integration**: Registered in `extension.ts` with `vscode.languages.registerCodeActionsProvider()`

#### 3. Report Management (`src/al/report/`)
- **`ReportCreator`**: Copies reports with layouts (RDLC/Word)
- **`ReportRenameProvider`**: Synchronizes variable renames between AL and RDLC files
- **`ReportFontFixer`**: Replaces non-Segoe UI fonts in RDL/RDLC files (protects barcode fonts)
- **`variableSync`**: Coordinates AL ↔ RDLC file synchronization

#### 4. Translation Features (`src/translation/`, `src/xlf/`)
- Integrates with Microsoft's Base App translations
- Hover provider shows field translations (enable via `alNavigator.enableHoverProviders`)
- XLIFF file manipulation for multi-language support

#### 5. External Dependencies
- **AZ AL Dev Tools/AL Code Outline**: Required extension (`andrzejzwierzchowski.al-code-outline`)
- Accessed via `ALCodeOutlineExtension.getInstance()` for symbol information and ID suggestions

## Development Patterns

### Adding New Commands
1. Add command to `package.json`:
   ```json
   {
     "command": "extension.yourCommandName",
     "title": "AL Navigator: Your Command Title"
   }
   ```
2. Register in `extension.ts` `commandsToRegister` array:
   ```typescript
   { command: "extension.yourCommandName", callback: yourCallbackFunction }
   ```
3. For file-specific commands, check file extension before executing

### Working with AL Files
- Access via `ALFiles` singleton pattern
- File watchers automatically update cache on `.al` file changes
- Use `ALFileCrawler` for parsing AL syntax

### Configuration Settings
- Prefix: `alNavigator.*`
- Key settings: `ignoreALPrefix`, `ignoreALSuffix`, `translationTargetLanguage`
- Access via `vscode.workspace.getConfiguration('alNavigator')`

## Build & Test

### Build
```powershell
npm run compile  # or use the default build task (Ctrl+Shift+B)
```

### Watch Mode
```powershell
npm run watch  # Runs TypeScript compiler in watch mode
```

### Testing
- Launch "Extension" configuration from Run and Debug (F5)
- Opens new VS Code window with extension loaded
- Test in workspace containing AL files

### Packaging
```powershell
vsce package  # Creates .vsix file
```

## Release Process

### **CRITICAL: Always Update Before Committing Changes**

When making ANY changes to the extension:

1. **Update `CHANGELOG.md`**:
   - Add new entry at the top under a new version heading
   - Follow format: `### **[X.Y.Z]**`
   - Describe changes clearly (use "New Feature:", "Fixed:", "Enhancement:" prefixes)
   - Example:
     ```markdown
     ### **[0.7.4]**
     - **New Feature:** Replace report font families with Segoe UI
     - Fixed issue with font detection in barcode fonts
     ```

2. **Increment Version in `package.json`**:
   - Bump version number (e.g., `0.7.3` → `0.7.4`)
   - Use semantic versioning:
     - Patch (0.7.3 → 0.7.4): Bug fixes, minor improvements
     - Minor (0.7.3 → 0.8.0): New features, backwards compatible
     - Major (0.7.3 → 1.0.0): Breaking changes

3. **Update `README.md`**:
   - For new features: Add a "🔥 New:" section at the top of the Features section
   - Include description, workflow example, and key benefits
   - Update the "📜 Full Functionality List" table with the new command
   - Use clear, user-friendly language

4. **Commit Order**:
   - Update CHANGELOG.md first
   - Update package.json version second
   - Update README.md third
   - Commit all changes together

**❗ Never commit code changes without updating CHANGELOG.md, package.json version, AND README.md!**

## Critical Conventions

### File Naming
- TypeScript files use camelCase (e.g., `reportFontFixer.ts`)
- Classes use PascalCase matching filename (e.g., `ReportFontFixer`)

### Error Handling
- User-facing errors: `vscode.window.showErrorMessage()`
- Info messages: `vscode.window.showInformationMessage()`
- Warnings: `vscode.window.showWarningMessage()`
- Console logging via `CustomConsole.customConsole` output channel

### RDL/RDLC File Processing
- XML-based report layouts require careful regex patterns
- **Always preserve barcode fonts** (patterns in `ReportFontFixer.BARCODE_FONT_PATTERNS`)
- Use `<FontFamily>` tag matching for font replacements

### AL Syntax Patterns
- Variables: Use `ALVarHelper` for type detection
- Objects: Use `ALCodeOutlineExtension` API for symbol information
- Naming conventions: Follow Microsoft's AL guidelines (TempPrefix for temporary records)

## Common Tasks

### Adding a Report Feature
1. Create class in `src/al/report/` or `src/report/`
2. Import in `extension.ts`
3. Register command with file type check (`.rdl`/`.rdlc`)
4. Test with actual report layouts from workspace

### Adding Translation Support
1. Add language to `translationTargetLanguage` enum in `package.json`
2. Update translation service mapping
3. Ensure Base App translation files are accessible

### Working with Providers
- **CodeActionProvider**: For lightbulb quick fixes
- **HoverProvider**: For translation tooltips
- **RenameProvider**: For cross-file refactoring
- All registered via `context.subscriptions.push()` in `activate()`

## Notes
- Extension activates only when AL language is detected (`activationEvents: ["onLanguage:al"]`)
- Minimum VS Code version: 1.83.0
- TypeScript target: ES6 with ES2020 libraries
