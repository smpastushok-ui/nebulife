// ---------------------------------------------------------------------------
// Tripo3D API Client — Image to 3D Model
// ---------------------------------------------------------------------------
// Docs: https://platform.tripo3d.ai/docs/api-reference
// Auth: Bearer token with API key
// Flow: POST image_to_model → task_id → poll GET until success → GLB URL
// ---------------------------------------------------------------------------

const TRIPO_API_BASE = 'https://api.tripo3d.ai/v2/openapi';

function getApiKey(): string {
  const key = process.env.TRIPO_API_KEY;
  if (!key) {
    throw new Error('TRIPO_API_KEY environment variable is not set');
  }
  return key;
}

// ---------------------------------------------------------------------------
// Create Image-to-Model Task
// ---------------------------------------------------------------------------

export interface TripoCreateTaskResponse {
  code: number;
  data: {
    task_id: string;
  };
}

/**
 * Submit an image-to-3D-model task to Tripo3D.
 * Takes an image URL and returns a task ID for polling.
 */
export async function createModelTask(imageUrl: string): Promise<{ taskId: string }> {
  const apiKey = getApiKey();

  const body = {
    type: 'image_to_model',
    file: {
      type: 'url',
      url: imageUrl,
    },
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
    throw new Error(`Tripo3D API error ${response.status}: ${errText}`);
  }

  const result = (await response.json()) as TripoCreateTaskResponse;

  if (result.code !== 0) {
    throw new Error(`Tripo3D API error code ${result.code}`);
  }

  return { taskId: result.data.task_id };
}

// ---------------------------------------------------------------------------
// Check Task Status
// ---------------------------------------------------------------------------

export type TripoTaskStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled' | 'unknown';

export interface TripoTaskStatusResponse {
  code: number;
  data: {
    task_id: string;
    type: string;
    status: string; // 'queued' | 'running' | 'success' | 'failed' | 'cancelled'
    progress: number; // 0-100
    output?: {
      model?: {
        url: string;   // URL to download GLB
        type: string;  // 'glb'
      };
      rendered_image?: {
        url: string;
      };
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
    case 'cancelled':
      status = 'cancelled';
      break;
    default:
      status = 'unknown';
  }

  const glbUrl = result.data.output?.model?.url;

  return { status, progress: result.data.progress ?? 0, glbUrl };
}
