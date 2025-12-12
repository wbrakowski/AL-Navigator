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

#### 4. Launch.json Management (`src/json/`)
- **`launchjson_updater.ts`**: Handles startup object selection and launch.json updates
- **`quickLaunchStatusBar.ts`**: Status bar showing current startup object (🚀 icon)
- **Key Pattern**: Uses `jsonc-parser` for JSON with comments, preserves formatting
- **Important**: Supports multiple launch.json files and configurations in multi-workspace setups

#### 5. Translation Features (`src/translation/`, `src/xlf/`)
- Integrates with Microsoft's Base App translations
- Hover provider shows field translations (enable via `alNavigator.enableHoverProviders`)
- XLIFF file manipulation for multi-language support

#### 6. External Dependencies
- **AZ AL Dev Tools/AL Code Outline**: Required extension (`andrzejzwierzchowski.al-code-outline`)
- Accessed via `ALCodeOutlineExtension.getInstance()` for symbol information and ID suggestions

## Critical Development Patterns

### Custom .alpackages Folder Support
**ALWAYS use `getAlPackagesFolder()` from `src/files/folderHelper.ts`** instead of hardcoded `.alpackages` paths:

```typescript
import { getAlPackagesFolder } from '../files/folderHelper';

const alpackagesFolderPath = getAlPackagesFolder(workspacePath);
if (!alpackagesFolderPath) {
    // Handle error - folder not found
    return;
}
// Use alpackagesFolderPath for .app file operations
```

**Why?** Users can configure custom package cache paths via `al.packageCachePath` in settings.json:
- Shared network locations: `"C:\\SharedPackages\\BC"`
- Relative paths: `"./.alternativePackages"`
- Multiple fallback paths: The first existing path is used

**Example in `launchjson_updater.ts` (lines 794-818)**: Shows proper error handling and logging when accessing .alpackages.

### Logging Best Practice
All user-facing operations should log to the AL Navigator output channel:

```typescript
import { CustomConsole } from '../additional/console';

// Log important operations
CustomConsole.customConsole.appendLine(`[AL Navigator] Operation description: ${details}`);
```

**Pattern**: Use descriptive prefixes like `[AL Navigator]` and include relevant paths/values. See `folderHelper.ts` `getAlPackagesFolder()` for comprehensive logging example.

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

### Working with .app Files
.app files are ZIP files with a custom header. Always use this pattern (from `fileHelper.ts`):

```typescript
import * as AdmZip from 'adm-zip';

// Remove header to make it a valid ZIP
await removeHeaderFromAppFile(appFilePath, cleanedAppFilePath);
const zip = new AdmZip(cleanedAppFilePath);
// Process entries...
// Clean up temp file when done
```

### Report Layout Resolution
Reports can have multiple layouts (RDL/RDLC). Use `RdlcFileLocator.parseALFileForRDLCLayouts()` which:
- Supports legacy `RDLCLayout` property
- Supports modern `rendering` layouts with `LayoutFile` paths
- Resolves relative, absolute, and workspace-relative paths
- See `src/al/report/rdlcFileLocator.ts` for implementation

### Configuration Settings
- **AL Navigator settings**: Prefix `alNavigator.*`
  - Key settings: `ignoreALPrefix`, `ignoreALSuffix`, `translationTargetLanguage`
  - Launch.json automation: `updateAllLaunchJsons`, `updateAllLaunchConfigurations`
- **AL Language settings**: Accessed via `vscode.workspace.getConfiguration('al')`
  - `al.packageCachePath`: Custom .alpackages locations

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
- **Important**: After code changes, must recompile AND reload extension (Ctrl+R in debug window)

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
   - **ALWAYS include the GitHub issue number** with a hashtag (e.g., `#172`, `#45`)
   - Example:
     ```markdown
     ### **[0.8.6]**
     - **Fixed:** Custom .alpackages folder path support #172
     - **Enhancement:** Comprehensive logging for .alpackages folder detection #172
     ```

2. **Increment Version in `package.json`**:
   - Bump version number (e.g., `0.8.5` → `0.8.6`)
   - Use semantic versioning:
     - Patch (0.8.5 → 0.8.6): Bug fixes, minor improvements
     - Minor (0.8.5 → 0.9.0): New features, backwards compatible
     - Major (0.8.5 → 1.0.0): Breaking changes

3. **Update `README.md`**:
   - For new features: Add a "🔥 New:" section at the top of the Features section
   - Include description, workflow example, and key benefits
   - Update the "📜 Full Functionality List" table with the new command
   - Update Settings section if new configuration options are added
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
- **Pattern**: Always provide helpful context in error messages (include paths, configurations to check)

### RDL/RDLC File Processing
- XML-based report layouts require careful regex patterns
- **Always preserve barcode fonts** (patterns in `ReportFontFixer.BARCODE_FONT_PATTERNS`)
- Use `<FontFamily>` tag matching for font replacements

### AL Syntax Patterns
- Variables: Use `ALVarHelper` for type detection
- Objects: Use `ALCodeOutlineExtension` API for symbol information
- Naming conventions: Follow Microsoft's AL guidelines (TempPrefix for temporary records)
- Variable ordering: Complex types first (Record, Report, Codeunit), then simple types

### Code Comments
- **ALWAYS write code comments in English**
- Use clear, concise language
- Document complex logic and business rules
- Avoid obvious comments that just repeat the code

## Common Tasks

### Adding a Report Feature
1. Create class in `src/al/report/` or `src/report/`
2. Import in `extension.ts`
3. Register command with file type check (`.rdl`/`.rdlc`)
4. Use `getAlPackagesFolder()` for .app file access
5. Test with actual report layouts from workspace

### Working with .alpackages
1. **Never hardcode** `path.join(workspace, '.alpackages')`
2. Always use `getAlPackagesFolder(workspace)` from `folderHelper.ts`
3. Check for `undefined` return (folder may not exist or custom path may be wrong)
4. Log the resolved path for debugging: `CustomConsole.customConsole.appendLine(...)`
5. Provide helpful error messages mentioning `al.packageCachePath` configuration

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
- CustomConsole is initialized in `extension.ts` line 20 - safe to use after activation

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

### Code Comments
- **ALWAYS write code comments in English**
- Use clear, concise language
- Document complex logic and business rules
- Avoid obvious comments that just repeat the code

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
