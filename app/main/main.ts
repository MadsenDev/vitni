import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import { URL } from 'node:url';
import { DatabaseProvider } from './persistence/database';
import { registerIpcHandlers } from './ipc';
import { ensureMigrations } from './persistence/migrations';
import { createTransformRegistry } from './transforms/registry';

const isDevelopment = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  const dbProvider = new DatabaseProvider();
  await ensureMigrations(dbProvider);

  const transformRegistry = createTransformRegistry();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  registerIpcHandlers(ipcMain, dbProvider, transformRegistry);

  if (isDevelopment) {
    const rendererUrl = new URL('http://localhost:5173');
    await mainWindow.loadURL(rendererUrl.toString());
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexHtml = path.join(__dirname, '../renderer/index.html');
    await mainWindow.loadFile(indexHtml);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    dbProvider.close();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

app.on('ready', async () => {
  try {
    await createWindow();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    dialog.showErrorBox('Startup error', message);
    app.quit();
  }
});
