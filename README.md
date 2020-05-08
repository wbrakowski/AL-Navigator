# al-navigator README

Create variables like a boss and navigate through al files with awesome shortcuts.

## Features

### Create Variables

CodeAction for AL0118: Automatic local variable declaration of all standard tables, pages and reports (also objects from workspace files).

Use the Quick Fix lamp (Ctrl + .) to automatically add variables

Update 08.05.2020: Massive improvement of this feature through better recognition of relevant lines where it can be applied.

Used quite some code from David Feldhoff for this Improvement, thank him for it ;-)

![Create Local Variable](resources/VarDeclaration.gif)

### Shortcuts

![Shortcuts](resources/Shortcuts.png)

- Ctrl + Alt + l: jump to last line of local var section (fast way to declare new variables)
- Ctrl + Alt + g: jump to the last line of global var section (fast way to declare new variables)

- Ctrl + Alt + k: jump to the keys section in your .al file 
- Ctrl + Alt + a: jump to next action in a page .al file
- Ctrl + Alt + t: jump through all triggers in your .al file 
- Ctrl + Alt + d: jump through data items in your .al report file 
- Ctrl + Alt + j: jump through OnAfterGetRecord triggers in your .al file 

- Ctrl + o + d: jump to the OnDeleteTrigger
- Ctrl + o + m: jump to the OnModifyTrigger
- Ctrl + o + i: jump to the OnInsertTrigger

### Create Procedure Stub

Create procedure stub if procedure call does not exist yet.

UPDATE 04.05.2020: Seems like someone else decided to also build the same feature in a more stable way.
Check out the extension "AL CodeActions" if you want to automatically create procedures in the future :-)

![Create Procedure Stub](resources/CreateProcedureStub.gif)

 


## Known Issues

Currently none.

## Requirements

|              |         |
|--------------|---------|
| AL Language               | [![vs marketplace](https://img.shields.io/vscode-marketplace/v/ms-dynamics-smb.al.svg?label=vs%20marketplace)](https://marketplace.visualstudio.com/items?itemName=ms-dynamics-smb.al) |
| AZ AL Dev Tools/AL Code Outline           | [![vs marketplace](https://img.shields.io/vscode-marketplace/v/andrzejzwierzchowski.al-code-outline.svg?label=vs%20marketplace)](https://marketplace.visualstudio.com/items?itemName=andrzejzwierzchowski.al-code-outline) |

## Git Repository

https://github.com/wbrakowski/AL-Navigator

## Picture Attribution
<a href="https://vectorified.com/alpaca-icon">Alpaca Icon</a>