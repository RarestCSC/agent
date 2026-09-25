const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('dshDesktopAPI', {
  version: '0.2.0',
  platform: process.platform,
  openExternal: (url) => shell.openExternal(url),
  dsh: {
    start: (options) => ipcRenderer.invoke('dsh:start', options),
    send: (sessionId, prompt) => ipcRenderer.invoke('dsh:send', { sessionId, prompt }),
    stop: () => ipcRenderer.invoke('dsh:stop'),
    onEvent: (listener) => {
      const handler = (_event, payload) => listener(payload);
      ipcRenderer.on('dsh:event', handler);
      return () => ipcRenderer.removeListener('dsh:event', handler);
    },
  },
});
