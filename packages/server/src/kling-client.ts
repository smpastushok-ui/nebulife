import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Kling AI API 3.0 Client
// ---------------------------------------------------------------------------
// Docs: https://app.klingai.com/global/dev/document-api
// Auth: JWT (HS256) signed with Access Key (AK) + Secret Key (SK)
// Flow: POST generate → task_id → poll GET until succeed → image URL
// ---------------------------------------------------------------------------

const KLING_API_BASE = 'https://api.klingai.com/v1';

/**
 * Generate a JWT token for Kling API authentication.
 * Payload: { iss: AccessKey, exp: now+30min, nbf: now-5s }
 */
function generateJWT(): string {
  const ak = process.env.KLING_ACCESS_KEY;
  const sk = process.env.KLING_SECRET_KEY;

  if (!ak || !sk) {
    throw new Error('KLING_ACCESS_KEY and KLING_SECRET_KEY must be set');
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ak,
    exp: now + 1800,   // 30 minutes
    nbf: now - 5,      // Valid from 5 seconds ago
  };

  return jwt.sign(payload, sk, { algorithm: 'HS256' });
}

// ---------------------------------------------------------------------------
// Image Generation
// ---------------------------------------------------------------------------

export interface KlingGenerateRequest {
  prompt: string;
  aspectRatio?: string;  // '16:9' | '9:16' | '4:3' | '3:2' | '1:1' | '2:3' | '3:4'
  resolution?: '1K' | '2K';
}

export interface KlingGenerateResponse {
  code: number;
  message: string;
  request_id: string;
  data: {
    task_id: string;
    task_status: string;
    task_status_msg?: string;
  };
}

/**
 * Submit an image generation task to Kling AI.
 * Returns the task_id for polling.
 */
export async function generateImage(req: KlingGenerateRequest): Promise<{ taskId: string }> {
  const token = generateJWT();

  const body = {
    model_name: 'kling-v1-5',       // Latest available model
    prompt: req.prompt,
    aspect_ratio: req.aspectRatio ?? '16:9',
    n: 1,
    // callback_url could be used for webhooks instead of polling
  };

  const response = await fetch(`${KLING_API_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Kling API error ${response.status}: ${errText}`);
  }

  const result = (await response.json()) as KlingGenerateResponse;

  if (result.code !== 0) {
    throw new Error(`Kling API error code ${result.code}: ${result.message}`);
  }

  return { taskId: result.data.task_id };
}

// ---------------------------------------------------------------------------
// Task Status Polling
// ---------------------------------------------------------------------------

export interface KlingTaskImage {
  index: number;
  url: string;
}

export interface KlingTaskStatusResponse {
  code: number;
  message: string;
  request_id: string;
  data: {
    task_id: string;
    task_status: string;     // 'submitted' | 'processing' | 'succeed' | 'failed'
    task_status_msg?: string;
    task_result?: {
      images?: KlingTaskImage[];
    };
  };
}

export type TaskStatus = 'pending' | 'processing' | 'succeed' | 'failed';

/**
 * Check the status of a Kling image generation task.
 * Returns normalized status + image URL if complete.
 */
export async function checkTaskStatus(taskId: string): Promise<{
  status: TaskStatus;
  imageUrl?: string;
}> {
  const token = generateJWT();

  const response = await fetch(`${KLING_API_BASE}/images/generations/${taskId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Kling API status check error ${response.status}: ${errText}`);
  }

  const result = (await response.json()) as KlingTaskStatusResponse;

  if (result.code !== 0) {
    throw new Error(`Kling API error code ${result.code}: ${result.message}`);
  }

  const apiStatus = result.data.task_status;
  let status: TaskStatus;

  if (apiStatus === 'succeed') {
    status = 'succeed';
  } else if (apiStatus === 'failed') {
    status = 'failed';
  } else if (apiStatus === 'processing') {
    status = 'processing';
  } else {
    status = 'pending'; // 'submitted' or any other state
  }

  const imageUrl = result.data.task_result?.images?.[0]?.url;

  return { status, imageUrl };
}
