import { build } from 'vite';
import { cp, mkdir, readFile } from 'node:fs/promises';
import react from '@vitejs/plugin-react';

const { vars } = JSON.parse(await readFile('wrangler.json', 'utf8'));

process.env.VITE_SUPABASE_URL ??= vars.SUPABASE_URL;
process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??= vars.SUPABASE_PUBLISHABLE_KEY;

await build({ publicDir: false, build: { outDir: 'dist/client', emptyOutDir: true } });
await build({
  configFile: false,
  plugins: [react()],
  publicDir: false,
  build: {
    ssr: true,
    outDir: 'dist/server',
    rollupOptions: { input: { index: 'src/server/index.ts', renderer: 'src/entry-server.tsx' } },
    emptyOutDir: true,
  },
});
await mkdir('dist/client', { recursive: true });
await cp('public/social-preview.svg', 'dist/client/social-preview.svg');
console.log(
  'Built browser and server code. Content and media are loaded from Supabase at runtime.',
);

await cp('src/worker/fonts/Manrope.ttf', 'dist/client/assets/social-font.ttf');
await build({
  configFile: false,
  plugins: [react()],
  publicDir: false,
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  ssr: {
    resolve: { conditions: ['workerd', 'module', 'production'] },
    noExternal: true,
    external: ['cloudflare:node', 'cloudflare:workers', '@resvg/resvg-wasm/index_bg.wasm'],
  },
  build: {
    ssr: true,
    target: 'esnext',
    outDir: 'dist/worker',
    rollupOptions: {
      input: { index: 'src/worker/index.ts' },
      external: ['cloudflare:node', 'cloudflare:workers', '@resvg/resvg-wasm/index_bg.wasm'],
    },
    emptyOutDir: true,
  },
});
