# Change Log

All notable changes to the "AL-Navigator" extension will be documented in this file.

## Release Notes
## [0.6.2]
- Create arrays with correct casing
- Fix importing of report layouts when there are namespaces in the report file
- New feature: Remove unused variables from reports
## [0.6.1]
- Show correct translation for texts that contain single apostrophs
## [0.6.0]
- Minor fixes for copying reports
## [0.5.9]
- Copy reports for TSO apps (KatarGo)
## [0.5.8]
- Minor bug fix when creating a report
## [0.5.7]
- Fixed create report bug and create variables bug
  
## [0.5.6]
- Fixed create report bug
  
## [0.5.5]
- Fixed create variable issue (#112) - thanks dannoe
  
## [0.5.4]
- New functionality: Translate and copy to clipboard

## [0.5.3]
- Extended copy report functionality:
  - Automatic ID assignment to new reports
  - User can select report names in the dialog
## [0.5.2]
- Added copy report functionality
## [0.5.1]
- Improved translation functionalities (faster and more reliable)
- Translations on hover of fields reactivated
- Removed Open Microsoft Translation functionality
## [0.5.0]
- Fixed bug 87 - Better finding of the correct variable insertion position
- Fixed bug 88 - Suggest table and page if 2 objects have the same name
## [0.4.9]
- Show Microsoft Translations: Show special characters properly
## [0.4.8]
- Compatibility with AL Language Extension version 8.2.545335
## [0.4.7]
- Fixed Indentation for created variable section #76
## [0.4.6]
- Temporarily disable hover functionality
## [0.4.5]
- disableHoverProviders renamed to enableHoverProviders
## [0.4.4]
- Disable Hover Providers by default
## [0.4.3]
- Show Microsoft translations on hover over field names
- New configuration setting disableHoverProviders
## [0.4.2]
- Search for all translations in all products if Dynamics NAV translation cannot be found
- New configuration setting: maxNoOfShownTranslations
## [0.4.1]
- Fixed loading the list of enums
- Fixed a bug where the local variable section could nould be found to create new variables
- Object list now will only be loaded when you use the create variable/parameter CodeAction for the first time 
  -> little delay the first time, but this fixes the bug where not all objects are loaded correctly
## [0.4.0]
- Fix indentation when creating variables with CodeAction
## [0.3.9]
- New feature: Open Microsoft translation target language -> english language
- New feature: Show Microsoft translation target language -> english language
## [0.3.8]
- Minor bug fixes
## [0.3.7]
- More fixes for "Add variable local" or "Add parameter" 
- New feature: show microsoft translation
## [0.3.6]
- New feature: open microsoft translation
## [0.3.5]
- Do not show "Add variable local" or "Add parameter" if user is using CodeAction in Request Page 
- Better  tracking of changed file names and object names 
## [0.3.4]
- Minor bug fixes
## [0.3.3]
- Get list of objects in workspace on startup (on prior versions the list was retrieved on first variable creation)
- Support for complex variables with great depth by using recursive functions (List of [Dictionary of [Code[50], Decimal]])
- Fixed ignoreALSuffix bug
- New feature: Add parameter
- Removed a few shortcuts that do not seem to be relevant
## [0.3.2]
- New downloaded alpackages are now recognized

## [0.3.1]
- New configuration settings: ignoreALPrefix, ignoreALSuffix
- Prefixes and Suffixes will be removed from suggested variable names
- Fixed bug that adds multiple entries for the same object to the object selection list

## [0.3.0]

- Recognized Pages can also be TestPages -> Show a list where the user can select
- User now has the possibility to use placeholders and then change the variable name to suggested var name
- New shortcut Jump through Data items starting from buttom

## [0.2.9]

- Fixed recognition of queries
- Create arrays correctly
- Do not create variable if user cancels the variable type selection
- More variables can be automatically created if their name matches specific patterns (Dates, Dialogs, Booleans, Labels...)

## [0.2.8]

- Fixed naming of variables created with temporary
- Fixed creation of global/local variable when the variable is followed by a round paranthesis (potential procedure calls)
- Variable naming for variables with numbers at the end is now supported
- "Add local variable xyz" is now not shown when standing in a report data item column
- Dictionary now also supports length for code and text

## [0.2.7]

- Recognize temporary records
- Recognize short variable names like PurchLine
- Better finding of global var section
- Better recognition of vars to be created (sometimes it got confused with procedure names)
- Creation of labels when standing in report columns 
- Objects can be selected from list if they are not automatically detected!
- Support of all var types when choosing them from list

## [0.2.6]

- Jump to created variable if it was created without object type
- Allow selection of variable type if no type can automatically be detected

## [0.2.5]

- Feature added: variables can also be created as global variable
- Bug fix: Variable Creation does now also work for AL Files created after opening the project

## [0.2.4]

- Massive Improvement of variable creation feature. It now recognizes way better if a variable can or should be created.

## [0.2.2]

- Optimized DataItem Jumping so it does not jump into OnPreDataItems
- New feature: Jumpting to OnDeleteTrigger (Ctrl + Alt + d + d)
- New feature: Jumpting to OnModifyTrigger (Ctrl + Alt + m + m)
- New feature: Jumpting to OnInsertTrigger (Ctrl + Alt + i + i)


## [0.1.6]

- Renaming of functions. They can now be found by searching AL Navigator in command window
- New extension image
- Removed feature "Add Procedure Stub" because someone rebuilt it in a better way
- Automatic variable declaration now also for pages
- Feature changed: You can now through all actions instead of just jumping to the start of the actions section
- New feature: You can now jump to the last line of the global var section (Ctrl + Alt + g)
- Jumping through triggers now on new keyboard shortcut (Ctrl + Alt + j)


## [0.1.5]

- Refactoring

## [0.1.4]

- Updated explanation gif for procedure stub
- New gif for automatic variable declaration
- Better parameter type detection (when parameter to be passed is not declared as local variable but was also passed as parameter)
- New Feature: jump to last line in local var block (for declaring variables)
- New Feature: Variable Declarator. Recognizes standard objects and declares variables automatically, also objects from workspace files.
- Refactoring 

## [0.1.3]

- Bugfixing, finding out variable type for procedure stub creation did not work all the time

## [0.1.2]

- Add correct procedure stub with return value
- Add procedure stub in workspace files that are not currently opened when calling a function from a different object
- New feature jumping to actions with shortcut ctrl + alt + a

## [0.1.1]

- Added functionality to add procedure stub in current file

## [0.0.2] - [0.1.0]

Bugfixing

### [0.0.1] 

Initial release
