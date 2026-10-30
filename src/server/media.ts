import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Entity } from '../domain/schema.ts';
import { checked, HttpError } from './store.ts';

export interface ImageProcessor {
  inspect(bytes: Buffer): Promise<{ mime: string; width: number; height: number }>;
  webp(bytes: Buffer, width: number): Promise<Buffer>;
}

export async function processMedia(
  images: ImageProcessor,
  bytes: Buffer,
  mime: string,
  id = `media-${randomUUID()}`,
): Promise<{
  entity: Entity;
  originals: { path: string; bytes: Buffer; mime: string };
  derivatives: Array<{ path: string; bytes: Buffer; mime: string }>;
}> {
  if (!bytes.length || bytes.length > 20 * 1024 * 1024)
    throw new HttpError(400, 'Upload a file up to 20 MiB.');
  const extension = (
    {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
      'image/avif': 'avif',
      'application/pdf': 'pdf',
    } as Record<string, string>
  )[mime];

  if (!extension) throw new HttpError(400, 'Use a PNG, JPEG, WebP, AVIF, or PDF.');
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 24);
  const derivatives: Array<{ path: string; bytes: Buffer; mime: string }> = [];
  let width: number | null = null,
    height: number | null = null;
  let publicPath: string;
  const variants: Array<{ width: number; path: string }> = [];

  if (mime === 'application/pdf') {
    if (bytes.subarray(0, 5).toString() !== '%PDF-') throw new HttpError(400, 'Invalid PDF.');
    publicPath = `/media/${hash}.pdf`;
    derivatives.push({ path: `${hash}.pdf`, bytes, mime });
  } else {
    const info = await images.inspect(bytes).catch(() => {
      throw new HttpError(400, 'The image is invalid or exceeds 40 million pixels.');
    });

    if (info.mime !== mime || !info.width || !info.height || info.width * info.height > 40000000)
      throw new HttpError(
        400,
        'The file does not match its image type or exceeds 40 million pixels.',
      );
    width = info.width;
    height = info.height;
    for (const size of [...new Set([400, 800, 1200].map((w) => Math.min(w, width!)))]) {
      const buffer = await images.webp(bytes, size);
      const path = `${createHash('sha256').update(buffer).digest('hex').slice(0, 24)}-${size}.webp`;

      derivatives.push({ path, bytes: buffer, mime: 'image/webp' });
      variants.push({ width: size, path: `/media/${path}` });
    }
    publicPath = variants.at(-1)!.path;
  }
  const path = `${id}/original.${extension}`;

  return {
    entity: {
      id,
      kind: 'media',
      status: 'published',
      sortOrder: 0,
      data: {
        path,
        mime,
        bytes: bytes.length,
        width,
        height,
        publicPath,
        ...(variants.length ? { variants } : {}),
        alt: '',
        caption: '',
        sourceUrl: null,
        rights: 'Owner-provided portfolio material.',
      },
    },
    originals: { path, bytes, mime },
    derivatives,
  };
}

export async function storeMedia(
  client: SupabaseClient,
  bucket: string,
  files: Array<{ path: string; bytes: Buffer; mime: string }>,
) {
  for (const file of files) {
    const existing = await client.storage.from(bucket).download(file.path);

    if (existing.data) {
      if (!Buffer.from(await existing.data.arrayBuffer()).equals(file.bytes))
        throw new Error(`Immutable media collision: ${file.path}`);
      continue;
    }
    checked(
      await client.storage.from(bucket).upload(file.path, file.bytes, {
        contentType: file.mime,
        cacheControl: '31536000',
        upsert: false,
      }),
    );
  }
}
