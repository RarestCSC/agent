const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');

let mainWindow;
let harness;
const sessions = new Map();

async function getHarness(options) {
  if (harness) return harness;
  const { DeepSeekHarness } = await import('@deepseek-ai/dsh-sdk-client');
  const config = {
    profile: options.profile || 'sdk',
    dshBin: options.dshBin || process.env.DSH_BIN,
    cwd: options.cwd || process.cwd(),
    processCwd: options.cwd || process.cwd(),
    provider: options.provider || 'deepseek-official',
    model: options.model || 'deepseek-v4-flash',
    maxTokens: options.maxTokens,
    requestTimeoutMs: options.requestTimeoutMs,
  };
  for (const key of Object.keys(config)) if (config[key] === undefined) delete config[key];
  harness = new DeepSeekHarness(config);
  await harness.start();
  return harness;
}

function emit(sessionId, type, message, raw) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('dsh:event', { sessionId, type, message: message || '', raw });
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
    emit(sessionId, 'assistant', text, notification);
  } else if (type === 'tool/call' || type === 'tool/result') {
    emit(sessionId, 'tool', JSON.stringify(data), notification);
  } else if (notification.method === 'session.status') {
    emit(sessionId, params.status === 'idle' ? 'completed' : 'status', String(params.status || ''), notification);
  } else {
    emit(sessionId, 'runtime', JSON.stringify(event || params), notification);
  }
}

ipcMain.handle('dsh:start', async (_event, options = {}) => {
  const active = await getHarness(options);
  const sessionId = options.sessionId || `session-${Date.now()}`;
  const session = active.session(sessionId);
  sessions.set(sessionId, session);
  return { sessionId, runtime: 'dsh', profile: options.profile || 'sdk' };
});

ipcMain.handle('dsh:send', async (_event, { sessionId, prompt }) => {
  if (!harness) throw new Error('DSH runtime is not started');
  const session = sessions.get(sessionId) || harness.session(sessionId);
  sessions.set(sessionId, session);
  const result = await session.run(prompt, {
    onNotification: (notification) => mapNotification(sessionId, notification),
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
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0b1020',
    title: 'DSH Desktop Agent',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  if (!app.isPackaged) mainWindow.loadURL('http://127.0.0.1:5173');
  else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('before-quit', async () => { if (harness) { try { await harness.close(); } catch {} } });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
void shell;
