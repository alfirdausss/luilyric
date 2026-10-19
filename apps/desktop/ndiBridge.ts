import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import * as path from 'path';
import * as fs from 'fs';

const PIPE_NAME = '\\\\.\\pipe\\LuiLyricFramePipe';
const HEADER_MAGIC = 0x52464c4c; // "LLFR"

export class NdiBridge {
  private senderProcess: ChildProcess | null = null;
  private pipeSocket: net.Socket | null = null;
  private isConnecting: boolean = false;
  private isRunning: boolean = false;

  constructor(private appRoot: string) {}

  public async start(): Promise<{ ok: boolean; message: string }> {
    if (this.isRunning && this.pipeSocket && !this.pipeSocket.destroyed) {
      return { ok: true, message: 'NDI Bridge already running' };
    }

    const exePath = path.resolve(
      this.appRoot,
      'native/ndi/LuiLyricNdiSender.exe'
    );
    if (!fs.existsSync(exePath)) {
      return {
        ok: false,
        message: `LuiLyricNdiSender.exe tidak ditemukan di: ${exePath}`,
      };
    }

    // 1. Cek apakah native sender sudah berjalan secara manual (seperti di terminal user)
    const alreadyConnected = await this.connectPipe(2, 150);
    if (alreadyConnected) {
      console.log('[NDI Bridge] Terhubung ke native sender yang sudah berjalan.');
      this.isRunning = true;
      return { ok: true, message: 'NDI Bridge terhubung ke sender aktif' };
    }

    // 2. Jika belum ada yang jalan, spawn native C++ NDI Sender sebagai background worker
    try {
      this.senderProcess = spawn(exePath, [], {
        cwd: path.dirname(exePath),
        stdio: 'inherit',
        windowsHide: true,
      });

      this.senderProcess.on('exit', (code) => {
        console.log(`[NDI Bridge] Sender process exited with code ${code}`);
        this.isRunning = false;
        this.pipeSocket = null;
      });
    } catch (err) {
      return {
        ok: false,
        message: `Gagal menjalankan native sender: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    // Connect to named pipe with retry
    const connected = await this.connectPipe(10, 300);
    if (!connected) {
      this.stop();
      return {
        ok: false,
        message: 'Gagal terhubung ke Named Pipe NDI Sender',
      };
    }

    this.isRunning = true;
    return { ok: true, message: 'NDI Bridge running and connected to pipe' };
  }

  private async connectPipe(maxRetries: number, delayMs: number): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await new Promise<void>((resolve, reject) => {
          let connected = false;
          const socket = net.connect(PIPE_NAME, () => {
            connected = true;
            this.pipeSocket = socket;
            socket.on('close', () => {
              if (this.pipeSocket === socket) {
                this.pipeSocket = null;
                this.isRunning = false;
              }
            });
            socket.on('error', (err) => {
              console.warn('[NDI Bridge] Pipe socket error:', err);
              if (this.pipeSocket === socket) {
                this.pipeSocket = null;
                this.isRunning = false;
              }
            });
            resolve();
          });
          socket.once('error', (err) => {
            if (!connected) {
              reject(err);
            }
          });
        });
        console.log('[NDI Bridge] Connected to Named Pipe successfully!');
        return true;
      } catch {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    return false;
  }

  public sendFrame(
    buffer: Buffer | ArrayBuffer | Uint8Array,
    width: number,
    height: number,
    fps: number
  ): boolean {
    if (!this.pipeSocket || !this.isRunning) return false;

    // Backpressure guard: jika pipe socket masih sibuk menulis frame sebelumnya,
    // segera drop frame ini untuk mencegah penumpukan memory (OOM) dan laptop lag
    if (this.pipeSocket.writableNeedDrain || this.pipeSocket.writableLength > 0) {
      return false;
    }

    // Header: 16 bytes (Magic, Width, Height, FPS)
    const header = Buffer.alloc(16);
    header.writeUInt32LE(HEADER_MAGIC, 0);
    header.writeUInt32LE(width, 4);
    header.writeUInt32LE(height, 8);
    header.writeUInt32LE(fps, 12);

    const payload = Buffer.isBuffer(buffer)
      ? buffer
      : Buffer.from(buffer as ArrayBuffer);

    try {
      this.pipeSocket.write(header);
      this.pipeSocket.write(payload);
      return true;
    } catch (err) {
      console.error('[NDI Bridge] Error writing frame to pipe:', err);
      return false;
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.pipeSocket) {
      this.pipeSocket.destroy();
      this.pipeSocket = null;
    }
    if (this.senderProcess) {
      this.senderProcess.kill();
      this.senderProcess = null;
    }
  }

  public isNdiRunning(): boolean {
    return Boolean(this.isRunning && this.pipeSocket && !this.pipeSocket.destroyed);
  }
}
