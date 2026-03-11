// ---------------------------------------------------------------------------
// Tripo3D — Client-side wrapper for 3D model generation
// ---------------------------------------------------------------------------
// Communicates with /api/tripo/* and /api/models/* serverless functions.
// Never calls Tripo3D directly — all auth handled server-side.
// ---------------------------------------------------------------------------

const API_BASE = '/api';

export interface ModelStatusResponse {
  status: 'pending' | 'awaiting_payment' | 'generating_photo' | 'generating_3d' | 'running' | 'ready' | 'failed' | 'payment_failed';
  progress?: number;
  glbUrl?: string;
  klingPhotoUrl?: string;
  paymentStatus?: string;
}

export interface GenerateModelResponse {
  modelId: string;
  status: string;
  tripoTaskId?: string;
  glbUrl?: string;
  message?: string;
}

export interface PlanetModel {
  id: string;
  player_id: string;
  planet_id: string;
  system_id: string;
  status: string;
  kling_photo_url: string | null;
  glb_url: string | null;
  tripo_task_id: string | null;
  payment_id: string | null;
  payment_status: string;
  created_at: string;
  completed_at: string | null;
}

/**
 * Manually trigger model generation (after payment confirmed).
 */
export async function requestModelGeneration(req: {
  modelId: string;
  klingPhotoUrl?: string;
}): Promise<GenerateModelResponse> {
  const res = await fetch(`${API_BASE}/tripo/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Generation request failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Check model generation status.
 */
export async function checkModelStatus(modelId: string): Promise<ModelStatusResponse> {
  // Cache-busting timestamp to avoid 304 stale responses
  const res = await fetch(`${API_BASE}/tripo/status/${modelId}?_t=${Date.now()}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Status check failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Poll model generation until complete with backoff.
 */
export async function pollModelUntilComplete(
  modelId: string,
  onProgress?: (status: ModelStatusResponse) => void,
  interval: number = 5000,
  maxAttempts: number = 120,
): Promise<{ glbUrl: string; klingPhotoUrl?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(interval);

    const result = await checkModelStatus(modelId);
    onProgress?.(result);

    if (result.status === 'ready' && result.glbUrl) {
      return { glbUrl: result.glbUrl, klingPhotoUrl: result.klingPhotoUrl };
    }

    if (result.status === 'failed' || result.status === 'payment_failed') {
      throw new Error(`Model generation ${result.status}`);
    }

    // Backoff after first 20 attempts
    if (i > 20) interval = Math.min(interval * 1.1, 15000);
  }

  throw new Error('Model generation timed out');
}

/**
 * Get all planet models for a player.
 */
export async function getPlayerModels(playerId: string): Promise<PlanetModel[]> {
  const res = await fetch(`${API_BASE}/models?playerId=${encodeURIComponent(playerId)}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Failed to get models: ${res.status}`);
  }

  const data = await res.json();
  return data.models;
}

/**
 * Convert a GLB URL to use our proxy (Tripo CDN lacks CORS headers).
 * If the URL is already a proxy URL, return as-is.
 */
export function proxyGlbUrl(modelId: string, glbUrl: string | null): string | null {
  if (!glbUrl) return null;
  if (glbUrl.startsWith('/api/tripo/glb/')) return glbUrl;
  return `/api/tripo/glb/${modelId}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
