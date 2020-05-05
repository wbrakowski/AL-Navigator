# al-navigator README

Create variables in an easy way and navigate through al files with awesome shortcuts.

## Features

- Automatic creation of variables
- DataItem Jumping
- OnAfterGetRecord Jumping
- Trigger Jumping
- Keys Jumping
- Actions Jumping
- Var Section Jumping
- Create Procedure Stub (removed)

## Usage

![Shortcuts](resources/Shortcuts.png)

- Use the shortcut Ctrl + Alt + l to jump to last line of local var section (fast way to    declare new variables)
- Use the shortcut Ctrl + Alt + g to jump to the last line of global var section (fast way to declare new variables)
- Use the shortcut Ctrl + Alt + k to jump to the keys section in your .al file 
- Use the shortcut Ctrl + Alt + a to jump to next action in a page .al file
- Use the shortcut Ctrl + Alt + t to jump through all triggers in your .al file 
- Use the shortcut Ctrl + Alt + d to jump through data items in your .al report file 
- Use the shortcut Ctrl + Alt + j to jump through OnAfterGetRecord triggers in your .al file 

- Use the shortcut Ctrl + o + d to jump to the OnDeleteTrigger
- Use the shortcut Ctrl + o + m to jump to the OnModifyTrigger
- Use the shortcut Ctrl + o + i to jump to the OnInsertTrigger




- Automatic local variable declaration of all standard tables, pages and reports (also objects from workspace files)
- Use the Quick Fix lamp (Ctrl + .) to automatically add variables

![Create Local Variable](resources/VarDeclaration.gif)


- Create procedure stub if procedure call does not exist yet


![Create Procedure Stub](resources/CreateProcedureStub.gif)


- UPDATE 04.05.2020: Seems like someone else decided to also build the same feature in a more stable way.
- Check out the extension "AL CodeActions" if you want to automatically create procedures in the future :-)
 


## Known Issues

Currently none.

## Requirements

- AL Language extension for VS Code

## Git Repository

https://github.com/wbrakowski/AL-Navigator

## Picture Attribution
<a href="https://vectorified.com/alpaca-icon">Alpaca Icon</a>