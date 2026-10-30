import sharp from 'sharp';
import { processMedia as prepareMedia, type ImageProcessor } from './media.ts';

const images: ImageProcessor = {
  async inspect(bytes) {
    const info = await sharp(bytes, { limitInputPixels: 40000000 }).metadata();
    const rotated = info.orientation && info.orientation >= 5;
    const mime = (
      {
        png: 'image/png',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        heif: 'image/avif',
        avif: 'image/avif',
      } as Record<string, string>
    )[info.format ?? ''];

    return {
      mime: mime ?? '',
      width: (rotated ? info.height : info.width) ?? 0,
      height: (rotated ? info.width : info.height) ?? 0,
    };
  },
  async webp(bytes, width) {
    return sharp(bytes, { limitInputPixels: 40000000 })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  },
};

export const processMedia = (bytes: Buffer, mime: string, id?: string) =>
  prepareMedia(images, bytes, mime, id);
