import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { registerIpcHandlers } from './ipc';
import { createTransformRegistry } from './transforms/registry';
import { ProjectManager } from './projectManager';
import { deviceSettingsService } from './services/deviceSettings';
import { ollamaManager } from './services/ollama';

const isDevelopment = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;
let projectManager: ProjectManager | null = null;

async function createWindow() {
  console.log('[Main] createWindow start');

  // Create and load the window ASAP so the UI appears even if background init is slow
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0f172a',
    show: true,
    frame: false, // Custom titlebar
    titleBarStyle: 'hidden', // macOS-style hidden titlebar
    webPreferences: {
      preload: path.join(__dirname, '../../../preload/app/preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  // Don't build native menu - using custom titlebar
  // buildMenu();

  // Register IPC handlers immediately so renderer calls won't fail during init
  console.log('[Main] init: creating project manager');
  const encryptionKey =
    process.env.PI_DB_KEY && process.env.PI_DB_KEY.trim().length > 0
      ? process.env.PI_DB_KEY
      : await deviceSettingsService.getOrCreateDatabaseEncryptionKey();
  projectManager = new ProjectManager(path.join(app.getPath('userData'), 'projects'), encryptionKey);
  console.log('[Main] init: building transform registry');
  const transformRegistry = createTransformRegistry();
  console.log('[Main] init: registering IPC handlers');
  registerIpcHandlers(ipcMain, projectManager, transformRegistry, ollamaManager, mainWindow);

  if (isDevelopment) {
    const rendererUrl = new URL('http://localhost:5173');
    await mainWindow.loadURL(rendererUrl.toString());
  } else {
    const indexHtml = path.join(__dirname, '../../../renderer/index.html');
    await mainWindow.loadFile(indexHtml);
  }

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow?.isVisible()) {
      mainWindow?.show();
    }
    if (isDevelopment) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Also handle when the page has finished loading in case ready-to-show is missed
  mainWindow.webContents.once('did-finish-load', () => {
    if (!mainWindow?.isVisible()) {
      mainWindow?.show();
    }
  });

  // Surface load failures and avoid being stuck behind the splash
  mainWindow.webContents.once('did-fail-load', (_event, code, desc) => {
    dialog.showErrorBox('Renderer failed to load', `${desc} (code ${code})`);
    if (!mainWindow?.isVisible()) {
      mainWindow?.show();
    }
  });

  // Kick off background initialization after handlers are registered
  ;(async () => {
    try {
      await projectManager.initialize();
      console.log('[Main] init: complete');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[Main] init error:', message);
      dialog.showErrorBox('Initialization error', message);
    }
  })().catch(() => {});

  mainWindow.on('closed', () => {
    mainWindow = null;
    void projectManager?.closeProject();
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

app.on('before-quit', () => {
  try {
    let keepAlive = false;
    try {
      const deviceSettingsPath = path.join(app.getPath('userData'), 'device-settings.json');
      if (fs.existsSync(deviceSettingsPath)) {
        const raw = fs.readFileSync(deviceSettingsPath, 'utf8');
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        keepAlive = Boolean(parsed['ai:ollama:keepAlive']);
      } else if (projectManager) {
        const db = projectManager.getDatabase();
        const row = db.prepare('SELECT value_json FROM project_setting WHERE key = ? LIMIT 1').get('ai:ollama:keepAlive') as { value_json: string } | undefined;
        keepAlive = row ? Boolean(JSON.parse(row.value_json)) : false;
      }
    } catch {
      keepAlive = false;
    }
    if (!keepAlive) ollamaManager.stop();
  } catch {
    // ignore
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
