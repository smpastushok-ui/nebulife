// ---------------------------------------------------------------------------
// Kling AI API — Client-side wrapper
// ---------------------------------------------------------------------------
// Communicates with /api/kling/* serverless functions.
// Never calls Kling directly — all auth handled server-side.
// ---------------------------------------------------------------------------

import { authFetch } from '../auth/api-client.js';

const API_BASE = '/api';

export interface GenerateRequest {
  playerId: string;
  discoveryId: string;
  objectType: string;
  rarity: string;
  galleryCategory: string;
  systemId: string;
  planetId?: string;
  prompt: string;
  aspectRatio?: string;
  scientificReport?: string;
  cost?: number;
  /** Server-signed token from POST /api/ads/reward — skips quark deduction when valid. */
  adPhotoToken?: string;
}

export interface GenerateResponse {
  taskId: string;
  discoveryId: string;
  quarksRemaining?: number;
}

export interface TaskStatusResponse {
  status: 'pending' | 'processing' | 'succeed' | 'failed';
  imageUrl?: string;
}

/**
 * Request image generation via Kling AI.
 * Creates a discovery record in DB and submits to Kling.
 */
export async function requestGeneration(req: GenerateRequest): Promise<GenerateResponse> {
  const res = await authFetch(`${API_BASE}/kling/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Generation failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Check the status of a Kling generation task.
 * Returns status + imageUrl when complete.
 */
export async function checkTaskStatus(taskId: string): Promise<TaskStatusResponse> {
  const res = await authFetch(`${API_BASE}/kling/status/${taskId}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Status check failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Poll for task completion with exponential backoff.
 *
 * @param taskId      The Kling task ID.
 * @param onProgress  Called on each status update.
 * @param interval    Base polling interval in ms (default 3000).
 * @param maxAttempts Max poll attempts before giving up (default 60 = ~3 min).
 * @returns The image URL on success.
 */
export async function pollUntilComplete(
  taskId: string,
  onProgress?: (status: TaskStatusResponse['status']) => void,
  interval: number = 3000,
  maxAttempts: number = 60,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(interval);

    const result = await checkTaskStatus(taskId);
    onProgress?.(result.status);

    if (result.status === 'succeed' && result.imageUrl) {
      return result.imageUrl;
    }

    if (result.status === 'failed') {
      throw new Error('Image generation failed');
    }

    // Slight backoff after first 10 attempts
    if (i > 10) interval = Math.min(interval * 1.1, 10000);
  }

  throw new Error('Generation timed out');
}

/**
 * Download an image from URL and return as a Blob.
 * Used before pixel-reveal: fetch the full image first.
 */
export async function downloadImage(imageUrl: string): Promise<Blob> {
  // Use plain fetch for external CDN URLs (authFetch adds Authorization header
  // which triggers CORS preflight that external CDNs reject)
  const isExternal = imageUrl.startsWith('http');
  const res = isExternal ? await fetch(imageUrl) : await authFetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  return res.blob();
}

/**
 * Determine the best aspect ratio based on the player's screen.
 * Maps to Kling AI's supported ratios.
 */
export function getScreenAspectRatio(): string {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const ratio = w / h;

  // Map to nearest supported ratio
  if (ratio > 2.0) return '21:9';        // Ultra-wide
  if (ratio > 1.6) return '16:9';        // Standard landscape
  if (ratio > 1.2) return '4:3';         // Classic landscape
  if (ratio > 0.85) return '1:1';        // Square-ish
  if (ratio > 0.65) return '3:4';        // Portrait
  return '9:16';                           // Tall portrait (mobile)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
