# Change Log

All notable changes to the "AL Navigator" extension are documented here.

## Release Notes

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
