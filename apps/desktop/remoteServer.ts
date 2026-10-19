import * as http from 'http';
import * as os from 'os';
import { WebSocketServer, WebSocket } from 'ws';
import * as QRCode from 'qrcode';

export interface RemoteServerEvents {
  onCommand: (command: any) => void;
}

export class RemoteServer {
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private port = 4040;
  private localIp = '127.0.0.1';
  private latestState: any = null;
  private activeText: string = '';
  private nextText: string = '';
  private songCues: any[] = [];
  private songTitle: string = '';
  private songsList: any[] = [];
  private activeSongId: string = '';
  private qrDataUrl: string = '';

  constructor(private events: RemoteServerEvents) {
    this.detectLocalIp();
  }

  public detectAvailableIps(): { ip: string; name: string; priority: number }[] {
    const interfaces = os.networkInterfaces();
    const candidates: { ip: string; name: string; priority: number }[] = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (!iface.internal && iface.family === 'IPv4') {
          const addr = iface.address;
          // STRICT RULE: Abaikan APIPA / Link-Local 169.254.x.x (Windows unconfigured fallback)
          if (addr.startsWith('169.254.')) continue;
          if (addr.startsWith('127.')) continue;

          let priority = 50;
          const lowerName = name.toLowerCase();

          // Prioritaskan Wi-Fi / WLAN adapter
          if (
            lowerName.includes('wi-fi') ||
            lowerName.includes('wifi') ||
            lowerName.includes('wlan') ||
            lowerName.includes('wireless')
          ) {
            priority += 50;
          }

          // Hotspot interface (default Windows Mobile Hotspot: 192.168.137.1)
          if (addr.startsWith('192.168.137.')) {
            priority += 45;
          } else if (addr.startsWith('192.168.')) {
            priority += 40;
          } else if (addr.startsWith('10.')) {
            priority += 35;
          } else if (addr.startsWith('172.')) {
            priority += 30;
          }

          // Turunkan prioritas virtual adapter (VMware, WSL, VirtualBox, vEthernet)
          if (
            lowerName.includes('vethernet') ||
            lowerName.includes('virtual') ||
            lowerName.includes('vmware') ||
            lowerName.includes('vbox') ||
            lowerName.includes('wsl') ||
            lowerName.includes('docker') ||
            lowerName.includes('loopback')
          ) {
            priority -= 40;
          }

          candidates.push({ ip: addr, name, priority });
        }
      }
    }

    candidates.sort((a, b) => b.priority - a.priority);
    return candidates;
  }

  private detectLocalIp() {
    const candidates = this.detectAvailableIps();
    if (candidates.length > 0) {
      this.localIp = candidates[0].ip;
    } else {
      this.localIp = '127.0.0.1';
    }
  }

  private handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    if (url.pathname === '/remote') {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });
      res.end(this.getMobileHtml());
      return;
    }

    if (url.pathname === '/api/command' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed && parsed.action) {
            this.events.onCommand(parsed);
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(JSON.stringify({ ok: true }));
            return;
          }
        } catch {
          // invalid json
        }
        res.writeHead(400, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify({ ok: false, error: 'Invalid command' }));
      });
      return;
    }

    if (url.pathname === '/api/info') {
      const remoteUrl = `http://${this.localIp}:${this.port}/remote`;
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(
        JSON.stringify({
          ip: this.localIp,
          port: this.port,
          url: remoteUrl,
          qrDataUrl: this.qrDataUrl,
        })
      );
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  }

  public async start(): Promise<{ ip: string; port: number; url: string; qrDataUrl: string }> {
    let boundServer: http.Server | null = null;
    let chosenPort = 4040;

    // Coba bind port mulai dari 4040, jika EADDRINUSE otomatis coba 4041, 4042... dengan instance baru yang bersih
    for (let p = 4040; p < 4060; p++) {
      try {
        boundServer = await new Promise<http.Server>((resolve, reject) => {
          const srv = http.createServer((req, res) => this.handleHttpRequest(req, res));
          const onError = (err: any) => {
            try {
              srv.close();
            } catch {}
            reject(err);
          };
          srv.once('error', onError);
          srv.listen(p, '0.0.0.0', () => {
            srv.removeListener('error', onError);
            resolve(srv);
          });
        });
        chosenPort = p;
        break;
      } catch (err: any) {
        if (err && err.code === 'EADDRINUSE') {
          console.warn(`[Remote Server] Port ${p} sedang dipakai, mencoba port ${p + 1}...`);
          continue;
        }
        console.warn(`[Remote Server] Gagal bind port ${p}:`, err);
        break;
      }
    }

    if (!boundServer) {
      console.warn('[Remote Server] Port 4040-4059 tidak tersedia. Fitur remote dinonaktifkan sementara.');
      return { ip: this.localIp, port: 0, url: '', qrDataUrl: '' };
    }

    this.server = boundServer;
    this.port = chosenPort;

    this.wss = new WebSocketServer({ server: this.server, path: '/ws/control' });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[Remote Server] Mobile controller connected via WebSocket!');

      const isHidden = this.latestState?.phase === 'Blank';
      const currentCueId =
        this.latestState?.liveCueId ||
        this.latestState?.blankedFromSnapshot?.cueId ||
        null;

      ws.send(
        JSON.stringify({
          type: 'init',
          activeText: this.activeText,
          nextText: this.nextText,
          phase: this.latestState?.phase || 'Ready',
          liveCueId: this.latestState?.liveCueId || null,
          currentCueId,
          isHidden,
          cues: this.songCues,
          songTitle: this.songTitle,
          songs: this.songsList,
          activeSongId: this.activeSongId,
        })
      );

      ws.on('message', (data: string) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed && parsed.action) {
            this.events.onCommand(parsed);
          }
        } catch (err) {
          console.error('[Remote Server] Invalid message:', err);
        }
      });
    });

    const remoteUrl = `http://${this.localIp}:${this.port}/remote`;
    try {
      this.qrDataUrl = await QRCode.toDataURL(remoteUrl, {
        margin: 2,
        color: { dark: '#00f0ff', light: '#07090e' },
      });
    } catch {
      this.qrDataUrl = '';
    }

    console.log(`[Remote Server] Listening on ${remoteUrl}`);
    return {
      ip: this.localIp,
      port: this.port,
      url: remoteUrl,
      qrDataUrl: this.qrDataUrl,
    };
  }

  public broadcastState(
    state: any,
    activeText: string,
    nextText: string,
    cues?: any[],
    songTitle?: string,
    songsList?: any[],
    activeSongId?: string
  ) {
    this.latestState = state;
    this.activeText = activeText;
    this.nextText = nextText;
    if (cues !== undefined) this.songCues = cues;
    if (songTitle !== undefined) this.songTitle = songTitle;
    if (songsList !== undefined) this.songsList = songsList;
    if (activeSongId !== undefined) this.activeSongId = activeSongId;

    if (!this.wss) return;

    const isHidden = state?.phase === 'Blank';
    const currentCueId =
      state?.liveCueId || state?.blankedFromSnapshot?.cueId || null;

    const msg = JSON.stringify({
      type: 'state',
      activeText,
      nextText,
      phase: state?.phase || 'Ready',
      liveCueId: state?.liveCueId || null,
      currentCueId,
      isHidden,
      cues: this.songCues,
      songTitle: this.songTitle,
      songs: this.songsList,
      activeSongId: this.activeSongId,
    });

    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  }

  public async getPairingInfo(targetIp?: string) {
    const candidates = this.detectAvailableIps();
    if (targetIp && targetIp.trim().length > 0) {
      this.localIp = targetIp.trim();
    } else if (
      this.localIp === '127.0.0.1' ||
      this.localIp.startsWith('169.254.') ||
      !candidates.some((c) => c.ip === this.localIp)
    ) {
      if (candidates.length > 0) {
        this.localIp = candidates[0].ip;
      }
    }

    const remoteUrl = `http://${this.localIp}:${this.port}/remote`;
    try {
      this.qrDataUrl = await QRCode.toDataURL(remoteUrl, {
        margin: 2,
        color: { dark: '#00f0ff', light: '#07090e' },
      });
    } catch {
      this.qrDataUrl = '';
    }

    const ipList = [...candidates];
    if (this.localIp && !ipList.some((c) => c.ip === this.localIp)) {
      ipList.unshift({ ip: this.localIp, name: 'Manual / Selected IP', priority: 100 });
    }

    return {
      ip: this.localIp,
      port: this.port,
      url: remoteUrl,
      qrDataUrl: this.qrDataUrl,
      availableIps: ipList.map((c) => ({ ip: c.ip, name: c.name })),
    };
  }

  public async updateActiveIp(selectedIp: string) {
    return await this.getPairingInfo(selectedIp);
  }

  public stop() {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  private getMobileHtml(): string {
    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>LuiLyric — Stage Remote</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
      -webkit-user-select: none;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    body {
      background: radial-gradient(circle at 50% 0%, #0f172a 0%, #07090e 65%);
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      height: 100vh;
      height: 100dvh;
      display: flex;
      flex-direction: column;
      padding: 12px;
      overflow: hidden;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      flex-shrink: 0;
    }
    .brand-col { display: flex; flex-direction: column; max-width: 74%; }
    .brand {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #64748b;
      text-transform: uppercase;
    }
    .btn-song-picker {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: rgba(16, 22, 38, 0.9);
      border: 1px solid rgba(0, 240, 255, 0.3);
      border-radius: 10px;
      padding: 6px 10px;
      margin-top: 4px;
      color: #f1f5f9;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
      touch-action: manipulation;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }
    .btn-song-picker:active {
      background: #1e293b;
      transform: scale(0.97);
      border-color: #00f0ff;
    }
    .song-icon { font-size: 12px; flex-shrink: 0; }
    .song-title-text {
      font-size: 13px;
      font-weight: 800;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 165px;
    }
    .song-caret {
      font-size: 10px;
      font-weight: 800;
      color: #00f0ff;
      background: rgba(0, 240, 255, 0.12);
      border: 1px solid rgba(0, 240, 255, 0.25);
      padding: 2px 6px;
      border-radius: 6px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .status {
      font-size: 10px;
      padding: 5px 10px;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
      font-weight: 800;
      letter-spacing: 0.5px;
      transition: all 0.2s ease;
    }
    .status.offline {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.4);
      color: #f87171;
    }

    /* Live Preview Teleprompter Box */
    .preview-box {
      position: relative;
      margin: 10px 0;
      padding: 12px 14px 12px 16px;
      background: linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(10, 14, 23, 0.95));
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-left: 4px solid #475569;
      border-radius: 14px;
      flex-shrink: 0;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
      transition: all 0.2s ease;
    }
    .preview-box.is-live {
      border-color: rgba(16, 185, 129, 0.35);
      border-left: 4px solid #10b981;
      background: linear-gradient(145deg, rgba(12, 28, 32, 0.95), rgba(10, 15, 26, 0.95));
      box-shadow: 0 8px 28px rgba(16, 185, 129, 0.12);
    }
    .preview-box.is-hidden {
      border-color: rgba(245, 158, 11, 0.4);
      border-left: 4px solid #f59e0b;
      background: linear-gradient(145deg, rgba(30, 22, 12, 0.95), rgba(12, 16, 27, 0.95));
    }

    .preview-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .badge-phase { font-size: 9px; font-weight: 800; letter-spacing: 0.6px; padding: 3px 7px; border-radius: 6px; text-transform: uppercase; }
    .badge-live { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
    .badge-hidden { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
    .badge-ready { background: rgba(255, 255, 255, 0.06); color: #94a3b8; border: 1px solid rgba(255, 255, 255, 0.1); }

    .active-text {
      font-size: 17px;
      font-weight: 800;
      line-height: 1.35;
      color: #ffffff;
      min-height: 44px;
      display: flex;
      align-items: center;
      transition: color 0.2s ease;
    }
    .active-text.hidden-mode { color: #fbbf24; font-style: italic; font-weight: 700; font-size: 14px; }
    .next-text {
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.07);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Control Buttons */
    .controls-wrap { flex-shrink: 0; margin-bottom: 10px; }
    .btn-next {
      width: 100%;
      background: linear-gradient(135deg, #10b981 0%, #059669 50%, #00d2ff 100%);
      color: #041014;
      border: none;
      border-top: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 16px;
      height: 68px;
      font-size: 19px;
      font-weight: 900;
      letter-spacing: 1px;
      box-shadow: 0 8px 24px rgba(16, 185, 129, 0.28);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: transform 0.06s ease, filter 0.06s ease, box-shadow 0.06s ease;
      margin-bottom: 8px;
      touch-action: manipulation;
    }
    .btn-next:active, .btn-next.btn-pressed {
      transform: scale(0.97);
      filter: brightness(1.18);
      box-shadow: 0 0 28px rgba(0, 240, 255, 0.65);
    }

    .action-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }
    .btn-sub {
      background: #111827;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #e2e8f0;
      border-radius: 12px;
      height: 48px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      transition: transform 0.05s ease, background 0.15s ease, filter 0.05s ease;
      touch-action: manipulation;
    }
    .btn-sub:active, .btn-sub.btn-pressed {
      transform: scale(0.95);
      filter: brightness(1.2);
    }
    .btn-first { background: rgba(0, 240, 255, 0.08); border-color: rgba(0, 240, 255, 0.3); color: #00f0ff; }
    .btn-first:active, .btn-first.btn-pressed { background: rgba(0, 240, 255, 0.2); }
    .btn-back { border-color: rgba(255, 255, 255, 0.12); }
    .btn-back:active, .btn-back.btn-pressed { background: #1e293b; }

    /* Hide / Show dynamic button */
    .btn-hide { background: rgba(127, 29, 29, 0.35); border-color: rgba(239, 68, 68, 0.4); color: #fca5a5; }
    .btn-hide:active, .btn-hide.btn-pressed { background: rgba(127, 29, 29, 0.6); }
    .btn-show { background: rgba(6, 78, 59, 0.6); border-color: #10b981; color: #6ee7b7; animation: pulseShow 1.5s infinite; }
    .btn-show:active, .btn-show.btn-pressed { background: #047857; }
    @keyframes pulseShow {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
      70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    /* Bypass / Jump Section */
    .bypass-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #0a0e17;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      overflow: hidden;
      min-height: 0;
    }
    .bypass-header {
      padding: 9px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
      background: #0f1626;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-shrink: 0;
    }
    .bypass-title {
      font-size: 10px;
      font-weight: 800;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }
    .bypass-search {
      background: #07090e;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      color: #f1f5f9;
      font-size: 12px;
      padding: 5px 10px;
      width: 140px;
      outline: none;
      touch-action: manipulation;
      user-select: text;
      -webkit-user-select: text;
    }
    .bypass-search:focus { border-color: #00f0ff; }

    .cues-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
      overscroll-behavior: contain;
    }

    .cue-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: #101726;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
      text-align: left;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }
    .cue-item.cue-pressed { background: #1e293b !important; }
    .cue-item.active {
      background: linear-gradient(90deg, rgba(16, 185, 129, 0.18), rgba(0, 240, 255, 0.08));
      border-color: #10b981;
      box-shadow: 0 0 14px rgba(16, 185, 129, 0.18);
    }
    .cue-item.active.hidden-state {
      background: rgba(245, 158, 11, 0.14);
      border-color: #f59e0b;
      box-shadow: 0 0 12px rgba(245, 158, 11, 0.2);
    }

    .cue-num {
      font-size: 11px;
      font-weight: 800;
      font-family: monospace;
      color: #64748b;
      min-width: 24px;
    }
    .cue-item.active .cue-num { color: #34d399; }
    .cue-sec {
      font-size: 9px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 5px;
      background: rgba(255, 255, 255, 0.06);
      color: #94a3b8;
      white-space: nowrap;
    }
    .cue-text {
      font-size: 13px;
      font-weight: 600;
      color: #e2e8f0;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cue-item.active .cue-text { color: #ffffff; font-weight: 800; }
    .cue-badge {
      font-size: 9px;
      font-weight: 800;
      padding: 3px 7px;
      border-radius: 6px;
      background: #10b981;
      color: #041014;
      flex-shrink: 0;
    }
    .cue-item.active.hidden-state .cue-badge {
      background: #f59e0b;
      color: #07090e;
    }

    /* Modal Sheet Pilih Lagu */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }
    .modal-backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }
    .modal-sheet {
      background: #0c101b;
      border-top: 1px solid #1e293b;
      border-radius: 20px 20px 0 0;
      max-height: 85vh;
      height: 85vh;
      display: flex;
      flex-direction: column;
      transform: translateY(100%);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.8);
      overflow: hidden;
    }
    .modal-backdrop.open .modal-sheet {
      transform: translateY(0);
    }
    .modal-header {
      padding: 12px 16px;
      border-bottom: 1px solid #1e293b;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      background: #101626;
    }
    .modal-title {
      font-size: 13px;
      font-weight: 800;
      color: #00f0ff;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .modal-count {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 9999px;
      background: #1e293b;
      color: #94a3b8;
    }
    .btn-close-modal {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #1e293b;
      border: 1px solid #334155;
      color: #f1f5f9;
      font-size: 14px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      touch-action: manipulation;
    }
    .btn-close-modal:active {
      background: #334155;
      color: #00f0ff;
    }
    .modal-search-wrap {
      padding: 8px 12px;
      border-bottom: 1px solid #1e293b;
      background: #101626;
      flex-shrink: 0;
    }
    .modal-search-input {
      width: 100%;
      background: #07090e;
      border: 1px solid #1e293b;
      border-radius: 8px;
      color: #f1f5f9;
      font-size: 14px;
      padding: 10px 12px;
      outline: none;
      touch-action: manipulation;
      user-select: text;
      -webkit-user-select: text;
    }
    .modal-search-input:focus {
      border-color: #00f0ff;
      box-shadow: 0 0 10px rgba(0, 240, 255, 0.2);
    }
    .songs-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
      overscroll-behavior: contain;
    }
    .song-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px 13px;
      background: #141c30;
      border: 1px solid #1e293b;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }
    .song-card.song-pressed {
      background: #1e293b !important;
    }
    .song-card.active-song {
      background: rgba(0, 240, 255, 0.12);
      border-color: #00f0ff;
      box-shadow: 0 0 12px rgba(0, 240, 255, 0.2);
    }
    .song-card-num {
      font-size: 11px;
      font-weight: 800;
      font-family: monospace;
      color: #64748b;
      min-width: 24px;
    }
    .song-card.active-song .song-card-num {
      color: #00f0ff;
    }
    .song-card-info {
      flex: 1;
      min-width: 0;
    }
    .song-card-title {
      font-size: 14px;
      font-weight: 800;
      color: #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .song-card.active-song .song-card-title {
      color: #ffffff;
    }
    .song-card-meta {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .badge-active-song {
      font-size: 9px;
      font-weight: 800;
      padding: 3px 6px;
      border-radius: 4px;
      background: #00f0ff;
      color: #07090e;
      flex-shrink: 0;
    }
    .song-select-arrow {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand-col">
      <div class="brand">LUI LYRIC • STAGE REMOTE</div>
      <button type="button" class="btn-song-picker" id="btn-open-songs" title="Ketuk untuk ganti lagu">
        <span class="song-icon" style="display:inline-flex;align-items:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></span>
        <span class="song-title-text" id="song-title">Memuat setlist...</span>
        <span class="song-caret" style="display:inline-flex;align-items:center;gap:3px;">Ganti <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>
      </button>
    </div>
    <div class="status" id="status-badge">CONNECTING...</div>
  </div>

  <div class="preview-box is-ready" id="preview-box">
    <div class="preview-meta">
      <span class="badge-phase badge-ready" id="phase-badge">READY</span>
      <span style="font-size: 11px; font-weight: 700; font-family: monospace; color: #94a3b8;" id="cue-counter">-</span>
    </div>
    <div class="active-text" id="live-text">-</div>
    <div class="next-text" id="next-text">Berikutnya: -</div>
  </div>

  <div class="controls-wrap">
    <button class="btn-next" id="btn-next">
      <span>NEXT BARIS</span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/></svg>
    </button>

    <div class="action-grid">
      <button class="btn-sub btn-first" id="btn-first" title="Kembali ke Cue #1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" x2="5" y1="19" y2="5"/></svg>
        <span>AWAL</span>
      </button>

      <button class="btn-sub btn-back" id="btn-back">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" x2="5" y1="19" y2="5"/></svg>
        <span>PREV</span>
      </button>

      <button class="btn-sub" id="btn-replay">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        <span>REPLAY</span>
      </button>

      <button class="btn-sub btn-hide" id="btn-hide">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
        <span>HIDE</span>
      </button>
    </div>
  </div>

  <div class="bypass-section">
    <div class="bypass-header">
      <div class="bypass-title">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
        <span>DAFTAR CUE LAGU</span>
      </div>
      <input type="text" class="bypass-search" id="cue-search" placeholder="Filter lirik..." />
    </div>
    <div class="cues-list" id="cues-list">
      <!-- Daftar lirik lagu dimuat di sini -->
    </div>
  </div>

  <!-- Modal Sheet Pilih Lagu -->
  <div class="modal-backdrop" id="modal-songs" style="display: none;">
    <div class="modal-sheet">
      <div class="modal-header">
        <div class="modal-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          <span>PILIH LAGU DARI SETLIST</span>
          <span class="modal-count" id="songs-count">0 Lagu</span>
        </div>
        <button type="button" class="btn-close-modal" id="btn-close-songs" aria-label="Tutup">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      <div class="modal-search-wrap">
        <input type="text" class="modal-search-input" id="song-search-input" placeholder="Cari judul lagu atau artis..." />
      </div>
      <div class="songs-list" id="songs-list">
        <!-- Daftar lagu dimuat di sini -->
      </div>
    </div>
  </div>

  <script>
    let ws = null;
    let reconnectTimer = null;
    let currentCues = [];
    let currentSongs = [];
    let currentActiveSongId = null;
    let currentCueId = null;
    let isCurrentlyHidden = false;
    let lastRenderedSig = '';
    let lastRenderedSongsSig = '';
    let lastActiveCueIdForScroll = null;

    const statusBadge = document.getElementById('status-badge');
    const songTitleEl = document.getElementById('song-title');
    const btnOpenSongs = document.getElementById('btn-open-songs');
    const modalSongs = document.getElementById('modal-songs');
    const btnCloseSongs = document.getElementById('btn-close-songs');
    const songSearchInput = document.getElementById('song-search-input');
    const songsList = document.getElementById('songs-list');
    const songsCountEl = document.getElementById('songs-count');

    const previewBox = document.getElementById('preview-box');
    const phaseBadge = document.getElementById('phase-badge');
    const cueCounter = document.getElementById('cue-counter');
    const liveText = document.getElementById('live-text');
    const nextText = document.getElementById('next-text');
    const btnNext = document.getElementById('btn-next');
    const btnFirst = document.getElementById('btn-first');
    const btnBack = document.getElementById('btn-back');
    const btnHide = document.getElementById('btn-hide');
    const btnReplay = document.getElementById('btn-replay');
    const cuesList = document.getElementById('cues-list');
    const cueSearch = document.getElementById('cue-search');
    const ICON_EYE_OFF = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg><span>HIDE</span>';
    const ICON_EYE_SHOW = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg><span>SHOW</span>';

    function connectWs() {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return;
      }

      const loc = window.location;
      const wsUrl = (loc.protocol === 'https:' ? 'wss://' : 'ws://') + loc.host + '/ws/control';

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          statusBadge.textContent = 'ONLINE';
          statusBadge.className = 'status';
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleStateUpdate(data);
          } catch (e) {
            console.error('Error parse ws data:', e);
          }
        };

        ws.onclose = () => {
          statusBadge.textContent = 'OFFLINE';
          statusBadge.className = 'status offline';
          reconnectTimer = setTimeout(connectWs, 1500);
        };

        ws.onerror = () => {
          statusBadge.textContent = 'OFFLINE';
          statusBadge.className = 'status offline';
        };
      } catch (err) {
        statusBadge.textContent = 'OFFLINE';
        statusBadge.className = 'status offline';
        reconnectTimer = setTimeout(connectWs, 2000);
      }
    }

    // Auto-reconnect saat layar HP menyala kembali
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        connectWs();
      }
    });
    window.addEventListener('focus', () => {
      connectWs();
    });

    function handleStateUpdate(data) {
      if (data.songTitle) {
        songTitleEl.textContent = data.songTitle;
      }

      if (data.songs && Array.isArray(data.songs)) {
        currentSongs = data.songs;
      }

      if (data.activeSongId !== undefined) {
        currentActiveSongId = data.activeSongId;
      }

      if (data.cues && Array.isArray(data.cues)) {
        currentCues = data.cues;
      }

      isCurrentlyHidden = Boolean(data.isHidden);
      currentCueId = data.currentCueId || data.liveCueId || null;

      // Update Preview Box State
      if (isCurrentlyHidden) {
        previewBox.className = 'preview-box is-hidden';
        phaseBadge.textContent = 'TERSEMBUNYI (HIDDEN)';
        phaseBadge.className = 'badge-phase badge-hidden';
        liveText.className = 'active-text hidden-mode';
        liveText.textContent = data.activeText || '(Lirik Tersembunyi)';

        btnHide.className = 'btn-sub btn-show';
        btnHide.innerHTML = ICON_EYE_SHOW;
      } else if (data.phase && data.phase !== 'Ready') {
        previewBox.className = 'preview-box is-live';
        phaseBadge.textContent = 'LIVE DI RESOLUME';
        phaseBadge.className = 'badge-phase badge-live';
        liveText.className = 'active-text';
        liveText.textContent = data.activeText || '(Blank)';

        btnHide.className = 'btn-sub btn-hide';
        btnHide.innerHTML = ICON_EYE_OFF;
      } else {
        previewBox.className = 'preview-box is-ready';
        phaseBadge.textContent = 'STANDBY';
        phaseBadge.className = 'badge-phase badge-ready';
        liveText.className = 'active-text';
        liveText.textContent = '(Belum ada lirik live)';

        btnHide.className = 'btn-sub btn-hide';
        btnHide.innerHTML = ICON_EYE_OFF;
      }

      nextText.textContent = data.nextText ? 'Next: ' + data.nextText : 'Next: (Akhir Lagu)';

      // Counter
      if (currentCues.length > 0 && currentCueId) {
        const idx = currentCues.findIndex(c => c.id === currentCueId);
        if (idx >= 0) {
          cueCounter.textContent = '#' + (idx + 1) + ' dari ' + currentCues.length;
        } else {
          cueCounter.textContent = currentCues.length + ' baris';
        }
      } else if (currentCues.length > 0) {
        cueCounter.textContent = currentCues.length + ' baris';
      }

      renderCuesList();
      if (modalSongs && modalSongs.classList.contains('open')) {
        renderSongsList();
      }
    }

    function toggleHide() {
      if (isCurrentlyHidden) {
        sendCmd('RESTORE');
      } else {
        sendCmd('BLANK', { immediate: false });
      }
    }

    function renderCuesList() {
      const query = (cueSearch.value || '').toLowerCase().trim();
      const sig = currentCues.map(c => c.id).join(',') + '|' + query;

      if (sig !== lastRenderedSig) {
        lastRenderedSig = sig;
        let html = '';

        currentCues.forEach((cue, idx) => {
          const text = cue.text || (cue.isBlankCue ? '[Jeda Instrumental]' : '(Baris Kosong)');
          if (query && !text.toLowerCase().includes(query) && !(cue.section || '').toLowerCase().includes(query)) {
            return;
          }

          html += '<div class="cue-item" data-cue-id="' + cue.id + '" id="cue-item-' + cue.id + '">' +
            '<div class="cue-num">#' + (idx + 1) + '</div>' +
            '<div class="cue-sec">' + escapeHtml(cue.section || 'Verse') + '</div>' +
            '<div class="cue-text">' + escapeHtml(text) + '</div>' +
            '<div class="cue-badge" style="display:none">LIVE</div>' +
          '</div>';
        });

        if (!html) {
          html = '<div style="padding: 16px; text-align: center; color: #64748b; font-size: 12px;">Tidak ada lirik yang cocok.</div>';
        }

        cuesList.innerHTML = html;
      }

      // Update active state di elemen DOM yang sudah ada
      const allItems = cuesList.querySelectorAll('.cue-item');
      let activeElem = null;
      allItems.forEach((el) => {
        const id = el.getAttribute('data-cue-id');
        const isActive = id === currentCueId;
        const badge = el.querySelector('.cue-badge');
        if (isActive) {
          activeElem = el;
          el.className = 'cue-item active' + (isCurrentlyHidden ? ' hidden-state' : '');
          if (badge) {
            badge.style.display = 'block';
            badge.textContent = isCurrentlyHidden ? 'HIDDEN' : 'LIVE';
          }
        } else {
          el.className = 'cue-item';
          if (badge) badge.style.display = 'none';
        }
      });

      // Hanya auto-scroll jika currentCueId berubah agar tidak mengganggu scrolling manual user
      if (activeElem && currentCueId !== lastActiveCueIdForScroll) {
        lastActiveCueIdForScroll = currentCueId;
        activeElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    function renderSongsList() {
      if (!songsList) return;
      const query = (songSearchInput ? songSearchInput.value : '').toLowerCase().trim();
      if (songsCountEl) songsCountEl.textContent = currentSongs.length + ' Lagu';

      let filtered = currentSongs;
      if (query) {
        filtered = currentSongs.filter(s => 
          (s.title || '').toLowerCase().includes(query) ||
          (s.artist || '').toLowerCase().includes(query)
        );
      }

      if (filtered.length === 0) {
        songsList.innerHTML = '<div style="padding: 24px 16px; text-align: center; color: #64748b; font-size: 13px;">Tidak ada lagu yang cocok.</div>';
        return;
      }

      let html = '';
      filtered.forEach((song, idx) => {
        const isActive = song.id === currentActiveSongId;
        html += '<div class="song-card' + (isActive ? ' active-song' : '') + '" data-song-id="' + song.id + '">' +
          '<div class="song-card-num">#' + (idx + 1) + '</div>' +
          '<div class="song-card-info">' +
            '<div class="song-card-title">' + escapeHtml(song.title) + '</div>' +
            '<div class="song-card-meta">' + (song.cueCount || 0) + ' baris lirik' + (song.artist ? ' • ' + escapeHtml(song.artist) : '') + '</div>' +
          '</div>' +
          (isActive ? '<span class="badge-active-song">AKTIF</span>' : '<span class="song-select-arrow">Pilih ▶</span>') +
        '</div>';
      });

      songsList.innerHTML = html;
    }

    function openSongModal() {
      if (!modalSongs) return;
      modalSongs.style.display = 'flex';
      requestAnimationFrame(() => {
        modalSongs.classList.add('open');
      });
      if (songSearchInput) songSearchInput.value = '';
      renderSongsList();
      setTimeout(() => {
        if (songSearchInput) songSearchInput.focus();
      }, 100);
    }

    function closeSongModal() {
      if (!modalSongs) return;
      modalSongs.classList.remove('open');
      setTimeout(() => {
        modalSongs.style.display = 'none';
      }, 220);
    }

    if (btnOpenSongs) {
      btnOpenSongs.addEventListener('click', openSongModal);
    }
    if (btnCloseSongs) {
      btnCloseSongs.addEventListener('click', closeSongModal);
    }
    if (modalSongs) {
      modalSongs.addEventListener('click', (e) => {
        if (e.target === modalSongs) {
          closeSongModal();
        }
      });
    }
    if (songSearchInput) {
      songSearchInput.addEventListener('input', () => {
        renderSongsList();
      });
    }

    if (cueSearch) {
      cueSearch.addEventListener('input', () => {
        renderCuesList();
      });
    }

    /**
     * Helper Event Delegation Scroll-Safe untuk Touch Screen (HP/Tablet).
     * Mencegah aktivasi lirik / lagu saat pengguna sedang menggeser atau menggulung layar.
     * Hanya dieksekusi bila murni diklik / ditap cepat di satu titik tanpa pergeseran.
     */
    function bindScrollSafeList(listElem, itemSelector, dataAttr, pressedClass, onSelect) {
      if (!listElem) return;
      let startX = 0;
      let startY = 0;
      let startScrollTop = 0;
      let startTime = 0;
      let isScrolling = false;
      let lastScrollTime = 0;
      let currentTarget = null;
      let touchActive = false;

      // Pantau scroll container secara realtime (termasuk momentum scrolling)
      listElem.addEventListener('scroll', () => {
        lastScrollTime = Date.now();
        isScrolling = true;
      }, { passive: true });

      // Event Touch: Mendeteksi gestur sentuh HP/Tablet
      listElem.addEventListener('touchstart', (e) => {
        touchActive = true;
        const item = e.target.closest(itemSelector);
        if (!item || e.touches.length !== 1) {
          currentTarget = null;
          return;
        }
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startScrollTop = listElem.scrollTop;
        startTime = Date.now();
        isScrolling = false;
        currentTarget = item;
      }, { passive: true });

      listElem.addEventListener('touchmove', (e) => {
        if (!currentTarget || e.touches.length !== 1) return;
        const dx = Math.abs(e.touches[0].clientX - startX);
        const dy = Math.abs(e.touches[0].clientY - startY);
        // Jika jari bergeser > 6px, pengguna sedang menggulung (scroll/swipe)
        if (dx > 6 || dy > 6) {
          isScrolling = true;
          currentTarget = null;
        }
      }, { passive: true });

      listElem.addEventListener('touchend', (e) => {
        if (!currentTarget) return;
        const target = currentTarget;
        currentTarget = null;

        const duration = Date.now() - startTime;
        const scrollDelta = Math.abs(listElem.scrollTop - startScrollTop);
        const timeSinceLastScroll = Date.now() - lastScrollTime;

        // JIKA sedang scroll, atau posisi scroll bergeser, atau list baru saja selesai scroll (< 250ms),
        // atau tap ditahan terlalu lama (> 450ms) -> INI GESTUR SCROLL, JANGAN AKTIFKAN!
        if (isScrolling || scrollDelta > 2 || timeSinceLastScroll < 250 || duration > 450) {
          return;
        }

        const val = target.getAttribute(dataAttr);
        if (val) {
          if (e.cancelable) e.preventDefault();
          if (pressedClass) {
            target.classList.add(pressedClass);
            setTimeout(() => target.classList.remove(pressedClass), 160);
          }
          onSelect(val, target);
        }
      });

      listElem.addEventListener('touchcancel', () => {
        currentTarget = null;
        isScrolling = false;
      }, { passive: true });

      // Fallback Mouse Click untuk testing pada browser Desktop
      listElem.addEventListener('click', (e) => {
        if (touchActive && Date.now() - startTime < 600) return;
        if (Date.now() - lastScrollTime < 250) return;
        const item = e.target.closest(itemSelector);
        if (!item) return;
        const val = item.getAttribute(dataAttr);
        if (val) {
          onSelect(val, item);
        }
      });
    }

    // Binding scroll-safe untuk list cue (mencegah aktif saat discroll)
    bindScrollSafeList(cuesList, '.cue-item', 'data-cue-id', 'cue-pressed', (cueId) => {
      if (navigator.vibrate) navigator.vibrate(35);
      sendCmd('GO_CUE', { cueId: cueId });
    });

    // Binding scroll-safe untuk list lagu
    bindScrollSafeList(songsList, '.song-card', 'data-song-id', 'song-pressed', (songId) => {
      if (navigator.vibrate) navigator.vibrate(35);
      sendCmd('SELECT_SONG', { songId: songId });
      closeSongModal();
    });

    // Helper untuk binding tombol kontrol instan tanpa delay sentuhan
    function bindTouchButton(btn, onTrigger) {
      if (!btn) return;
      let lastTrigger = 0;

      const trigger = (e) => {
        if (e && e.cancelable) e.preventDefault();
        const now = Date.now();
        if (now - lastTrigger < 180) return;
        lastTrigger = now;

        btn.classList.add('btn-pressed');
        setTimeout(() => btn.classList.remove('btn-pressed'), 120);

        if (navigator.vibrate) navigator.vibrate(25);
        onTrigger();
      };

      btn.addEventListener('pointerdown', trigger, { passive: false });
      btn.addEventListener('click', trigger);
    }

    bindTouchButton(btnNext, () => sendCmd('NEXT'));
    bindTouchButton(btnFirst, () => {
      if (currentCues && currentCues.length > 0) {
        sendCmd('GO_CUE', { cueId: currentCues[0].id });
      }
    });
    bindTouchButton(btnBack, () => sendCmd('PREVIOUS'));
    bindTouchButton(btnHide, () => toggleHide());
    bindTouchButton(btnReplay, () => sendCmd('REPLAY'));

    function sendCmd(action, payload) {
      const cmd = {
        type: 'command',
        id: 'mob-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        action: action,
        payload: payload || {}
      };

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(cmd));
      } else {
        // Fallback HTTP POST jika WebSocket reconnecting / terputus
        fetch('/api/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cmd)
        }).catch((err) => console.error('HTTP cmd fallback error:', err));

        if (!ws || ws.readyState === WebSocket.CLOSED) {
          connectWs();
        }
      }
    }

    function escapeHtml(str) {
      return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    connectWs();
  </script>
</body>
</html>`;
  }
}
