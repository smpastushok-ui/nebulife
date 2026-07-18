import * as THREE from 'three';

export const PLANET_TEXTURE_VERSION = 'v2';

export function isNormalizedPlanetTextureUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url, typeof window === 'undefined' ? 'https://nebulife.invalid' : window.location.origin);
    return parsed.pathname.endsWith('.webp')
      && parsed.pathname.includes(`/planet-skins/textures/${PLANET_TEXTURE_VERSION}/`);
  } catch {
    return false;
  }
}

export function configurePlanetTexture(
  texture: THREE.Texture,
  maxAnisotropy: number,
): THREE.Texture {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = Math.max(1, Math.min(maxAnisotropy, 8));
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
