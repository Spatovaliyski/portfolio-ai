import { readFile, readdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';

type Chunk = { file: string; imports?: string[]; css?: string[] };
const manifest = JSON.parse(await readFile('dist/client/.vite/manifest.json', 'utf8')) as Record<
  string,
  Chunk
>;
const seen = new Set<string>();
const js = new Set<string>();
const css = new Set<string>();

function visit(key: string) {
  if (seen.has(key)) return;
  seen.add(key);
  const chunk = manifest[key];

  if (!chunk) throw new Error('Missing chunk');
  js.add(chunk.file);
  chunk.css?.forEach((file) => css.add(file));
  chunk.imports?.forEach(visit);
}
visit('index.html');
let jsBytes = 0;
let cssBytes = 0;

for (const path of js) {
  const content = await readFile(resolve('dist/client', path));

  jsBytes += gzipSync(content).length;
  if (
    /supabase\.co|sb_publishable_|Portfolio editor|Authenticator verification/.test(
      content.toString(),
    )
  )
    throw new Error('Public JavaScript includes protected-editor dependencies or config');
}
for (const path of css) cssBytes += gzipSync(await readFile(resolve('dist/client', path))).length;
if (jsBytes > 120 * 1024 || cssBytes > 35 * 1024)
  throw new Error('Public transfer budget exceeded');

async function scan(directory: string) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);

    if (entry.isDirectory()) await scan(path);
    else if (/\.(js|html|json)$/.test(entry.name)) {
      const content = await readFile(path, 'utf8');

      if (/sb_secret_[a-zA-Z0-9_-]{20,}/.test(content))
        throw new Error('Privileged credential in build');
      for (const candidate of content.matchAll(
        /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
      )) {
        try {
          if (
            JSON.parse(Buffer.from(candidate[0].split('.')[1], 'base64url').toString()).role ===
            'service_role'
          )
            throw new Error('Privileged JWT in build');
        } catch (error) {
          if ((error as Error).message === 'Privileged JWT in build') throw error;
        }
      }
    }
  }
}
await scan('dist/client');
const report = {
  publicJavaScriptGzip: jsBytes,
  publicCssGzip: cssBytes,
  publicImports: [...js],
  credentialsScan: 'passed',
};

await writeFile('dist/build-proof.json', JSON.stringify(report, null, 2));
console.log(
  `Public JS ${(jsBytes / 1024).toFixed(1)} KiB gzip; CSS ${(cssBytes / 1024).toFixed(1)} KiB gzip; credential and boundary scan passed.`,
);
