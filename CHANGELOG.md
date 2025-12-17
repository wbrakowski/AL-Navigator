# Change Log

All notable changes to the "AL Navigator" extension are documented here.

## Release Notes

### **[0.9.3]**
- **Cost Optimization:** Reduced telemetry sampling to 10% for both commands and errors - significantly reduces Azure Application Insights data volume and costs while still providing valuable usage insights
- **Breaking Change:** Error tracking now also uses 10% sampling (previously 100%) - multiply reported counts by 10 to estimate actual numbers

### **[0.9.2]**
- **Enhancement:** Enhanced error tracking with detailed context - error reports now include error name, error location (file and line), and Node.js version for faster debugging and better issue resolution
- **Enhancement:** Increased telemetry sampling to 100% - all commands are now tracked (previously 10%) to provide comprehensive usage insights and identify feature adoption patterns

### **[0.9.1]**
- **New Feature:** Anonymous telemetry for usage statistics and error tracking - helps improve the extension by understanding which features are used and identifying bugs faster
- **Privacy:** Telemetry is completely anonymous and contains no personal information, code, or file paths - only command names, execution times, and error reports
- **User Control:** Users can opt-out via `alNavigator.enableTelemetry` setting or VS Code's global `telemetry.telemetryLevel` setting
- **Cost-Efficient:** Smart sampling (10% for successful commands, 100% for errors) minimizes data volume while maintaining insights
- **Transparent:** Debug logging in AL Navigator output channel shows exactly what data is being sent
- **Secure:** Instrumentation key is public (following VS Code extension best practices) but protected by daily data cap and rate limiting

### **[0.9.0]**
- **New Feature:** Report translation support in "Create a new report" dialog - when browsing reports to copy, the extension now displays translated report names (e.g., "Standard Sales - Order Conf. / Verkauf - Auftragsbestätigung") using the same translation system as the startup object selection
- **Enhancement:** Caption-based report translation - reports are translated using their Caption property as the primary lookup key, ensuring accurate translations match the actual report captions in XLF files
- **Enhancement:** Multi-source translation loading for reports - translations are loaded from .app packages, workspace XLF files, and AL file comment translations, with proper priority handling
- **Fixed:** Extended AL file parsing for files with copyright headers - the extension now searches up to 50 lines (instead of 10) to find object declarations, correctly handling files with lengthy copyright headers, namespace declarations, and multiple using statements
- **Enhancement:** "Current Object" in startup object selection now shows object name and translation - when selecting a startup object, the "Current Object" option now displays the full object name with translation (e.g., "Report 50100: Standard Sales - Order Conf. Copy / Verkauf - Auftragsbestätigung") matching the format of other objects in the list
- **Enhancement:** Improved object detection in startup selection - the extension now extracts and displays the Caption property from the currently open page or report, providing more accurate translation lookups
- **Enhancement:** Comment-aware object parsing - the parser now recognizes files starting with comment blocks (// or /*) in addition to namespace declarations, ensuring reliable object detection across different file formats

### **[0.8.9]**
- **Fixed:** Support for unquoted object names - the extension now correctly detects and processes objects with unquoted names (e.g., `report 50101 MyReport` in addition to `report 50101 "MyReport"`), ensuring all AL objects are properly recognized regardless of naming style

### **[0.8.8]**
- **Enhancement:** Caption-based translation lookup - the extension now extracts the Caption property from page and report objects and uses it as the primary key for finding translations in XLF files, resulting in more accurate translations
- **Enhancement:** Smart Caption detection with Locked property handling - Captions marked with `Locked = true` (technical/API names) are automatically ignored and fallback to using the object name for translation lookup
- **Enhancement:** Improved translation accuracy - by using the Caption property which often matches the actual translation keys in XLF files, the extension now finds more direct translations without relying on fallback strategies
- **Enhancement:** Multi-level translation fallback - when a Caption exists, the extension first tries to find a translation for the Caption, then falls back to the object name, and finally applies intelligent fallback strategies if needed
- **Performance:** Efficient Caption extraction - uses regex pattern matching to extract Captions from the next ~2000 characters after object declaration, avoiding full file parsing
- **Enhancement:** Caption extraction from all sources - Captions are extracted from workspace .al files, .app packages, and during incremental cache updates for consistent behavior

### **[0.8.7]**
- **New Feature:** Object list now displays translations from XLF files - when selecting startup objects, the extension shows both English and translated object names (e.g., "Customer List / Debitorenliste") automatically detected from your .app packages
- **Enhancement:** Automatic translation extraction from .app packages - the extension now parses XLF translation files from all .app files in your .alpackages folder to provide accurate object name translations
- **Enhancement:** Multi-language support for object selection - works with all available languages in your .app dependencies, no configuration needed
- **Enhancement:** Automatic language detection - the extension automatically detects and loads ALL available translations from XLF files without requiring manual language configuration
- **Enhancement:** Simplified user experience - removed language switcher button from object selection. The extension now shows all available translations automatically from your dependencies
- **Enhancement:** Improved cache stability - cache key no longer depends on language configuration, making it more stable across different workspace setups
- **Enhancement:** Significantly improved translation coverage with 10 new intelligent fallback strategies - the extension now automatically translates many more object names that previously appeared only in English
- **New Fallback Strategy:** Entity suffix removal - API pages like "Sales Invoice Entity" now find translations by removing the "Entity" suffix
- **New Fallback Strategy:** Part suffix removal - List part pages like "G/L Entries Part" now find translations by removing the "Part" suffix
- **New Fallback Strategy:** FactBox suffix removal - FactBox pages like "Item Statistics FactBox" now find translations by removing the "FactBox" suffix
- **New Fallback Strategy:** Lines translation - Subpage lines like "Sales Lines" now translate correctly by appending "zeilen" to the base object translation
- **New Fallback Strategy:** Setup translation - Setup pages like "Marketing Setup" now translate correctly by appending "einrichtung" to the base object translation
- **New Fallback Strategy:** Preview suffix handling - Preview pages like "G/L Posting Preview" now find translations by removing the suffix or adding "Vorschau"
- **New Fallback Strategy:** Card suffix handling - Card pages like "Resource Group Card" now find translations by removing the suffix or adding "Karte"
- **New Fallback Strategy:** Activities translation - Activity pages like "Office 365 Sales Activities" now translate correctly by appending "Aktivitäten"
- **New Fallback Strategy:** Wizard translation - Wizard pages like "CRM Connection Setup Wizard" now translate correctly by appending "Assistent"
- **New Fallback Strategy:** APIV2 prefix removal - API pages like "APIV2 - Sales Quotes" now find translations by removing the technical API prefix
- **New Feature:** Intelligent glossary system for abbreviations - the extension now provides base translations for common Business Central abbreviations (G/L, IC, Job, etc.) that enable fallback patterns to work more effectively
- **New Glossary:** G/L (General Ledger) terms - translates "G/L Entry" to "Sachposten", "G/L Account" to "Sachkonto", and related variations
- **New Glossary:** IC (Intercompany) terms - translates "IC Partner" to "Konz.-Partner", "IC Inbox" to "Konz.-Eingang", and related objects
- **New Glossary:** Job/Project terms - translates "Job" to "Projekt", "Job Card" to "Projektkarte", "Job Planning Lines" to "Projektplanungszeilen", and related objects
- **New Glossary:** Common abbreviations - translates "Purch." to "Einkauf", "Whse." to "Lager", "VAT" to "MwSt.", and many more standard Business Central abbreviations
- **Enhancement:** Glossary enables fallback patterns - by providing base translations (e.g., "G/L Entry" → "Sachposten"), the existing fallback patterns can now successfully translate compound objects
- **Technical:** Glossary runs before fallback patterns, creating a foundation of base translations that patterns can build upon
- **Impact:** Translation coverage improved from ~73% to ~76% (111 of previously untranslated 1250 objects now covered). The system is future-proof and will automatically improve as Microsoft adds more base translations in future releases.

### **[0.8.6]**
- **Fixed:** Custom .alpackages folder path support - the startup object selection now properly respects the `al.packageCachePath` setting in settings.json, allowing you to use .app files from custom locations (e.g., shared network folders or alternative local paths)
- **Enhancement:** Comprehensive logging for .alpackages folder detection - added detailed debug messages to the AL Navigator output channel showing which paths are checked and why a path is used or skipped
- **Enhancement:** Better error messages when .alpackages folder is not found - the extension now provides helpful hints about checking your `al.packageCachePath` configuration
- **Enhancement:** Improved error handling when accessing .alpackages folders - errors are now caught and logged with detailed information including the attempted path

### **[0.8.5]**
- **New Feature:** Multi-launch.json file selection - when multiple launch.json files exist in your workspace, you can now select which files to update
- **New Feature:** Added setting `alNavigator.updateAllLaunchJsons` (default: false) - when enabled, automatically updates all launch.json files in the workspace without prompting for selection
- **New Feature:** Multi-configuration selection - when multiple launch configurations exist in launch.json, you can now select which specific configurations to update with the startup object
- **New Feature:** Added setting `alNavigator.updateAllLaunchConfigurations` (default: false) - when enabled, all configurations in a launch.json are updated without prompting; when disabled, you can select which configurations to update
- **Enhancement:** Improved workflow - reordered selection process: first select object, then choose launch.json files, then select configurations (if needed)
- **Enhancement:** Unified configuration selection dialog - all configurations from all selected launch.json files are now shown in a single multi-select dialog with clear file path indicators
- **Enhancement:** Smart .app file filtering - the extension now excludes previous versions of your own app from the object list when browsing "All Objects"
- **Enhancement:** Duplicate app version handling - when multiple versions of the same dependency app exist in .alpackages, only the latest version is shown in the object list
- **Enhancement:** Improved object list readability - significantly cleaner object selection with fewer duplicates when working with multi-app workspaces
- **Enhancement:** Comprehensive logging to AL Navigator output channel - detailed debug information for troubleshooting launch.json updates
- **Fixed:** Overlapping edit error - resolved the issue that occurred when updating launch.json files with multiple configurations by applying edits sequentially instead of batching them
- **Fixed:** Launch.json configuration selection now properly handles files with multiple AL configurations (e.g., for different containers)
- **Fixed:** Better error handling with detailed error messages and stack traces in the AL Navigator console

### **[0.8.4]**
- **Fixed:** Launch.json parser now supports JSON files with comments - the extension can now properly read and modify launch.json files that contain single-line (//) or multi-line (/* */) comments
- **Enhancement:** Improved compatibility with Visual Studio Code's default launch.json format which often includes commented-out configurations
- **Enhancement:** Launch.json files are now modified in-place, preserving original formatting and comments when updating startupObjectId values

### **[0.8.3]**
- **Enhancement:** Variable creation now respects AL's official type ordering - variables are automatically inserted in the correct position according to AL Language specification: Record, Report, Codeunit, XmlPort, Page, Query, Notification, BigText, DateFormula, RecordId, RecordRef, FieldRef, FilterPageBuilder (complex types), followed by simple types
- **Enhancement:** Variables of the same type are now sorted alphabetically by name for better readability
- **Enhancement:** Improved code organization for variable insertion - new variables are no longer always added at the end of var sections, but instead placed at the appropriate position based on their type
- **Enhancement:** Better code readability - properly sorted variable declarations make AL code more maintainable and compliant with Microsoft's AL coding standards
- **Fixed:** Automatic variable type detection now works correctly again - fixes regression where simple object names (e.g., "Item", "Customer") were not automatically recognized as their corresponding AL types

### **[0.8.2]**
- **Enhancement:** Report Analyzer now supports report extensions in addition to regular reports
- **Enhancement:** Processing-only report detection - automatically detects when a report or its base report (for extensions) is processing-only
- **Enhancement:** Informative message shown when attempting to analyze processing-only reports or their extensions, explaining that layout analysis is not available
- **Fixed:** Report extensions are now properly recognized by the analyzer

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
- **Fixed:** Temp recognition not working correctly, fixes issue 156
- **Enhancement:** Prefilter `startupObjectId` with current object, implements enhancement from issue 152
- **Enhancement:** Sets startupObjectId in all launch.json configurations, not just the first one

### **[0.7.2]**
- **Fixed:** Issue with xlf updater

### **[0.7.1]**
- **New Feature:** Support for custom .alpackages folder paths

### **[0.7.0]**
- **Enhancement:** Optimized translation on hover functionality by better recognizing words that belong together
- **Enhancement:** Optimized finding of rdl(c) layout files in reports in the rendering section

### **[0.6.9]**
- **Enhancement:** Improved XLF updating for comments that contain description AND translation

### **[0.6.8]**
- **Fixed:** Minor fixes for xlf updater
- **Enhancement:** Improved finding of rdlc files for variable renaming/removing
- **Enhancement:** Do not update rdl(c) files when removing variables, just remove the variable and let user rebuild

### **[0.6.7]**
- **Fixed:** Minor fixes for xlf updater

### **[0.6.6]**
- **Fixed:** Minor fixes

### **[0.6.5]**
- **New Feature:** AL Navigator: Rename report dataitem column

### **[0.6.4]**
- **New Feature:** Insert translation from comment into xlf
- **Fixed:** Issue where the .zip file still existed after changing the launch.json
- **Enhancement:** Minor improvements for launch.json updating

### **[0.6.3]**
- **New Feature:** Select `startupObjectId` in `launch.json` using a dropdown list.

### **[0.6.2]**
- **Enhancement:** Automatically create arrays with correct casing
- **Enhancement:** Improved importing of report layouts, supporting namespaces in report files
- **New Feature:** Remove unused variables from reports

### **[0.6.1]**
- **Fixed:** Issue where translations for texts containing single apostrophes were not displayed correctly

### **[0.6.0]**
- **Fixed:** Minor fixes related to copying reports

### **[0.5.9]**
- **New Feature:** Support for copying reports specifically for TSO apps (KatarGo)

### **[0.5.8]**
- **Fixed:** Minor bug when creating a report

### **[0.5.7]**
- **Fixed:** Issues with report creation and variable creation

### **[0.5.6]**
- **Fixed:** Bug in the report creation process

### **[0.5.5]**
- **Fixed:** Issue with variable creation (#112) - Special thanks to dannoe

### **[0.5.4]**
- **New Feature:** Translate and copy text to clipboard

### **[0.5.3]**
- **Enhancement:** Extended the copy report functionality with automatic ID assignment to new reports
- **Enhancement:** Dialog for selecting report names

### **[0.5.2]**
- **New Feature:** Ability to copy reports

### **[0.5.1]**
- **Enhancement:** Improved translation functionalities with faster and more reliable performance
- **Enhancement:** Reactivated hover translations for fields
- **Breaking Change:** Removed the "Open Microsoft Translation" functionality

### **[0.5.0]**
- **Fixed:** Improved the detection of correct variable insertion positions
- **Fixed:** Better handling of objects with identical names (e.g., tables vs. pages)

### **[0.4.9]**
- **Fixed:** Display issues for special characters in Microsoft translations

### **[0.4.8]**
- **Enhancement:** Compatibility with AL Language Extension version 8.2.545335

### **[0.4.7]**
- **Enhancement:** Improved indentation for created variable sections (#76)

### **[0.4.6]**
- **Enhancement:** Temporarily disabled hover functionality

### **[0.4.5]**
- **Enhancement:** Renamed `disableHoverProviders` to `enableHoverProviders`

### **[0.4.4]**
- **Enhancement:** Disabled hover providers by default

### **[0.4.3]**
- **New Feature:** Microsoft translations on hover for field names
- **New Feature:** Configuration setting `disableHoverProviders`

### **[0.4.2]**
- **New Feature:** Search functionality for translations across all products if no Dynamics NAV translation is found
- **New Feature:** Configuration setting `maxNoOfShownTranslations`

### **[0.4.1]**
- **Fixed:** Loading of enum lists
- **Fixed:** Issues where the local variable section could not be found for creating new variables
- **Enhancement:** Improved performance by loading the object list only on the first variable/parameter creation

### **[0.4.0]**
- **Fixed:** Indentation issues when creating variables using CodeAction

### **[0.3.9]**
- **New Feature:** Open Microsoft translations for target language → English
- **New Feature:** Show Microsoft translations for target language → English

### **[0.3.8]**
- **Fixed:** Minor bug fixes

### **[0.3.7]**
- **Enhancement:** Improved "Add local variable" and "Add parameter" functionalities
- **New Feature:** Show Microsoft translation

### **[0.3.6]**
- **New Feature:** Open Microsoft translation.

### **[0.3.5]**
- **Enhancement:** Prevented "Add local variable" or "Add parameter" from appearing in Request Pages
- **Enhancement:** Improved tracking of file name and object name changes

### **[0.3.4]**
- **Fixed:** Minor bug fixes

### **[0.3.3]**
- **Enhancement:** Loaded workspace objects on startup instead of during first variable creation
- **Enhancement:** Support for complex variables using recursive functions (e.g., `List of [Dictionary of [Code[50], Decimal]]`)
- **Fixed:** `ignoreALSuffix` bug
- **New Feature:** Add parameters
- **Enhancement:** Removed irrelevant shortcuts

### **[0.3.2]**
- **Enhancement:** Recognized newly downloaded `.alpackages`

### **[0.3.1]**
- **New Feature:** Configuration settings `ignoreALPrefix` and `ignoreALSuffix`
- **Enhancement:** Improved detection and removal of prefixes/suffixes from variable names
- **Fixed:** Duplicate entries in the object selection list

### **[0.3.0]**
- **Enhancement:** Recognized TestPages alongside Pages in object lists
- **Enhancement:** Users can now replace placeholder variables with suggested variable names
- **New Feature:** Jump through data items starting from the bottom

### **[0.2.9]**
- **Fixed:** Query recognition issues
- **Fixed:** Correctly created arrays
- **Enhancement:** Prevented variable creation if the variable type selection is canceled
- **Enhancement:** Improved detection of variables with specific naming patterns (e.g., Dates, Dialogs, Booleans)

### **[0.2.8]**
- **Fixed:** Naming issues for temporary variables
- **Enhancement:** Improved handling of global/local variables followed by parentheses
- **Enhancement:** Improved support for dictionary types, including lengths for `Code` and `Text`

### **[0.2.7]**
- **Enhancement:** Enhanced detection of temporary records
- **Enhancement:** Better recognition of short variable names like `PurchLine`
- **Enhancement:** Improved navigation to global variable sections
- **Enhancement:** Ability to select objects from a list when automatic detection fails

### **[0.2.6]**
- **Enhancement:** Automatically jumped to newly created variables without object types
- **Enhancement:** Users can select variable types when automatic detection fails

### **[0.2.5]**
- **New Feature:** Support for creating global variables
- **Fixed:** Issues with variable creation in newly created `.al` files

### **[0.2.4]**
- **Enhancement:** Significant improvements to variable creation
- **Enhancement:** Enhanced detection of variables that can or should be created

### **[0.2.2]**
- **Enhancement:** Improved DataItem navigation to avoid jumping into `OnPreDataItems`
- **New Feature:** Jump to `OnDeleteTrigger` (Ctrl + Alt + D + D)
- **New Feature:** Jump to `OnModifyTrigger` (Ctrl + Alt + M + M)
- **New Feature:** Jump to `OnInsertTrigger` (Ctrl + Alt + I + I)

### **[0.1.6]**
- **Enhancement:** Added new extension image
- **Breaking Change:** Removed "Add Procedure Stub" feature (replaced by a better implementation)
- **New Feature:** Jump to the last line of global variables (Ctrl + Alt + G)
- **New Feature:** Jump through actions (Ctrl + Alt + A)

### **[0.1.5]**
- **Enhancement:** Code refactoring

### **[0.1.4]**
- **Enhancement:** Enhanced parameter type detection
- **Enhancement:** Improved automatic variable declaration - recognized standard objects and objects from workspace files

### **[0.1.3]**
- **Fixed:** Issues with procedure stub creation

### **[0.1.2]**
- **New Feature:** Support for creating procedure stubs with return values
- **New Feature:** Functionality for adding procedure stubs in workspace files not currently open

### **[0.1.1]**
- **New Feature:** Procedure stub creation in the current file

### **[0.0.2] - [0.1.0]**
- **Fixed:** Bug fixes

### **[0.0.1]**
- Initial release.
