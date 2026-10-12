import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { machine } from './machine.ts';
import { contentSchema } from '../src/domain/schema.ts';

const releaseId = process.env.PORTFOLIO_RELEASE_ID;

if (!releaseId) throw new Error('PORTFOLIO_RELEASE_ID required');
const release = await machine<{
  content: unknown;
  media: Array<{ path: string; signedUrl: string; error: string | null }>;
  desiredReleaseId: string;
}>({ action: 'release', releaseId });

if (release.desiredReleaseId !== releaseId)
  throw new Error('Superseded release: activation is forbidden');
const content = contentSchema.parse(release.content);

for (const item of release.media) {
  if (item.error) throw new Error(item.error);
  if (!/^(?!.*\.\.)[a-zA-Z0-9/_-]+\.(png|jpg|jpeg|webp|avif|pdf)$/i.test(item.path))
    throw new Error('Invalid media path');
  const url = new URL(item.signedUrl);

  if (url.origin !== 'https://lmxukzcvxhpbwtgsbrai.supabase.co')
    throw new Error('Unexpected signed-media host');
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });

  if (!response.ok) throw new Error('Private media retrieval failed');
  const bytes = new Uint8Array(await response.arrayBuffer());

  if (bytes.byteLength > 20 * 1024 * 1024) throw new Error('Media exceeds limit');
  const path = resolve('public/media', item.path);

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
}
await writeFile('release-input.json', JSON.stringify(content));
await machine({
  action: 'report',
  releaseId,
  buildId: process.env.GITHUB_SHA ?? 'local',
  state: 'building',
});
console.log(
  `Retrieved approved release ${releaseId} and ${release.media.length} private originals.`,
);
