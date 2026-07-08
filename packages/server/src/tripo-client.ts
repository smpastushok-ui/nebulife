// ---------------------------------------------------------------------------
// Tripo3D API Client — Image to 3D Model
// ---------------------------------------------------------------------------
// Docs: https://docs.tripo3d.ai/
// Auth: Bearer token with API key
// Flow: POST image_to_model → task_id → poll GET until success → GLB URL
// ---------------------------------------------------------------------------

const TRIPO_API_BASE = 'https://api.tripo3d.ai/v2/openapi';
const TRIPO_DEFAULT_IMAGE_MODEL_VERSION = 'v2.5-20250123';
const TRIPO_LOW_POLY_IMAGE_MODEL_VERSION = 'P1-20260311';

type TripoImageFormat = 'jpg' | 'jpeg' | 'png' | 'webp';

interface TripoImageToModelOptions {
  modelVersion?: string;
  faceLimit?: number;
  smartLowPoly?: boolean;
  textureQuality?: 'standard' | 'detailed';
  geometryQuality?: 'standard' | 'detailed';
  pbr?: boolean;
  texture?: boolean;
}

function getApiKey(): string {
  const key = process.env.TRIPO_API_KEY;
  if (!key) {
    throw new Error('TRIPO_API_KEY environment variable is not set');
  }
  return key;
}

function inferImageFormat(imageUrl: string): TripoImageFormat {
  try {
    const path = new URL(imageUrl).pathname.toLowerCase();
    if (path.endsWith('.webp')) return 'webp';
    if (path.endsWith('.jpg')) return 'jpg';
    if (path.endsWith('.jpeg')) return 'jpeg';
    if (path.endsWith('.png')) return 'png';
  } catch {
    // Fall through to the generated-image default below.
  }

  // Gemini/Vercel Blob image URLs can be signed or extensionless; the current
  // Tripo schema expects file.type to be an image format, not "url".
  return 'png';
}

function buildImageToModelBody(imageUrl: string, options: TripoImageToModelOptions = {}) {
  return {
    type: 'image_to_model',
    model_version: options.modelVersion ?? TRIPO_DEFAULT_IMAGE_MODEL_VERSION,
    file: {
      type: inferImageFormat(imageUrl),
      url: imageUrl,
    },
    ...(options.faceLimit !== undefined ? { face_limit: options.faceLimit } : {}),
    ...(options.smartLowPoly !== undefined ? { smart_low_poly: options.smartLowPoly } : {}),
    ...(options.textureQuality ? { texture_quality: options.textureQuality } : {}),
    ...(options.geometryQuality ? { geometry_quality: options.geometryQuality } : {}),
    ...(options.pbr !== undefined ? { pbr: options.pbr } : {}),
    ...(options.texture !== undefined ? { texture: options.texture } : {}),
  };
}

async function createImageToModelTask(
  imageUrl: string,
  options: TripoImageToModelOptions,
  errorPrefix: string,
): Promise<{ taskId: string }> {
  const apiKey = getApiKey();

  const response = await fetch(`${TRIPO_API_BASE}/task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(buildImageToModelBody(imageUrl, options)),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`${errorPrefix} ${response.status}: ${errText}`);
  }

  const result = (await response.json()) as TripoCreateTaskResponse;

  if (result.code !== 0) {
    const message = result.message ? `: ${result.message}` : '';
    const suggestion = result.suggestion ? ` (${result.suggestion})` : '';
    throw new Error(`${errorPrefix} code ${result.code}${message}${suggestion}`);
  }

  return { taskId: result.data.task_id };
}

// ---------------------------------------------------------------------------
// Create Image-to-Model Task
// ---------------------------------------------------------------------------

export interface TripoCreateTaskResponse {
  code: number;
  message?: string;
  suggestion?: string;
  data: {
    task_id: string;
  };
}

/**
 * Submit an image-to-3D-model task to Tripo3D.
 * Takes an image URL and returns a task ID for polling.
 */
export async function createModelTask(imageUrl: string): Promise<{ taskId: string }> {
  return createImageToModelTask(imageUrl, {}, 'Tripo3D API error');
}

/**
 * Submit a mobile-safe image-to-model task for a player ship.
 * Keeps geometry/material complexity low enough for the Three.js arena.
 */
export async function createShipModelTask(imageUrl: string): Promise<{ taskId: string }> {
  return createImageToModelTask(imageUrl, {
    modelVersion: TRIPO_LOW_POLY_IMAGE_MODEL_VERSION,
    faceLimit: 5000,
    textureQuality: 'standard',
    pbr: false,
    texture: true,
  }, 'Tripo3D ship API error');
}

/**
 * Submit a text-to-3D-model task for a player ship.
 * This is the main custom ship path: Tripo creates the 3D hull directly from
 * the moderated ship brief, without a separate image-generation provider.
 */
export async function createShipTextModelTask(
  prompt: string,
  negativePrompt?: string,
): Promise<{ taskId: string }> {
  const apiKey = getApiKey();

  const body = {
    type: 'text_to_model',
    prompt,
    ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
    face_limit: 5000,
    smart_low_poly: true,
    texture_quality: 'standard',
    geometry_quality: 'standard',
    pbr: false,
    texture: true,
    model_version: TRIPO_DEFAULT_IMAGE_MODEL_VERSION,
  };

  const response = await fetch(`${TRIPO_API_BASE}/task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Tripo3D ship text API error ${response.status}: ${errText}`);
  }

  const result = (await response.json()) as TripoCreateTaskResponse;

  if (result.code !== 0) {
    const message = result.message ? `: ${result.message}` : '';
    const suggestion = result.suggestion ? ` (${result.suggestion})` : '';
    throw new Error(`Tripo3D ship text API error code ${result.code}${message}${suggestion}`);
  }

  return { taskId: result.data.task_id };
}

/**
 * Submit a mobile-safe image-to-model task for a player-generated biosphere
 * creature. Same conservative budget as ships (face_limit 5000, smart low
 * poly) so a planet's up-to-3 creatures stay within the Biosphere scene's
 * mid-phone performance budget (Game Bible §NEXT_GEN_PLAN Section C).
 */
export async function createCreatureModelTask(imageUrl: string): Promise<{ taskId: string }> {
  return createImageToModelTask(imageUrl, {
    modelVersion: TRIPO_LOW_POLY_IMAGE_MODEL_VERSION,
    faceLimit: 5000,
    textureQuality: 'standard',
    pbr: false,
    texture: true,
  }, 'Tripo3D creature API error');
}

// ---------------------------------------------------------------------------
// Check Task Status
// ---------------------------------------------------------------------------

export type TripoTaskStatus =
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'banned'
  | 'expired'
  | 'cancelled'
  | 'unknown';

export function isFinalTripoFailure(status: TripoTaskStatus): boolean {
  return status === 'failed'
    || status === 'banned'
    || status === 'expired'
    || status === 'cancelled'
    || status === 'unknown';
}

export interface TripoTaskStatusResponse {
  code: number;
  data: {
    task_id: string;
    type: string;
    status: string; // queued | running | success | failed | banned | expired | cancelled | unknown
    progress: number; // 0-100
    output?: {
      // Tripo v2 API: model is a direct URL string (not nested object)
      model?: string | { url: string; type: string };
      base_model?: string;
      pbr_model?: string;
      rendered_image?: string | { url: string };
    };
  };
}

/**
 * Check the status of a Tripo3D task.
 * Returns normalized status + GLB URL if complete.
 */
export async function checkModelTask(taskId: string): Promise<{
  status: TripoTaskStatus;
  progress: number;
  glbUrl?: string;
}> {
  const apiKey = getApiKey();

  const response = await fetch(`${TRIPO_API_BASE}/task/${taskId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Tripo3D status check error ${response.status}: ${errText}`);
  }

  const result = (await response.json()) as TripoTaskStatusResponse;
  console.log(`Tripo3D raw response for task ${taskId}:`, JSON.stringify(result.data));

  if (result.code !== 0) {
    throw new Error(`Tripo3D API error code ${result.code}`);
  }

  const apiStatus = result.data.status;
  let status: TripoTaskStatus;

  switch (apiStatus) {
    case 'queued':
      status = 'queued';
      break;
    case 'running':
      status = 'running';
      break;
    case 'success':
      status = 'success';
      break;
    case 'failed':
      status = 'failed';
      break;
    case 'banned':
      status = 'banned';
      break;
    case 'expired':
      status = 'expired';
      break;
    case 'cancelled':
      status = 'cancelled';
      break;
    default:
      status = 'unknown';
  }

  // Tripo v2: GLB URL is in output.pbr_model (primary) or output.model (fallback)
  const pbr = result.data.output?.pbr_model;
  const base = result.data.output?.base_model;
  const modelField = result.data.output?.model;
  const glbUrl = typeof pbr === 'string'
    ? pbr
    : typeof base === 'string'
      ? base
    : typeof modelField === 'string'
      ? modelField
      : (modelField as { url: string } | undefined)?.url;

  return { status, progress: result.data.progress ?? 0, glbUrl };
}
