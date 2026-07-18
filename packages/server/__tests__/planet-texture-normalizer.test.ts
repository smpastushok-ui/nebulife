import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import {
  measureHorizontalSeam,
  normalizePlanetTexture,
  PLANET_TEXTURE_HEIGHT,
  PLANET_TEXTURE_WIDTH,
} from '../src/planet-texture-normalizer.js';

async function makeSquareSource(): Promise<Buffer> {
  const width = 512;
  const height = 512;
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 3;
      pixels[index] = Math.round((x / (width - 1)) * 255);
      pixels[index + 1] = Math.round((y / (height - 1)) * 255);
      pixels[index + 2] = (x * 17 + y * 29) % 256;
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

describe('normalizePlanetTexture', () => {
  it('center-crops a square source to an exact 2:1 texture without stretching', async () => {
    const result = await normalizePlanetTexture(await makeSquareSource());
    const metadata = await sharp(result.buffer).metadata();

    expect(metadata.width).toBe(PLANET_TEXTURE_WIDTH);
    expect(metadata.height).toBe(PLANET_TEXTURE_HEIGHT);
    expect(result.sourceWidth).toBe(512);
    expect(result.sourceHeight).toBe(512);
  });

  it('keeps the horizontal wrap edge continuous', async () => {
    const result = await normalizePlanetTexture(await makeSquareSource());
    const decoded = await sharp(result.buffer)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const seam = measureHorizontalSeam(
      decoded.data,
      decoded.info.width,
      decoded.info.height,
      decoded.info.channels,
    );

    expect(result.seamMeanAbsoluteError).toBeLessThan(0.02);
    expect(seam).toBeLessThan(0.025);
  });

  it('is byte-for-byte deterministic for identical input', async () => {
    const source = await makeSquareSource();
    const first = await normalizePlanetTexture(source);
    const second = await normalizePlanetTexture(source);

    expect(first.buffer.equals(second.buffer)).toBe(true);
    expect(first.seamMeanAbsoluteError).toBe(second.seamMeanAbsoluteError);
  });

  it('rejects invalid image input so callers can keep the procedural fallback', async () => {
    await expect(normalizePlanetTexture(Buffer.from('not an image'))).rejects.toThrow();
  });
});
