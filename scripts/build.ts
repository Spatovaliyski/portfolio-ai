import { build } from 'vite';
import { cp, mkdir } from 'node:fs/promises';
import react from '@vitejs/plugin-react';

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
