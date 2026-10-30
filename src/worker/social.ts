import { initWasm, Resvg } from '@resvg/resvg-wasm';
import wasm from '@resvg/resvg-wasm/index_bg.wasm';
import { socialPreviewSvg } from '../server/social.ts';

let ready: Promise<void> | undefined;

export async function renderSocialPreview(title: string, font: Uint8Array): Promise<Buffer> {
  ready ??= initWasm(wasm);
  await ready;
  const renderer = new Resvg(socialPreviewSvg(title), {
    font: { fontBuffers: [font], defaultFontFamily: 'Manrope', sansSerifFamily: 'Manrope' },
  });

  try {
    const image = renderer.render();

    try {
      return Buffer.from(image.asPng());
    } finally {
      image.free();
    }
  } finally {
    renderer.free();
  }
}
