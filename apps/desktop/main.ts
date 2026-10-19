import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { NdiBridge } from './ndiBridge';
import { RemoteServer } from './remoteServer';

// Anti-Occlusion & Background Throttling Switches (LL-B03 Stage Performance)
// Mencegah Chromium & Windows DWM menurunkan framerate saat jendela tertutup di belakang Resolume Arena
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,IntensiveWakeupThrottling');

let mainWindow: BrowserWindow | null = null;
let ndiBridge: NdiBridge | null = null;
let remoteServer: RemoteServer | null = null;

const appRoot = path.resolve(__dirname, '../');

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'LuiLyric — Live Lyric Typography Engine & NDI Alpha Streamer',
    backgroundColor: '#07090e',
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // JANGAN perlambat render saat jendela di-minimize (LL-B03)
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Load production dist immediately
  const distIndex = path.join(appRoot, 'dist/index.html');
  mainWindow.loadFile(distIndex).catch((err) => {
    console.error('[LuiLyric] Failed to load dist/index.html:', err);
  });

  // Initialize NDI Bridge
  ndiBridge = new NdiBridge(appRoot);

  // Initialize Remote Mobile Server in background without blocking window
  remoteServer = new RemoteServer({
    onCommand: (command) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('remote-command', command);
      }
    },
  });

  remoteServer.start().catch((err) => {
    console.warn('[Remote Server] Failed to initialize mobile remote:', err);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('start-ndi', async (_event, config) => {
  if (!ndiBridge) return { ok: false, message: 'NDI Bridge not initialized' };
  return await ndiBridge.start();
});

ipcMain.handle('stop-ndi', async () => {
  if (ndiBridge) ndiBridge.stop();
  return { ok: true };
});

ipcMain.handle('get-ndi-status', async () => {
  const isRunning = ndiBridge ? ndiBridge.isNdiRunning() : false;
  return {
    ok: true,
    isRunning,
    status: isRunning ? 'running' : 'stopped',
    message: isRunning ? 'NDI Active' : 'NDI Standby',
  };
});

ipcMain.handle('send-live-frame', async (_event, buffer, width, height, fps) => {
  if (ndiBridge) {
    return ndiBridge.sendFrame(buffer, width, height, fps);
  }
  return false;
});

ipcMain.on('send-live-frame', (_event, buffer, width, height, fps) => {
  if (ndiBridge) {
    ndiBridge.sendFrame(buffer, width, height, fps);
  }
});

ipcMain.on('broadcast-live-state', (_event, state, activeText, nextText, cues, songTitle, songsList, activeSongId) => {
  if (remoteServer) {
    remoteServer.broadcastState(state, activeText, nextText, cues, songTitle, songsList, activeSongId);
  }
});

ipcMain.handle('get-pairing-info', async (_event, targetIp?: string) => {
  if (!remoteServer) return null;
  return await remoteServer.getPairingInfo(targetIp);
});

ipcMain.handle('select-remote-ip', async (_event, targetIp: string) => {
  if (!remoteServer) return null;
  return await remoteServer.updateActiveIp(targetIp);
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Sudah ada instance LuiLyric yang berjalan, keluar tanpa error
  app.quit();
} else {
  app.on('second-instance', () => {
    // Jika user mengklik shortcut lagi, bawa jendela yang sudah ada ke depan
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    if (ndiBridge) ndiBridge.stop();
    if (remoteServer) remoteServer.stop();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

