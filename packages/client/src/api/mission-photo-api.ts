import { authFetch } from '../auth/api-client.js';

export interface MissionPhotoSaveResponse {
  photoId: string;
  photoUrl: string;
  status: 'succeed';
}

export async function saveMissionPhoto(params: {
  playerId: string;
  photoKey: string;
  imageDataUrl: string;
  promptUsed: string;
}): Promise<MissionPhotoSaveResponse> {
  const res = await authFetch('/api/mission-photo/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}
