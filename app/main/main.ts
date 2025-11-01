import { app, BrowserWindow, dialog, ipcMain, shell, Menu } from 'electron';
import path from 'node:path';
import { URL } from 'node:url';
import { registerIpcHandlers } from './ipc';
import { createTransformRegistry } from './transforms/registry';
import { ProjectManager } from './projectManager';
import { ollamaManager } from './services/ollama';

const isDevelopment = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;
let projectManager: ProjectManager | null = null;

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:project:new')
        },
        {
          label: 'Open Project…',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:project:open')
        },
        {
          label: 'Save Project As…',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu:project:saveAs')
        },
        { type: 'separator' },
        {
          label: 'Export Report…',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow?.webContents.send('menu:report:export')
        },
        { type: 'separator' },
        isDevelopment ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Zoom to Selection',
          accelerator: 'CmdOrCtrl+Shift+Z',
          click: () => mainWindow?.webContents.send('menu:view:zoomSelection')
        },
        {
          label: 'Fit to Screen',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => mainWindow?.webContents.send('menu:view:fit')
        },
        {
          label: 'Center Selection',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => mainWindow?.webContents.send('menu:view:centerSelection')
        }
      ]
    },
    {
      label: 'Settings',
      submenu: [
        {
          label: 'Preferences…',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow?.webContents.send('menu:settings:open')
        },
        {
          label: 'Project Info…',
          accelerator: 'CmdOrCtrl+I',
          click: () => mainWindow?.webContents.send('menu:project:info')
        },
        {
          label: 'Terminology…',
          accelerator: 'CmdOrCtrl+/',
          click: () => mainWindow?.webContents.send('menu:settings:terminology')
        }
      ]
    },
    {
      label: 'Media',
      submenu: [
        {
          label: 'Open Media Gallery…',
          accelerator: 'CmdOrCtrl+Shift+M',
          click: () => mainWindow?.webContents.send('menu:media:openGallery')
        }
      ]
    }
  ];

  // Inject Settings menu if not present or extend it
  const settingsMenu: Electron.MenuItemConstructorOptions = {
    label: 'Settings',
    submenu: [
      {
        label: 'Preferences…',
        accelerator: 'CmdOrCtrl+,',
        click: () => mainWindow?.webContents.send('menu:settings:open')
      },
      {
        label: 'Project Info…',
        accelerator: 'CmdOrCtrl+I',
        click: () => mainWindow?.webContents.send('menu:project:info')
      },
      {
        label: 'Terminology…',
        accelerator: 'CmdOrCtrl+/',
        click: () => mainWindow?.webContents.send('menu:settings:terminology')
      }
    ]
  };

  // Replace existing Settings or append
  const idx = template.findIndex(m => m.label === 'Settings');
  if (idx >= 0) template[idx] = settingsMenu; else template.push(settingsMenu);

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

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
  projectManager = new ProjectManager(path.join(app.getPath('userData'), 'projects'));
  console.log('[Main] init: building transform registry');
  const transformRegistry = createTransformRegistry();
  console.log('[Main] init: registering IPC handlers');
  registerIpcHandlers(ipcMain, projectManager, transformRegistry, ollamaManager, mainWindow);

  if (isDevelopment) {
    const rendererUrl = new URL('http://localhost:5173');
    await mainWindow.loadURL(rendererUrl.toString());
  } else {
    const indexHtml = path.join(__dirname, '../renderer/index.html');
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
    if (!projectManager) return;
    const db = projectManager.getDatabase();
    let keepAlive = false;
    try {
      const row = db.prepare('SELECT value_json FROM project_setting WHERE key = ? LIMIT 1').get('ai:ollama:keepAlive') as { value_json: string } | undefined;
      keepAlive = row ? Boolean(JSON.parse(row.value_json)) : false;
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
