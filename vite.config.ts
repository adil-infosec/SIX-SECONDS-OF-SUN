import { defineConfig } from 'vitest/config';

// Relative base so the production build works from any static host path
// (GitHub Pages sub-folder, Netlify, Vercel) without rebuilding.
export default defineConfig({
  base: './',
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
