import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { authFetch } from '../auth/api-client.js';

const API_BASE = '/api';

export interface AppFeedbackPayload {
  message: string;
  context: 'colony_surface_lesson';
  language: string;
}

async function getDeviceMeta(): Promise<Record<string, string>> {
  try {
    const info = await Device.getInfo();
    return {
      deviceModel: [info.manufacturer, info.model].filter(Boolean).join(' ') || info.model || 'unknown',
      platform: Capacitor.getPlatform(),
      osVersion: [info.operatingSystem, info.osVersion].filter(Boolean).join(' ') || 'unknown',
      appVersion: info.webViewVersion ? `webview ${info.webViewVersion}` : '',
    };
  } catch {
    return {
      deviceModel: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 180) : 'unknown',
      platform: Capacitor.getPlatform(),
      osVersion: '',
      appVersion: '',
    };
  }
}

export async function sendAppFeedback(payload: AppFeedbackPayload): Promise<void> {
  const deviceMeta = await getDeviceMeta();
  const res = await authFetch(`${API_BASE}/support/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      ...deviceMeta,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Feedback failed: ${res.status}`);
  }
}
