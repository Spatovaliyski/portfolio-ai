import type { Entity } from '../domain/schema.ts';
import { supabase } from './api.ts';

export async function uploadOriginal(file: File): Promise<Entity> {
  const supported = new Set([
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/avif',
    'application/pdf',
  ]);

  if (!supported.has(file.type) || file.size > 20 * 1024 * 1024)
    throw new Error('Upload a PNG, JPEG, WebP, AVIF, or PDF up to 20 MiB.');

  let width: number | null = null,
    height: number | null = null;

  if (file.type.startsWith('image/')) {
    const bitmap = await createImageBitmap(file);

    width = bitmap.width;
    height = bitmap.height;
    bitmap.close();
    if (width * height > 40000000) throw new Error('Image dimensions exceed 40 million pixels.');
  } else if ((await file.slice(0, 5).text()) !== '%PDF-') throw new Error('Invalid PDF signature.');

  const extension = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1];
  const id = `media-${crypto.randomUUID()}`;
  const path = `${id}/original.${extension}`;
  const { error } = await supabase.storage
    .from('portfolio-originals')
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) throw error;

  return {
    id,
    kind: 'media',
    status: 'draft',
    sortOrder: 0,
    data: {
      path,
      mime: file.type,
      bytes: file.size,
      width,
      height,
      alt: '',
      caption: '',
      sourceUrl: null,
      rights: 'Owner upload; confirm publication rights.',
    },
  };
}
