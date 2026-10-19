/**
 * LuiLyric Output Adapter (Bagian 10, 29, 31)
 * Implementasi Tahap A (Web Preview):
 * - Wajib melaporkan nativeNdi = false dan status 'unavailable'
 * - Menampilkan label jujur "Unavailable in web preview"
 * - Menyediakan kerangka kontrak yang identik untuk NativeNdiAdapter pada Tahap B (Windows Agent)
 */

import {
  OutputAdapter,
  OutputCapabilities,
  OutputConfig,
  OutputStatus,
} from '../contracts';

export class PreviewOutputAdapter implements OutputAdapter {
  private status: OutputStatus = 'unavailable';
  private lastConfig: OutputConfig | null = null;

  public getCapabilities(): OutputCapabilities {
    return {
      nativeNdi: false,
      spout: false,
      alpha: true, // Preview lokal menggunakan RGBA alpha buffer asli
      supportedFrameRates: [30, 60],
      environmentLabel: 'Unavailable in web preview',
    };
  }

  public async start(config: OutputConfig): Promise<void> {
    this.lastConfig = { ...config };
    // Bagian 29: Output NDI pada browser harus berstatus Unavailable in web preview,
    // bukan Connected, Live NDI, atau tombol sukses palsu.
    this.status = 'unavailable';
  }

  public async stop(): Promise<void> {
    this.status = 'unavailable';
  }

  public getStatus(): OutputStatus {
    return this.status;
  }

  public getStatusMessage(): string {
    const sender = this.lastConfig?.senderName || 'LuiLyric - Main';
    return `NDI (${sender}): Unavailable in web preview — Membutuhkan modul native Windows NDI SDK (Tahap B)`;
  }
}
