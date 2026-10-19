import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { RemoteServer } from './apps/desktop/remoteServer';

function luilyricRemotePlugin(): Plugin {
  let remoteServer: RemoteServer | null = null;
  const pendingCommands: any[] = [];

  return {
    name: 'luilyric-remote-server',
    configureServer(server) {
      if (!remoteServer) {
        remoteServer = new RemoteServer({
          onCommand: (cmd) => {
            pendingCommands.push(cmd);
          },
        });
        remoteServer.start().catch((err) => {
          console.warn('[Vite RemoteServer] Gagal memulai remote server:', err);
        });
      }

      server.httpServer?.once('close', () => {
        if (remoteServer) {
          remoteServer.stop();
          remoteServer = null;
        }
      });

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/__luilyric/')) {
          return next();
        }

        const urlObj = new URL(req.url, 'http://localhost');

        if (urlObj.pathname === '/__luilyric/pairing-info' && req.method === 'GET') {
          try {
            const targetIp = urlObj.searchParams.get('ip') || undefined;
            const info = remoteServer
              ? await remoteServer.getPairingInfo(targetIp)
              : null;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(info));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err) }));
          }
          return;
        }

        if (urlObj.pathname === '/__luilyric/poll-commands' && req.method === 'GET') {
          const cmds = pendingCommands.splice(0, pendingCommands.length);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ commands: cmds }));
          return;
        }

        if (urlObj.pathname === '/__luilyric/broadcast-state' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              if (remoteServer) {
                remoteServer.broadcastState(
                  data.state,
                  data.activeText || '',
                  data.nextText || '',
                  data.cues,
                  data.songTitle,
                  data.songsList,
                  data.activeSongId
                );
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), luilyricRemotePlugin()],
  server: {
    port: 5173,
    host: true,
  },
});

