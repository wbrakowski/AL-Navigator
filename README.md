# al-navigator README

Various navigation functions to make developing objects for Business Central easier.

## Features

- Create Procedure Stub
- DataItem Jumping
- OnAfterGetRecord Jumping
- Trigger Jumping
- Keys Jumping
- Actions Jumping
- Var Section Jumping

## Usage

- Create procedure stub in current file if procedure call does not exist yet


![Create Procedure Stub](resources/CreateProcedureStub.gif)


- Automatic local variable declaration of all standard tables and codeunit names (also objects from workspace files)
- Use the Quick Fix lamp (Ctrl + .) to automatically add variables


![Create Local Variable](resources/VarDeclaration.gif)


- Use the shortcut Ctrl + Alt + d to jump through data items in your .al report file 
- Use the shortcut Ctrl + Alt + g to jump through OnAfterGetRecord triggers in your .al file 
- Use the shortcut Ctrl + Alt + t to jump through all triggers in your .al file 
- Use the shortcut Ctrl + Alt + k to jump to the keys section in your .al file 
- Use the shortcut Ctrl + Alt + a to jump to actions in a page .al file
- Use the shortcut Ctrl + Alt + l to jump to last line of local var section (fast way to declare new variables)

## Known Issues

Currently none.

## Requirements

- AL Language extension for VS Code

## Git Repository

https://github.com/wbrakowski/AL-Navigator