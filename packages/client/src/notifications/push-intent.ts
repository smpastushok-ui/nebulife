export type PushIntent =
  | { id: string; kind: 'digest'; weekDate?: string }
  | { id: string; kind: 'operations-event'; eventId?: string }
  | { id: string; kind: 'observatory-event'; eventId: string };

export interface PushIntentStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const STORAGE_KEY = 'nebulife_pending_push_intent_v1';
const EVENT_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,79}$/;

function validEventId(value: unknown): string | undefined {
  return typeof value === 'string' && EVENT_ID_PATTERN.test(value) ? value : undefined;
}

function makeId(data: Record<string, string>): string {
  const notificationId = validEventId(data.notificationId);
  if (notificationId) return notificationId;
  const basis = `${data.action ?? ''}:${data.target ?? ''}:${data.eventId ?? ''}:${data.occurrenceDate ?? ''}:${Date.now()}`;
  let hash = 2166136261;
  for (let i = 0; i < basis.length; i++) {
    hash ^= basis.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `push-${(hash >>> 0).toString(36)}`;
}

/**
 * Parse only the allowlisted navigation contract. Unknown actions, targets and
 * malformed ids are ignored rather than being interpreted as arbitrary routes.
 */
export function parsePushIntent(data: Record<string, string>): PushIntent | null {
  const action = data.action ?? '';
  const eventId = validEventId(data.eventId);
  const id = makeId(data);

  if (action === 'open-digest') {
    return { id, kind: 'digest', ...(data.weekDate ? { weekDate: data.weekDate } : {}) };
  }

  if (action === 'open-event' || action === 'open-live-event' || action === 'open-operations') {
    const target = data.target || (action === 'open-operations' || action === 'open-live-event' ? 'operations' : '');
    if (target === 'operations') {
      return { id, kind: 'operations-event', ...(eventId ? { eventId } : {}) };
    }
    if (target === 'observatory' && eventId) {
      return { id, kind: 'observatory-event', eventId };
    }
    return null;
  }

  // Backward compatibility for Comet Herald payloads shipped through 1.0.306.
  if (action === 'open-game' && data.occurrenceDate) {
    return { id, kind: 'operations-event', eventId: 'comet-herald' };
  }

  return null;
}

export function parsePushIntentUrl(url: string): PushIntent | null {
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://nebulife.space';
    const parsed = new URL(url, base);
    const data: Record<string, string> = {};
    parsed.searchParams.forEach((value, key) => { data[key] = value; });
    return parsePushIntent(data);
  } catch {
    return null;
  }
}

export function persistPushIntent(intent: PushIntent, storage: PushIntentStorage = localStorage): void {
  try {
    const existing = peekPushIntent(storage);
    if (existing?.id === intent.id) return;
    storage.setItem(STORAGE_KEY, JSON.stringify(intent));
  } catch {
    // Push navigation is best-effort when storage is unavailable.
  }
}

export function peekPushIntent(storage: PushIntentStorage = localStorage): PushIntent | null {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PushIntent>;
    if (typeof value.id !== 'string' || typeof value.kind !== 'string') return null;
    if (value.kind === 'digest') return value as PushIntent;
    if (value.kind === 'operations-event') {
      const eventId = value.eventId == null ? undefined : validEventId(value.eventId);
      return { id: value.id, kind: value.kind, ...(eventId ? { eventId } : {}) };
    }
    if (value.kind === 'observatory-event') {
      const eventId = validEventId(value.eventId);
      return eventId ? { id: value.id, kind: value.kind, eventId } : null;
    }
    return null;
  } catch {
    return null;
  }
}

/** Remove before returning, so React rerenders and remounts cannot consume twice. */
export function consumePushIntent(storage: PushIntentStorage = localStorage): PushIntent | null {
  const intent = peekPushIntent(storage);
  if (!intent) return null;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    return null;
  }
  return intent;
}

export function captureInitialPushIntent(url = window.location.href): PushIntent | null {
  const intent = parsePushIntentUrl(url);
  if (intent) persistPushIntent(intent);
  return intent;
}
