# Change Log

All notable changes to the "AL Navigator" extension are documented here.

## Release Notes

### **[0.8.1]**
- **Fixed:** Launch.json updater now only modifies `startupObjectId` and `startupObjectType` properties (removed invalid `startupObjectName` property)
- **Enhancement:** Object names are now stored in extension global state instead of launch.json for better compatibility
- **Enhancement:** Status bar still displays the object name by retrieving it from extension storage
- **Enhancement:** Cleaner launch.json files that adhere to Business Central's official configuration schema

### **[0.8.0]**
- **New Feature:** Report extension folder support - when creating report extensions, the extension now intelligently detects and offers reportextension/reportextensions folders
- **Enhancement:** Improved folder selection for report extensions - prioritizes folders named "reportextension" or "reportextensions" when available
- **Enhancement:** Better support for processing-only reports - reports without layout files (like "Copy Sales Document" report 292) can now be copied successfully
- **Fixed:** Processing-only reports no longer show false "No .AL file found" error message when creating report extensions
- **Enhancement:** Report extension detection - folders with .reportext.al files are now included in folder selection
- **Enhancement:** More accurate error messaging - clearly indicates when neither AL file nor layout files are found

### **[0.7.9]**
- **New Feature:** Analyze and Optimize Report - Unified analyzer that combines font checking, expression validation, and dataset variable analysis
- **New Feature:** Quick Launch Status Bar - Status bar button (🚀) for quick access to startup object switching
- **New Feature:** Recently Used Objects - Track and quickly select from your 10 most recently used startup objects
- **Enhancement:** Single command "Analyze and Optimize Report" works from both AL report files and RDL/RDLC layout files
- **Enhancement:** Smart file detection - automatically finds corresponding AL or RDL files depending on where the command is run
- **Enhancement:** Multi-analysis selection - choose to analyze fonts, expressions, dataset, or all at once
- **Enhancement:** Detailed analysis results shown in dedicated output panel with categorized issues
- **Enhancement:** Auto-fix capabilities with multi-select option - fix fonts, expressions, and/or unused variables in one go
- **Enhancement:** Dataset analysis now shows both unused fields (defined but not used) and missing fields (referenced but not defined)
- **Enhancement:** Launch.json Updater - Added "Current Object" option to directly use the currently open Page or Report as startup object
- **Enhancement:** Quick selection menu now shows up to 4 options: Current Object (if applicable), Recently Used, Popular Objects, and All Objects
- **Enhancement:** Improved user experience for setting startup object with context-aware menu
- **Enhancement:** Report Creator - Automatically opens the created AL file after copying a report or creating a report extension
- **Enhancement:** Better workflow - immediately start editing the new report without manual navigation
- **Enhancement:** Status bar shows current startup object with type, ID, and name (e.g., "🚀 Page 9305: Sales Order List")
- **Enhancement:** Object name is now cached in launch.json for better performance
- **Enhancement:** Recently used objects display time ago (e.g., "5m ago", "2h ago", "3d ago")
- **Enhancement:** Hover translation feature now supports both single quotes (') and double quotes (") for accurate text selection
- **Enhancement:** Improved RDL/RDLC file locator with multi-strategy path resolution for better reliability
- **Enhancement:** Updated Base App Translation SAS token and switched to graceful-fs for better file handling
- **Breaking Change:** Removed individual commands: "Replace report font families with Segoe UI", "Replace irregular RDL expressions", and "Remove unused variables from report dataset" - all functionality now available through the unified "Analyze and Optimize Report" command
- **Breaking Change:** Removed duplicate "Quick Launch Switcher" command - functionality consolidated into "Select Startup Object ID"

### **[0.7.8]**
- **Enhancement:** Optimized report creation workflow - automatically detects which app package contains the report without requiring user selection
- **Enhancement:** Faster report copying with improved user experience and clearer feedback messages
- **New Feature:** Full support for multiple report layouts - automatically copies ALL layout files from rendering section (RDLC, Word, Excel, etc.)
- **Enhancement:** Intelligent layout file naming - preserves meaningful suffixes like "Themable", "Email", "Blue" when copying multiple layouts
- **Enhancement:** Smart folder selection - separate prompts for AL files and layout files when multiple folders are detected
- **Enhancement:** Complete layout reference updates - all RDLCLayout, WordLayout, and LayoutFile properties are updated with correct paths
- **Enhancement:** Backward compatibility maintained - legacy reports without rendering section continue to work as before

### **[0.7.7]**
- **New Feature:** Quick Access to Popular Business Central Objects - Choose from 35 commonly used pages when setting startup object
- **Enhancement:** Quick selection menu with "Popular Objects" and "All Objects" options
- **Enhancement:** Popular objects include Sales (Quotes, Orders, Invoices, Credit Memos), Purchase (Quotes, Orders, Invoices, Credit Memos), Inventory, Finance, and Administration pages

### **[0.7.6]**
- **Enhancement:** Improved launch.json detection - now finds launch.json files in nested folder structures (e.g., AL-Go/Betzold App/.vscode/launch.json)
- **New Feature:** Option to update all launch.json files at once when multiple are found in workspace
- **Enhancement:** User can now select which launch.json file(s) to update when multiple exist
- **Enhancement:** Better feedback messages showing how many files and configurations were updated

### **[0.7.5]**
- **New Feature:** Replace irregular RDL expressions (fixes common errors like `Code.GetData` without parameters, incomplete function calls, missing field names)

### **[0.7.4]**
- **New Feature:** Replace report font families with Segoe UI (automatically fixes non-Segoe UI fonts in RDL/RDLC files while preserving barcode fonts)
- **Enhancement:** Also adds Segoe UI to textboxes without explicit FontFamily definition (which default to Arial)

### **[0.7.3]**
- Fixed Temp recognition not working correctly, fixes issue 156
- Prefilter `startupObjectId` with current object, implements enhancement from issue 152
- Sets startupObjectId in all launch.json configurations, not just the first one

### **[0.7.2]**
- Fixed issue with xlf updater

### **[0.7.1]**
- Added support for custom .alpackages folder paths

### **[0.7.0]**
- Optimized translation on hover functionality by better recognizing words that belong together
- Optimized finding of rdl(c) layout files in reports in the rendering section

### **[0.6.9]**
- Improved XLF updating for comments that contain description AND translation

### **[0.6.8]**
- Minor fixes for xlf updater
- Improved finding of rdlc files for variable renaming/removing
- Do not update rdl(c) files when removing variables, just remove the variable and let user rebuild

### **[0.6.7]**
- Minor fixes for xlf updater

### **[0.6.6]**
- Minor fixes

### **[0.6.5]**
- **New Feature:** AL Navigator: Rename report dataitem column

### **[0.6.4]**
- **New Feature:** Insert translation from comment into xlf
- Fixed the issue that the .zip file still existed after changing the launch.json
- Minor improvements for launch.json updating

### **[0.6.3]**
- **New Feature:** Select `startupObjectId` in `launch.json` using a dropdown list.

### **[0.6.2]**
- **Enhancements:**
  - Automatically create arrays with correct casing.
  - Improved importing of report layouts, supporting namespaces in report files.
- **New Feature:** Remove unused variables from reports.

### **[0.6.1]**
- Fixed an issue where translations for texts containing single apostrophes were not displayed correctly.

### **[0.6.0]**
- Minor fixes related to copying reports.

### **[0.5.9]**
- Added support for copying reports specifically for TSO apps (KatarGo).

### **[0.5.8]**
- Fixed a minor bug when creating a report.

### **[0.5.7]**
- Resolved issues with report creation and variable creation.

### **[0.5.6]**
- Fixed a bug in the report creation process.

### **[0.5.5]**
- Resolved issue with variable creation (#112). Special thanks to dannoe.

### **[0.5.4]**
- **New Functionality:** Translate and copy text to clipboard.

### **[0.5.3]**
- **Enhancements:**
  - Extended the copy report functionality:
    - Automatic ID assignment to new reports.
    - Dialog for selecting report names.

### **[0.5.2]**
- Added the ability to copy reports.

### **[0.5.1]**
- Improved translation functionalities:
  - Faster and more reliable performance.
  - Reactivated hover translations for fields.
- Removed the "Open Microsoft Translation" functionality.

### **[0.5.0]**
- **Bug Fixes:**
  - Improved the detection of correct variable insertion positions.
  - Better handling of objects with identical names (e.g., tables vs. pages).

### **[0.4.9]**
- Fixed display issues for special characters in Microsoft translations.

### **[0.4.8]**
- Added compatibility with AL Language Extension version 8.2.545335.

### **[0.4.7]**
- Improved indentation for created variable sections (#76).

### **[0.4.6]**
- Temporarily disabled hover functionality.

### **[0.4.5]**
- Renamed `disableHoverProviders` to `enableHoverProviders`.

### **[0.4.4]**
- Disabled hover providers by default.

### **[0.4.3]**
- Added Microsoft translations on hover for field names.
- Introduced a new configuration setting: `disableHoverProviders`.

### **[0.4.2]**
- Added search functionality for translations across all products if no Dynamics NAV translation is found.
- Introduced a new setting: `maxNoOfShownTranslations`.

### **[0.4.1]**
- **Bug Fixes:**
  - Fixed loading of enum lists.
  - Resolved issues where the local variable section could not be found for creating new variables.
- Improved performance by loading the object list only on the first variable/parameter creation.

### **[0.4.0]**
- Fixed indentation issues when creating variables using CodeAction.

### **[0.3.9]**
- **New Features:**
  - Open Microsoft translations for target language → English.
  - Show Microsoft translations for target language → English.

### **[0.3.8]**
- Minor bug fixes.

### **[0.3.7]**
- Improved "Add local variable" and "Add parameter" functionalities.
- **New Feature:** Show Microsoft translation.

### **[0.3.6]**
- **New Feature:** Open Microsoft translation.

### **[0.3.5]**
- Prevented "Add local variable" or "Add parameter" from appearing in Request Pages.
- Improved tracking of file name and object name changes.

### **[0.3.4]**
- Minor bug fixes.

### **[0.3.3]**
- Loaded workspace objects on startup instead of during first variable creation.
- Added support for complex variables using recursive functions (e.g., `List of [Dictionary of [Code[50], Decimal]]`).
- Resolved the `ignoreALSuffix` bug.
- **New Feature:** Add parameters.
- Removed irrelevant shortcuts.

### **[0.3.2]**
- Recognized newly downloaded `.alpackages`.

### **[0.3.1]**
- Introduced new configuration settings: `ignoreALPrefix` and `ignoreALSuffix`.
- Improved detection and removal of prefixes/suffixes from variable names.
- Fixed duplicate entries in the object selection list.

### **[0.3.0]**
- Recognized TestPages alongside Pages in object lists.
- Allowed users to replace placeholder variables with suggested variable names.
- **New Shortcut:** Jump through data items starting from the bottom.

### **[0.2.9]**
- Fixed query recognition issues.
- Correctly created arrays.
- Prevented variable creation if the variable type selection is canceled.
- Improved detection of variables with specific naming patterns (e.g., Dates, Dialogs, Booleans).

### **[0.2.8]**
- Fixed naming issues for temporary variables.
- Improved handling of global/local variables followed by parentheses.
- Improved support for dictionary types, including lengths for `Code` and `Text`.

### **[0.2.7]**
- Enhanced detection of temporary records.
- Better recognition of short variable names like `PurchLine`.
- Improved navigation to global variable sections.
- Added the ability to select objects from a list when automatic detection fails.

### **[0.2.6]**
- Automatically jumped to newly created variables without object types.
- Allowed users to select variable types when automatic detection failed.

### **[0.2.5]**
- Added support for creating global variables.
- Resolved issues with variable creation in newly created `.al` files.

### **[0.2.4]**
- Significant improvements to variable creation:
  - Enhanced detection of variables that can or should be created.

### **[0.2.2]**
- Improved DataItem navigation to avoid jumping into `OnPreDataItems`.
- **New Features:**
  - Jump to `OnDeleteTrigger` (Ctrl + Alt + D + D).
  - Jump to `OnModifyTrigger` (Ctrl + Alt + M + M).
  - Jump to `OnInsertTrigger` (Ctrl + Alt + I + I).

### **[0.1.6]**
- Added new extension image.
- Removed "Add Procedure Stub" feature (replaced by a better implementation).
- Introduced new navigation shortcuts:
  - Jump to the last line of global variables (Ctrl + Alt + G).
  - Jump through actions (Ctrl + Alt + A).

### **[0.1.5]**
- Code refactoring.

### **[0.1.4]**
- Enhanced parameter type detection.
- Improved automatic variable declaration:
  - Recognized standard objects and objects from workspace files.

### **[0.1.3]**
- Fixed issues with procedure stub creation.

### **[0.1.2]**
- Added support for creating procedure stubs with return values.
- Added functionality for adding procedure stubs in workspace files not currently open.

### **[0.1.1]**
- Introduced procedure stub creation in the current file.

### **[0.0.2] - [0.1.0]**
- Bug fixes.

### **[0.0.1]**
- Initial release.
