const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');

const isDev = !app.isPackaged;
let mainWindow;
let harness;
const sessions = new Map();

async function loadDshSdk() {
  return import('@deepseek-ai/dsh-sdk-client');
}

function sendRuntimeEvent(sessionId, event) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('dsh:event', { sessionId, ...event });
}

function mapNotification(sessionId, notification) {
  const params = notification?.params || {};
  const event = params.event || {};
  const type = event.type || notification.method;
  const data = event.data || {};
  const message = data.message || {};

  if (type === 'assistant/message') {
    const text = Array.isArray(message.content)
      ? message.content.filter((block) => block?.type === 'text').map((block) => block.text).join('')
      : '';
    return { type: 'assistant', message: text, raw: notification, sessionId };
  }
  if (type === 'turn/end') {
    return { type: 'checkpoint', message: '', raw: notification, sessionId };
  }
  if (type === 'tool/call' || type === 'tool/result') {
    return { type: 'tool', message: JSON.stringify(data), raw: notification, sessionId };
  }
  if (notification.method === 'session.status') {
    return {
      type: params.status === 'idle' ? 'checkpoint' : 'assistant',
      message: String(params.status || ''),
      raw: notification,
      sessionId,
    };
  }
  return { type: 'runtime', message: JSON.stringify(event || params), raw: notification, sessionId };
}

ipcMain.handle('dsh:start', async (_event, options = {}) => {
  if (!harness) {
    const { DeepSeekHarness } = await loadDshSdk();
    const dshOptions = {
      profile: options.profile || 'sdk',
      dshBin: options.dshBin || process.env.DSH_BIN,
      cwd: options.cwd || process.cwd(),
      processCwd: options.cwd || process.cwd(),
      provider: options.provider || 'deepseek-official',
      model: options.model || 'deepseek-v4-flash',
      maxTokens: options.maxTokens,
      requestTimeoutMs: options.requestTimeoutMs,
    };
    Object.keys(dshOptions).forEach((key) => dshOptions[key] === undefined && delete dshOptions[key]);
    harness = new DeepSeekHarness(dshOptions);
    await harness.start();
  }

  const sessionId = options.sessionId || `session-${Date.now()}`;
  const session = harness.session(sessionId);
  sessions.set(sessionId, session);
  return { sessionId, runtime: 'dsh', profile: options.profile || 'sdk' };
});

ipcMain.handle('dsh:send', async (_event, { sessionId, prompt }) => {
  if (!harness) throw new Error('DSH runtime is not started');
  const session = sessions.get(sessionId) || harness.session(sessionId);
  sessions.set(sessionId, session);

  const result = await session.run(prompt, {
    onNotification: (notification) => {
      const event = mapNotification(sessionId, notification);
      sendRuntimeEvent(sessionId, event);
    },
  });

  return { sessionId: result.sessionId, finalResponse: result.finalResponse };
});

ipcMain.handle('dsh:stop', async () => {
  if (!harness) return;
  await harness.close();
  harness = undefined;
  sessions.clear();
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 980,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#0b1020',
    title: 'DSH Desktop Agent',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) mainWindow.loadURL('http://127.0.0.1:5173');
  else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', async () => {
  if (harness) {
    try { await harness.close(); } catch { /* runtime shutdown must not block app exit */ }
    harness = undefined;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

void shell;
