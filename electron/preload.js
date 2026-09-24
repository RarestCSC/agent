const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('dshDesktopAPI', {
  version: '0.1.0',
  platform: process.platform,
  openExternal: (url) => {
    const { shell } = require('electron');
    shell.openExternal(url);
  },
});
