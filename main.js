var app = require('app'); // Module to control application life.
var BrowserWindow = require('browser-window'); // Module to create native browser window.
var Menu = require('menu');
var MenuItem = require('menu-item');
var Handlebars = require('handlebars');
const ipc = require("electron").ipcMain;
var _ = require('lodash/core');
var configuration = require('./js/general/configuration.js');
var dataReader = require('./js/general/data-reader.js');

// Windows
var mainWindow = null;
var graphSettingsWindow = null;
var codeSettingsWindow = null;
var cuInfoWindows = {};
var nodeData = null;

const dialog = require('electron').dialog;

var template = [{
  label: 'File',
  submenu: [{
    label: 'Import Data',
    accelerator: 'CmdOrCtrl+I',
    click: function(item, focusedWindow) {
      importFiles();
    }
  }, {
    label: 'Open DevTools',
    accelerator: 'F12',
    click: function(item, focusedWindow) {
      mainWindow.webContents.openDevTools();
    }
  },
  {
    label: 'Exit',
    accelerator: 'CmdOrCtrl+Esc',
    click: function(item, focusedWindow) {
      mainWindow.close();
    }
  }]
}, {
  label: 'Preferences',
  submenu: [{
    label: 'Graph',
    accelerator: 'CmdOrCtrl+G',
    click: function(item, focusedWindow) {
      if (graphSettingsWindow) {
        graphSettingsWindow.focus();
        return;
      }
      graphSettingsWindow = new BrowserWindow({
        width: 600,
        height: 350
      });
      graphSettingsWindow.setMenu(null);
      graphSettingsWindow.setAlwaysOnTop(true);
      graphSettingsWindow.loadURL('file://' + __dirname + '/windows/graphSettings.html');
      graphSettingsWindow.on('closed', function() {
        graphSettingsWindow = null;
      });
      //graphSettingsWindow.webContents.openDevTools();
    }
  }, {
    label: 'Code',
    accelerator: 'CmdOrCtrl+E',
    click: function(item, focusedWindow) {}
  }]
}];

ipc.on('import-files', function() {
  importFiles();
});

ipc.on('closeGraphSettingsWindow', function() {
  graphSettingsWindow.close();
});

ipc.on('saveGraphSettings', function() {
  //graphSettingsWindow.close();
  mainWindow.webContents.send('redrawGraph');
});



// Quit when all windows are closed.
app.on('window-all-closed', function() {
  if (process.platform != 'darwin')
    app.quit();
});

// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on('ready', function() {
  menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600
  });

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/windows/index.html');
  mainWindow.maximize();
  //mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    legendWindow = null;
    mainWindow = null;
  });
});




function importFiles() {
  var mappingPath;

  // Import File-Mapping
  var filePaths = dialog.showOpenDialog({
    title: 'Import File-Mapping',
    defaultPath: 'data',
    filters: [{
      name: 'Text',
      extensions: ['txt']
    }],
    properties: ['openFile']
  });

  if (filePaths == null)
    return;
  mappingPath = filePaths[0];

  // Import Node-Data
  var filePaths = dialog.showOpenDialog({
    title: 'Import Node-Data',
    defaultPath: mappingPath.substring(0, mappingPath.lastIndexOf("/")),
    filters: [{
      name: 'JSON',
      extensions: ['json']
    }],
    properties: ['openFile']
  });

  if (filePaths == null)
    return;
  var data = dataReader.buildFromFile(mappingPath, filePaths[0]);

  mainWindow.webContents.on('did-finish-load', function() {
    mainWindow.webContents.send('init', data);
  });
  mainWindow.loadURL('file://' + __dirname + '/windows/visualizer.html');



}
