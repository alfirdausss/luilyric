/**
 * LuiLyric Native NDI Output Adapter (Tahap B: LL-B01)
 * Berkomunikasi dengan host Windows (Electron) yang menjembatani ke LuiLyricNdiSender.exe
 */

import {
  OutputAdapter,
  OutputCapabilities,
  OutputConfig,
  OutputStatus,
} from '../contracts';

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      startNdi: (config: OutputConfig) => Promise<{ ok: boolean; message: string }>;
      stopNdi: () => Promise<void>;
      getNdiStatus: () => Promise<{ ok?: boolean; isRunning?: boolean; status: OutputStatus; message: string }>;
      sendLiveFrame: (
        buffer: ArrayBuffer,
        width: number,
        height: number,
        fps: number
      ) => Promise<boolean | void> | void;
      onRemoteCommand?: (callback: (cmd: any) => void) => (() => void) | void;
      broadcastLiveState?: (
        state: any,
        activeText: string,
        nextText: string,
        cues?: any[],
        songTitle?: string,
        songsList?: any[],
        activeSongId?: string
      ) => void;
      getPairingInfo?: (targetIp?: string) => Promise<{
        ip: string;
        port: number;
        url: string;
        qrDataUrl: string;
        availableIps?: { ip: string; name: string }[];
      }>;
      selectRemoteIp?: (targetIp: string) => Promise<{
        ip: string;
        port: number;
        url: string;
        qrDataUrl: string;
        availableIps?: { ip: string; name: string }[];
      }>;
    };
  }
}

export class NativeNdiOutputAdapter implements OutputAdapter {
  private status: OutputStatus = 'unavailable';
  private lastConfig: OutputConfig | null = null;
  private statusMessage: string = 'NDI Native: Siap diaktifkan';

  public getCapabilities(): OutputCapabilities {
    const isDesktop = Boolean(window.electronAPI?.isElectron);
    return {
      nativeNdi: isDesktop,
      spout: isDesktop,
      alpha: true,
      supportedFrameRates: [30, 60],
      environmentLabel: isDesktop
        ? 'Native Windows NDI & Spout Bridge Active'
        : 'Unavailable in web preview (Jalankan via Desktop Host)',
    };
  }

  public async start(config: OutputConfig): Promise<void> {
    this.lastConfig = { ...config };
    if (!window.electronAPI?.isElectron) {
      this.status = 'unavailable';
      this.statusMessage =
        'NDI: Mode browser web hanya mendukung preview lokal.';
      return;
    }

    try {
      this.status = 'starting';
      this.statusMessage = `NDI (${config.senderName}): Menghubungkan ke NDI sender native...`;
      const res = await window.electronAPI.startNdi(config);
      if (res.ok) {
        this.status = 'running';
        this.statusMessage = `NDI Live (${config.senderName}): Mengirim frame ${config.width}x${config.height} @ ${config.fps}fps ke Resolume Arena`;
      } else {
        this.status = 'error';
        this.statusMessage = `NDI Error: ${res.message}`;
      }
    } catch (err) {
      this.status = 'error';
      this.statusMessage = `NDI Exception: ${err instanceof Error ? err.message : 'Gagal memulai NDI'}`;
    }
  }

  public async stop(): Promise<void> {
    if (window.electronAPI?.isElectron) {
      await window.electronAPI.stopNdi();
    }
    this.status = 'stopped';
    this.statusMessage = 'NDI Sender dimatikan';
  }

  public getStatus(): OutputStatus {
    return this.status;
  }

  public getStatusMessage(): string {
    return this.statusMessage;
  }

  public async checkStatus(): Promise<OutputStatus> {
    if (!window.electronAPI?.isElectron || !window.electronAPI.getNdiStatus) {
      this.status = 'unavailable';
      return this.status;
    }
    try {
      const res = await window.electronAPI.getNdiStatus();
      if (res && res.isRunning) {
        this.status = 'running';
        if (this.lastConfig) {
          this.statusMessage = `NDI Live (${this.lastConfig.senderName}): Mengirim frame ${this.lastConfig.width}x${this.lastConfig.height} @ ${this.lastConfig.fps}fps ke Resolume Arena`;
        } else {
          this.statusMessage = 'NDI Live: Terhubung ke NDI sender aktif';
        }
      } else {
        this.status = 'stopped';
        this.statusMessage = 'NDI: Standby';
      }
      return this.status;
    } catch {
      return this.status;
    }
  }

  public sendFrame(
    buffer: ArrayBuffer,
    width: number,
    height: number,
    fps: number
  ): Promise<boolean | void> | void {
    if (this.status === 'running' && window.electronAPI?.sendLiveFrame) {
      return window.electronAPI.sendLiveFrame(buffer, width, height, fps);
    }
  }
}
