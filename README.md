# AL Navigator

Create variables like a boss and navigate through al files with awesome shortcuts.

## Features

### Create Variables

CodeAction for AL0118: Automatic local/global variable declaration of all your objects without having to use the var section!

Use the Quick Fix lamp (Ctrl + .) to add variables.

Example 1: Creating records, Code variable and a custom record.

![Create Variables 1](resources/ALNavigator1.gif)

Example 2: Creating complex types like enums, interfaces and dictionaries.

![Create Variables 2](resources/ALNavigator2.gif)

Example 3: Create variables using their short name. Use Temp at the beginning of the record name to make it temporary.

![Create Variables 3](resources/ALNavigator3.gif)

Add a global variable when adding a new column to a data item in reports:

![Create Variables 4](resources/ALNavigator4.gif)

### Shortcuts

![Shortcuts](resources/ALNavigator_Shortcuts.png)

- Ctrl + Alt + d: jump through data items in your .al report file 
- Ctrl + Alt + g: jump to the last line of global var section (fast way to declare new variables)
- Ctrl + Alt + l: jump to last line of local var section (fast way to declare new variables)

- Ctrl + Alt + t: jump through all triggers in your .al file 
- Ctrl + o + d: jump to the OnDeleteTrigger
- Ctrl + o + m: jump to the OnModifyTrigger
- Ctrl + o + i: jump to the OnInsertTrigger

- Ctrl + Alt + k: jump to the keys section in your .al file 
- Ctrl + Alt + a: jump to next action in a page .al file
- Ctrl + Alt + j: jump through OnAfterGetRecord triggers in your .al file 

### Create Procedure Stub

Create procedure stub if procedure call does not exist yet.

UPDATE 04.05.2020: Seems like someone else decided to also build the same feature in a more stable way.
Check out the extension "AL CodeActions" if you want to automatically create procedures in the future :-)

![Create Procedure Stub](resources/CreateProcedureStub.gif)

 



## Requirements

|              |         |
|--------------|---------|
| AL Language               | [![vs marketplace](https://img.shields.io/vscode-marketplace/v/ms-dynamics-smb.al.svg?label=vs%20marketplace)](https://marketplace.visualstudio.com/items?itemName=ms-dynamics-smb.al) |
| AZ AL Dev Tools/AL Code Outline           | [![vs marketplace](https://img.shields.io/vscode-marketplace/v/andrzejzwierzchowski.al-code-outline.svg?label=vs%20marketplace)](https://marketplace.visualstudio.com/items?itemName=andrzejzwierzchowski.al-code-outline) |

## Thanks to
- David Feldhoff for his contributions and feedback
- Andrzej Zwierzchowski for providing such an awesome API for his AZ AL Dev Tools/AL Code Outline extension

## Git Repository

https://github.com/wbrakowski/AL-Navigator

## Picture Attribution
<a href="https://vectorified.com/alpaca-icon">Alpaca Icon</a>