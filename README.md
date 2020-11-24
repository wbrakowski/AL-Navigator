# AL Navigator

Create variables and parameters like a boss. Navigate through al files with awesome shortcuts.

## Features

### Shortcuts

|Shortcut   |Command Name   |Description   |
|---|---|---|
|Ctrl + Alt + g   |AL Navigator: End of global variables  |Move cursor to the end of your global variables (fast way to declare new variables)   |
|Ctrl + Alt + l   |AL Navigator: End of local variables   |Move cursor to the end of your local variables (fast way to declare new variables)   |
|Ctrl + Alt + k   |AL Navigator: Keys  |Move cursor to the keys in your .al file    |
|Ctrl + Alt + a   |AL Navigator: Next Action   |Move cursor to next action in a page .al file   |
|Ctrl + Alt + d   |AL Navigator: Next DataItem (starting from top)  |Move cursor through data items in your .al report file    |
|Shift + Alt + d   |AL Navigator: Next DataItem (starting from bottom)   |Move cursor through data items in your .al report file    |

### Create Variables

CodeAction for AL0118: Create a local/global variable or a parameter by using the quick fix lamp (Ctrl + .=).

Example 1: Create local variables

![Create Variables 1](resources/ALNavigator1.gif)

Example 1: Create global variables

![Create Variables 2](resources/ALNavigator2.gif)

Example 3: Create parameters

![Create Variables 3](resources/ALNavigator3.gif)

### Tips: How To Use the CodeAction
|Tip   |Example   |
|---|---|
|Variable Names for objects like records can automatically be created if they follow the [naming conventions](https://docs.microsoft.com/en-us/dynamics365/business-central/dev-itpro/compliance/apptest-bestpracticesforalcode#variable-and-field-naming "naming conventions")|Vendor - Vendor can be recognized as Record "Vendor"


## Requirements

|              |         |
|--------------|---------|
| AL Language               | [![vs marketplace](https://img.shields.io/vscode-marketplace/v/ms-dynamics-smb.al.svg?label=vs%20marketplace)](https://marketplace.visualstudio.com/items?itemName=ms-dynamics-smb.al) |
| AZ AL Dev Tools/AL Code Outline           | [![vs marketplace](https://img.shields.io/vscode-marketplace/v/andrzejzwierzchowski.al-code-outline.svg?label=vs%20marketplace)](https://marketplace.visualstudio.com/items?itemName=andrzejzwierzchowski.al-code-outline) |

## Thanks to
- David Feldhoff for his contributions and feedback
- Andrzej Zwierzchowski for providing such an awesome API for his AZ AL Dev Tools/AL Code Outline extension

## Additional information
The functionality of this extension is constantly evolving.
To not bloat this readme too much, you can find more detailed documentations and details on my blog (https://navinsights.net/category/al-navigator/).

## Git Repository

https://github.com/wbrakowski/AL-Navigator

## Picture Attribution
<a href="https://vectorified.com/alpaca-icon">Alpaca Icon</a>
