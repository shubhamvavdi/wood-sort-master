import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // static-host friendly (Vercel, Netlify, Cloudflare Pages, game portals, file://)
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
