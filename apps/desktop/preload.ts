import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  startNdi: (config: any) => ipcRenderer.invoke('start-ndi', config),
  stopNdi: () => ipcRenderer.invoke('stop-ndi'),
  getNdiStatus: () => ipcRenderer.invoke('get-ndi-status'),
  sendLiveFrame: (
    buffer: ArrayBuffer,
    width: number,
    height: number,
    fps: number
  ) => {
    return ipcRenderer.invoke('send-live-frame', Buffer.from(buffer), width, height, fps);
  },
  onRemoteCommand: (callback: (cmd: any) => void) => {
    ipcRenderer.removeAllListeners('remote-command');
    const listener = (_event: any, cmd: any) => callback(cmd);
    ipcRenderer.on('remote-command', listener);
    return () => {
      ipcRenderer.removeListener('remote-command', listener);
    };
  },
  broadcastLiveState: (
    state: any,
    activeText: string,
    nextText: string,
    cues?: any[],
    songTitle?: string,
    songsList?: any[],
    activeSongId?: string
  ) => {
    ipcRenderer.send('broadcast-live-state', state, activeText, nextText, cues, songTitle, songsList, activeSongId);
  },
  getPairingInfo: (targetIp?: string) => ipcRenderer.invoke('get-pairing-info', targetIp),
  selectRemoteIp: (targetIp: string) => ipcRenderer.invoke('select-remote-ip', targetIp),
});
