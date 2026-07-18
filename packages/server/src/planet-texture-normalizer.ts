import sharp from 'sharp';

export const PLANET_TEXTURE_WIDTH = 2048;
export const PLANET_TEXTURE_HEIGHT = 1024;
export const PLANET_TEXTURE_VERSION = 'v2';

const MAX_INPUT_PIXELS = 40_000_000;
const SEAM_FEATHER_RADIUS = 32;

export interface PlanetTextureNormalizationResult {
  buffer: Buffer;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  seamMeanAbsoluteError: number;
}

function smoothstep(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

/**
 * Softens the source's non-periodic left/right join, then rotates longitude
 * by 180 degrees. The final texture boundary therefore falls between adjacent
 * source columns, while the repaired join sits inside the map as a narrow,
 * feathered region instead of a hard UV seam.
 */
function makeHorizontallyPeriodic(
  input: ArrayLike<number>,
  width: number,
  height: number,
  channels: number,
): Uint8Array {
  const repaired = new Uint8Array(input.length);
  for (let index = 0; index < input.length; index++) repaired[index] = input[index];
  const radius = Math.min(SEAM_FEATHER_RADIUS, Math.floor(width / 8));

  for (let y = 0; y < height; y++) {
    const rowStart = y * width * channels;
    for (let x = 0; x < width; x++) {
      const distanceToSeam = Math.min(x, width - 1 - x);
      if (distanceToSeam >= radius) continue;

      const strength = smoothstep((radius - distanceToSeam) / radius);
      for (let channel = 0; channel < Math.min(channels, 3); channel++) {
        let sum = 0;
        let samples = 0;
        for (let offset = -radius; offset <= radius; offset++) {
          const sampleX = (x + offset + width) % width;
          sum += input[rowStart + sampleX * channels + channel];
          samples++;
        }
        const index = rowStart + x * channels + channel;
        repaired[index] = Math.round(input[index] * (1 - strength) + (sum / samples) * strength);
      }
    }
  }

  const rolled = new Uint8Array(repaired.length);
  const longitudeOffset = Math.floor(width / 2);
  for (let y = 0; y < height; y++) {
    const rowStart = y * width * channels;
    for (let x = 0; x < width; x++) {
      const sourceX = (x + longitudeOffset) % width;
      const sourceIndex = rowStart + sourceX * channels;
      const targetIndex = rowStart + x * channels;
      for (let channel = 0; channel < channels; channel++) {
        rolled[targetIndex + channel] = repaired[sourceIndex + channel];
      }
    }
  }

  // Keep several paired boundary texels equivalent so lossy WebP block
  // encoding cannot reintroduce a one-pixel longitude seam.
  const boundaryFeather = Math.min(8, Math.floor(width / 16));
  for (let y = 0; y < height; y++) {
    const rowStart = y * width * channels;
    for (let distance = 0; distance < boundaryFeather; distance++) {
      const strength = smoothstep((boundaryFeather - distance) / boundaryFeather);
      const leftIndex = rowStart + distance * channels;
      const rightIndex = rowStart + (width - 1 - distance) * channels;
      for (let channel = 0; channel < Math.min(channels, 3); channel++) {
        const average = Math.round((rolled[leftIndex + channel] + rolled[rightIndex + channel]) / 2);
        rolled[leftIndex + channel] = Math.round(
          rolled[leftIndex + channel] * (1 - strength) + average * strength,
        );
        rolled[rightIndex + channel] = Math.round(
          rolled[rightIndex + channel] * (1 - strength) + average * strength,
        );
      }
    }
  }
  return rolled;
}

export function measureHorizontalSeam(
  pixels: ArrayLike<number>,
  width: number,
  height: number,
  channels: number,
): number {
  if (width < 2 || height < 1 || channels < 3) return Number.POSITIVE_INFINITY;
  let difference = 0;
  let samples = 0;
  for (let y = 0; y < height; y++) {
    const left = y * width * channels;
    const right = left + (width - 1) * channels;
    for (let channel = 0; channel < 3; channel++) {
      difference += Math.abs(pixels[left + channel] - pixels[right + channel]);
      samples++;
    }
  }
  return difference / Math.max(1, samples) / 255;
}

/**
 * Produces a bounded, mobile-safe 2:1 equirectangular diffuse map.
 * `fit: cover` center-crops every source ratio before resizing, so square
 * provider fallbacks are never stretched or horizontally tiled.
 */
export async function normalizePlanetTexture(
  source: Buffer,
): Promise<PlanetTextureNormalizationResult> {
  const image = sharp(source, {
    failOn: 'error',
    limitInputPixels: MAX_INPUT_PIXELS,
  }).rotate();
  const metadata = await image.metadata();
  const sourceWidth = metadata.width ?? 0;
  const sourceHeight = metadata.height ?? 0;
  if (sourceWidth < 2 || sourceHeight < 2) {
    throw new Error('Generated planet skin has invalid dimensions');
  }

  const { data, info } = await image
    .flatten({ background: '#000000' })
    .removeAlpha()
    .resize(PLANET_TEXTURE_WIDTH, PLANET_TEXTURE_HEIGHT, {
      fit: 'cover',
      position: 'centre',
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const periodic = makeHorizontallyPeriodic(data, info.width, info.height, info.channels);
  const seamMeanAbsoluteError = measureHorizontalSeam(
    periodic,
    info.width,
    info.height,
    info.channels,
  );
  const buffer = await sharp(periodic, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .webp({ quality: 88, effort: 4, smartSubsample: true })
    .toBuffer();

  return {
    buffer,
    width: info.width,
    height: info.height,
    sourceWidth,
    sourceHeight,
    seamMeanAbsoluteError,
  };
}
