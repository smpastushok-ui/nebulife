// ---------------------------------------------------------------------------
// GLB durable storage (Vercel Blob)
// ---------------------------------------------------------------------------
// Tripo3D output URLs are temporary (CDN links tied to the task) and can
// expire or be rotated. This helper downloads a GLB from any source URL and
// re-uploads it to our own Vercel Blob store, returning a permanent public
// URL that we persist in the DB instead of the raw Tripo link.
//
// Used by both the creature pipeline (api/creatures/*) and the ship pipeline
// (api/ship/status/[shipId].ts) so neither depends on Tripo's CDN staying up.
// Requires the BLOB_READ_WRITE_TOKEN env var (set automatically when a Vercel
// Blob store is linked to the project; must be added manually otherwise).
// ---------------------------------------------------------------------------

import { put } from '@vercel/blob';

export interface StoredGlb {
  /** Permanent public Vercel Blob URL. */
  url: string;
  /** Downloaded file size in bytes. */
  size: number;
}

/**
 * Download a GLB from a (possibly temporary) source URL and re-upload it to
 * Vercel Blob under the given prefix. Throws on any failure — callers should
 * decide whether to fall back to the source URL or fail the pipeline step.
 */
export async function storeGlbFromUrl(sourceUrl: string, prefix: string): Promise<StoredGlb> {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download GLB from source (${response.status}): ${sourceUrl}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length === 0) {
    throw new Error('Downloaded GLB is empty');
  }

  const filename = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.glb`;
  const blob = await put(filename, buffer, {
    access: 'public',
    contentType: 'model/gltf-binary',
  });

  return { url: blob.url, size: buffer.length };
}

/**
 * Best-effort variant: returns null instead of throwing so callers can keep
 * using the original (temporary) URL as a fallback rather than failing an
 * otherwise-successful generation.
 */
export async function tryStoreGlbFromUrl(sourceUrl: string, prefix: string): Promise<StoredGlb | null> {
  try {
    return await storeGlbFromUrl(sourceUrl, prefix);
  } catch (err) {
    console.error(`[glb-storage] Failed to persist GLB to Blob (prefix=${prefix}):`, err);
    return null;
  }
}
