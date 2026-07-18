import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  configurePlanetTexture,
  isNormalizedPlanetTextureUrl,
} from './PlanetTexture.js';

describe('planet texture compatibility', () => {
  it('accepts only normalized v2 texture-map URLs', () => {
    expect(isNormalizedPlanetTextureUrl(
      'https://blob.example/planet-skins/textures/v2/skin.webp',
    )).toBe(true);
    expect(isNormalizedPlanetTextureUrl(
      'https://blob.example/planet-skins/textures/legacy.webp',
    )).toBe(false);
    expect(isNormalizedPlanetTextureUrl(
      'https://blob.example/planet-skins/raw-21x9/source.png',
    )).toBe(false);
    expect(isNormalizedPlanetTextureUrl(null)).toBe(false);
  });

  it('configures repeat-safe color and sampling settings', () => {
    const texture = new THREE.Texture();
    configurePlanetTexture(texture, 16);

    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(texture.wrapS).toBe(THREE.RepeatWrapping);
    expect(texture.wrapT).toBe(THREE.ClampToEdgeWrapping);
    expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter);
    expect(texture.magFilter).toBe(THREE.LinearFilter);
    expect(texture.anisotropy).toBe(8);
    expect(texture.generateMipmaps).toBe(true);
    expect(texture.version).toBeGreaterThan(0);
  });
});
