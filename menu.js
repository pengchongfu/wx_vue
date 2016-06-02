const {remote} = require('electron');
const {Menu, MenuItem} = remote;

const template = [];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);