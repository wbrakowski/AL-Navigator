# AL Navigator

**Simplify your AL development workflow:**  
Create variables and parameters like a pro. Automatically select/insert startup object IDs in your launch.json file. Effortlessly navigate through AL files with intuitive shortcuts. Translate fields on hover and streamline report copying – all in one powerful extension.

[![This extension is written in TypeScript](https://img.shields.io/github/languages/top/wbrakowski/al-navigator)](https://www.typescriptlang.org/)  
[![Number of installs](https://img.shields.io/visual-studio-marketplace/i/wbrakowski.al-navigator)](https://marketplace.visualstudio.com/items?itemName=wbrakowski.al-navigator)  
[![Share the love!](https://img.shields.io/visual-studio-marketplace/stars/wbrakowski.al-navigator)](https://marketplace.visualstudio.com/items?itemName=wbrakowski.al-navigator&ssr=false#review-details)  
[![Last Visual Studio Code Marketplace update](https://img.shields.io/visual-studio-marketplace/last-updated/wbrakowski.al-navigator)](https://marketplace.visualstudio.com/items?itemName=wbrakowski.al-navigator&ssr=false#version-history)  

---

## 🚀 Features

### 🔥 New: Select Startup Object ID
Easily choose a startup object ID for your `launch.json` file using a Quick Pick menu. This feature scans your project for `Page` and `Report` objects (from `.al` files and `.app` packages) and displays:

- **Name**: The name of the object.  
- **ID**: The object ID.  
- **Type**: Whether it’s a Page or Report.  

The selected object is automatically added to `startupObjectId` and `startupObjectType` in your `launch.json`.  


---

### ⚡ Shortcuts for Quick Navigation
Save time with keyboard shortcuts for essential navigation commands:

| Shortcut        | Command Name                                       | Description                                              |
| --------------- | -------------------------------------------------- | -------------------------------------------------------- |
| **Ctrl+Alt+g**  | AL Navigator: End of global variables              | Moves cursor to the end of your global variables.        |
| **Ctrl+Alt+l**  | AL Navigator: End of local variables               | Moves cursor to the end of your local variables.         |
| **Ctrl+Alt+k**  | AL Navigator: Keys                                 | Moves cursor to the keys in your .al table file.         |
| **Ctrl+Alt+a**  | AL Navigator: Next Action                          | Moves cursor to next action in a page .al file.          |
| **Ctrl+Alt+d**  | AL Navigator: Next DataItem (starting from top)    | Moves cursor through data items in your .al report file. |
| **Shift+Alt+d** | AL Navigator: Next DataItem (starting from bottom) | Moves cursor through data items in your .al report file. |

---

### 🌐 Hover Translations
Translate field names and table names effortlessly:  
- **Hover over symbols** (field names, table names, etc.) to see translations.  
- Switch between English ↔ Target Language with a click.  

![Show Translation On Hover](resources/ShowTranslationOnHover.gif)  
![Show Target Translation](resources/ShowTargetTranslation.gif)  
![Show English Translation](resources/ShowEnglishTranslation.gif)  

---

### 📑 Copy Reports Including Layout
Duplicate reports and layouts in seconds:  
- Copy an entire report, including its layout.  
- Create report extensions with layouts pre-integrated.  

![Copy reports including layout](resources/createNewReport.gif)  
![Create report extension including layout](resources/createNewReportExtension.gif)  

---

### 🤖 Intelligent Variable and Parameter Creation
Add variables and parameters with a few keystrokes:  
- **Ctrl + .** triggers a quick fix lamp for AL0118 errors.  
- Automatically generate local/global variables or parameters with suggested names.

#### Examples:
- Create **local variables**:  
  ![Create Variables 1](resources/ALNavigator1.gif)  

- Create **global variables**:  
  ![Create Variables 2](resources/ALNavigator2.gif)  

- Create **parameters**:  
  ![Create Variables 3](resources/ALNavigator3.gif)  

#### 💡 Tips for Using This Feature
| Tip                                                                                                                                                                                                                      | Example                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Use Microsoft’s [naming conventions](https://docs.microsoft.com/en-us/dynamics365/business-central/dev-itpro/compliance/apptest-bestpracticesforalcode#variable-and-field-naming "naming conventions") for object names. | "Vendor" is recognized as Record "Vendor".                                                                                              |
| Use the **Temp** prefix to create temporary record variables.                                                                                                                                                            | "TempItem" is recognized as a temporary Record "Item".                                                                                  |
| Use [Microsoft's suggested abbreviations](https://community.dynamics.com/nav/w/designpatterns/162/suggested-abbreviations "Microsoft's suggested abbreviations").                                                        | "GLSetup" is recognized as Record "General Ledger Setup".                                                                               |
| Replace placeholders like "x" with automatically generated variable names.                                                                                                                                               | Replace "x" with "SalesLine" when "Sales Line" is the selected record.                                                                  |
| Customize ignored prefixes and suffixes for variable names in settings.                                                                                                                                                  | Set `"alNavigator.ignoreALPrefix": "EX"`. For a table named "EX Test Table," the variable "TestTable" will be automatically recognized. |

---

## ⚙️ Settings
| Setting                                 | Description                                                                                        |
| --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `alNavigator.ignoreALPrefix`            | Removes prefixes from suggested variable names.                                                    |
| `alNavigator.ignoreALSuffix`            | Removes suffixes from suggested variable names.                                                    |
| `alNavigator.translationTargetLanguage` | Defines the target language for translation functionalities.                                       |
| `alNavigator.maxNoOfShownTranslations`  | Sets the maximum number of translations displayed.                                                 |
| `alNavigator.enableHoverProviders`      | Enables hover translations for target languages on symbols (field names, etc.). Requires a reload. |

---

## 📋 Requirements

| Extension                           |                                                                                                                                                                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AL Language**                     | [![vs marketplace](https://img.shields.io/vscode-marketplace/v/ms-dynamics-smb.al.svg?label=vs%20marketplace)](https://marketplace.visualstudio.com/items?itemName=ms-dynamics-smb.al)                                     |
| **AZ AL Dev Tools/AL Code Outline** | [![vs marketplace](https://img.shields.io/vscode-marketplace/v/andrzejzwierzchowski.al-code-outline.svg?label=vs%20marketplace)](https://marketplace.visualstudio.com/items?itemName=andrzejzwierzchowski.al-code-outline) |

---

## 💖 Thanks to
- **David Feldhoff** for his contributions and feedback.  
- **Andrzej Zwierzchowski** for providing an awesome API in the AZ AL Dev Tools/AL Code Outline extension.

---

## 🔗 Resources

- [GitHub Repository](https://github.com/wbrakowski/AL-Navigator)  
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=wbrakowski.al-navigator)  
- [Detailed Blog Documentation](https://navinsights.net/category/al-navigator/)  

---

## 📸 Picture Attribution
[Alpaca Icon](https://vectorified.com/alpaca-icon)
