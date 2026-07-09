// ---------------------------------------------------------------------------
// Saga API — Client-side wrapper for "Сага Ткача"
// ---------------------------------------------------------------------------

import { authFetch } from '../auth/api-client.js';
import type { SagaMilestoneContext, SagaMilestoneType } from '@nebulife/core';

const API_BASE = '/api';

export interface SagaChapterView {
  id: string;
  milestoneType: SagaMilestoneType;
  title: string;
  bodyText: string;
  imageUrl: string | null;
  language: string;
  createdAt: string;
}

export interface GenerateSagaChapterResponse {
  status: 'ready' | 'already_written' | 'throttled';
  chapter?: SagaChapterView;
  imageSkipped?: 'premium_required';
  error?: string;
}

export async function generateSagaChapter(
  milestoneType: SagaMilestoneType,
  context: SagaMilestoneContext,
): Promise<GenerateSagaChapterResponse> {
  const res = await authFetch(`${API_BASE}/saga/generate-chapter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ milestoneType, context }),
  });

  const data = await res.json().catch(() => ({ error: 'Unknown error' }));
  if (!res.ok) {
    throw new Error(data.error ?? `Saga chapter generation failed: ${res.status}`);
  }
  return data as GenerateSagaChapterResponse;
}

export async function listSagaChapters(): Promise<SagaChapterView[]> {
  const res = await authFetch(`${API_BASE}/saga/list?_t=${Date.now()}`, {
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({ error: 'Unknown error' }));
  if (!res.ok) {
    throw new Error(data.error ?? `Saga list failed: ${res.status}`);
  }
  return (data.chapters ?? []) as SagaChapterView[];
}
