import { createReadStream, createWriteStream, mkdirSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/** Trailer recordings land next to the repo (D:\Adil\recordings), never inside it. */
const RECORDINGS_DIR = resolve(fileURLToPath(new URL('.', import.meta.url)), '../recordings');

/**
 * Dev-server only: POST /__qa/recordings/<name> saves an uploaded video to
 * RECORDINGS_DIR; GET serves it back for checking. Used by the trailer
 * recorder in src/dev. Not part of the production build.
 */
function recordingsPlugin(): Plugin {
  return {
    name: 'ssos-recordings',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__qa/recordings', (req, res) => {
        const name = basename(decodeURIComponent((req.url ?? '/').split('?')[0]!.slice(1))).replace(/[^\w.-]/g, '');
        if (!name) {
          res.statusCode = 400;
          res.end('missing file name');
          return;
        }
        const file = resolve(RECORDINGS_DIR, name);
        if (req.method === 'POST') {
          mkdirSync(RECORDINGS_DIR, { recursive: true });
          const out = createWriteStream(file);
          req.pipe(out);
          out.on('finish', () => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ saved: file, bytes: statSync(file).size }));
          });
          out.on('error', (e) => {
            res.statusCode = 500;
            res.end(String(e));
          });
          return;
        }
        if (req.method === 'GET') {
          try {
            const { size } = statSync(file);
            res.setHeader('Content-Type', name.endsWith('.mp4') ? 'video/mp4' : 'video/webm');
            res.setHeader('Content-Length', String(size));
            createReadStream(file).pipe(res);
          } catch {
            res.statusCode = 404;
            res.end();
          }
          return;
        }
        res.statusCode = 405;
        res.end();
      });
    },
  };
}

// Relative base so the production build works from any static host path
// (GitHub Pages sub-folder, Netlify, Vercel) without rebuilding.
export default defineConfig({
  base: './',
  plugins: [recordingsPlugin()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    // Phaser alone is ~1.2 MB minified; keep it in its own cached chunk.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
