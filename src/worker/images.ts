import type { ImagesBinding } from '@cloudflare/workers-types';
import type { ImageProcessor } from '../server/media.ts';
import { HttpError } from '../server/store.ts';

const stream = (bytes: Buffer) =>
  new Blob([new Uint8Array(bytes)]).stream() as unknown as Parameters<ImagesBinding['input']>[0];

export function imageProcessor(binding: ImagesBinding): ImageProcessor {
  return {
    async inspect(bytes) {
      const info = await binding.info(stream(bytes));

      if (!('width' in info) || info.width * info.height > 40000000)
        throw new HttpError(400, 'Use a raster image up to 40 million pixels.');

      // info() reports stored dimensions, while transformations apply EXIF
      // orientation. Inspect a normalized stream so variants describe the
      // displayed image, including phone photos rotated by EXIF metadata.
      const normalized = await binding.input(stream(bytes)).output({ format: 'image/webp' });
      const dimensions = await binding.info(normalized.image());

      if (!('width' in dimensions)) throw new HttpError(400, 'Invalid image.');

      return { mime: info.format, width: dimensions.width, height: dimensions.height };
    },
    async webp(bytes, width) {
      const output = await binding
        .input(stream(bytes))
        .transform({ width, fit: 'scale-down' })
        .output({ format: 'image/webp', quality: 80, anim: false });

      return Buffer.from(await output.response().arrayBuffer());
    },
  };
}
