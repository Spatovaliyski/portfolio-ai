import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import sharp from 'sharp';
import { createHandler as runtimeHandler } from './http.ts';
import { processMedia } from './node-media.ts';
import { socialPreviewSvg } from './social.ts';

export function createHandler(
  store: Parameters<typeof runtimeHandler>[0],
  render: Parameters<typeof runtimeHandler>[1],
  root = resolve('dist/client'),
  getTemplate = () => readFile(resolve(root, 'index.html'), 'utf8'),
) {
  return runtimeHandler(store, render, {
    template: getTemplate,
    async asset(path) {
      const file = resolve(root, '.' + path);

      if (!file.startsWith(root + sep)) throw new Error('Invalid asset path.');

      return readFile(file);
    },
    processMedia,
    async socialPreview(title) {
      return sharp(Buffer.from(socialPreviewSvg(title)))
        .png()
        .toBuffer();
    },
  });
}
