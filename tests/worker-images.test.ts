import { afterAll, beforeAll, expect, it } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import type { ImagesBinding } from '@cloudflare/workers-types';
import sharp from 'sharp';
import { imageProcessor } from '../src/worker/images.ts';
import { processMedia } from '../src/server/media.ts';

let platform: Awaited<ReturnType<typeof getPlatformProxy<{ IMAGES: ImagesBinding }>>>;

beforeAll(async () => {
  platform = await getPlatformProxy<{ IMAGES: ImagesBinding }>({ persist: false });
});
afterAll(async () => {
  await platform?.dispose();
});

it('preserves displayed dimensions and responsive widths for rotated phone photos', async () => {
  const bytes = await sharp({
    create: { width: 1600, height: 900, channels: 3, background: 'red' },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const images = imageProcessor(platform.env.IMAGES as ImagesBinding);
  const media = await processMedia(images, bytes, 'image/jpeg');

  expect(media.entity.data).toMatchObject({ width: 900, height: 1600 });
  expect(media.entity.data).toMatchObject({
    variants: [{ width: 400 }, { width: 800 }, { width: 900 }],
  });
  for (const [index, derivative] of media.derivatives.entries()) {
    const info = await sharp(derivative.bytes).metadata();

    expect(info.format).toBe('webp');
    expect(info.width).toBe([400, 800, 900][index]);
  }
  await expect(processMedia(images, bytes, 'image/png')).rejects.toThrow('image type');
});

it('rejects oversized images before transformation', async () => {
  const images = imageProcessor({
    info: async () => ({ format: 'image/png', fileSize: 100, width: 10000, height: 10000 }),
    input: () => {
      throw new Error('must not transform an oversized image');
    },
  } as unknown as ImagesBinding);

  await expect(processMedia(images, Buffer.from('image'), 'image/png')).rejects.toThrow(
    '40 million pixels',
  );
});
