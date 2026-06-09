import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'node:crypto';
import {
  saveMessage,
  getPlayerIdByCallsign,
  broadcastPerPlayerMessage,
} from '../../packages/server/src/db.js';

// ---------------------------------------------------------------------------
// POST /api/admin/broadcast-message
//
// Admin-only endpoint that posts an in-game chat message authored by the
// "voice of the universe" persona (default: ТКАЧ / THE WEAVER). Unlike pushes,
// these land directly inside the chat as a real message row, so the next time
// the player opens the relevant tab they see it (with an unread badge).
//
// Targets:
//   global  → the shared global chat (everyone level 10+ sees it)
//   system  → per-player "system" log. With a callsign → that one player.
//             Without a callsign → fan-out to EVERY player's system channel.
//   astra   → per-player A.S.T.R.A. tab. Same single/all rule as system.
//   dm      → a private thread from the persona to one player (callsign req.)
//
// Auth: shared secret in ADMIN_PUSH_SECRET (falls back to CRON_SECRET), sent
// as the `secret` body field or `x-admin-secret` header.
// ---------------------------------------------------------------------------

// Synthetic sender id for the persona. Not a real player; messages.sender_id
// has no FK, so this is safe and lets the client treat it like any author.
const WEAVER_SENDER_ID = 'nebula-weaver';
const DEFAULT_SENDER_NAME = 'ТКАЧ';

function getAdminSecret(): string | null {
  // Trim: a trailing newline/space pasted into the Vercel env value would make
  // timingSafeEqual's length check fail and reject the (trimmed) form secret → 401.
  const secret = (process.env.ADMIN_PUSH_SECRET || process.env.CRON_SECRET || '').trim();
  return secret || null;
}

function secretMatches(provided: string, expected: string): boolean {
  const enc = new TextEncoder();
  const a = enc.encode(provided);
  const b = enc.encode(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

type Target = 'global' | 'system' | 'astra' | 'dm';
function clampTarget(v: unknown): Target {
  return v === 'system' || v === 'astra' || v === 'dm' ? v : 'global';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expected = getAdminSecret();
  if (!expected) {
    return res.status(503).json({
      error: 'admin_secret_not_configured',
      message: 'Додай ADMIN_PUSH_SECRET (або CRON_SECRET) у змінні середовища проєкту.',
    });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const provided = str(body.secret) || str(req.headers['x-admin-secret']);
  if (!provided || !secretMatches(provided, expected)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const target = clampTarget(body.target);
  const senderName = (str(body.senderName) || DEFAULT_SENDER_NAME).slice(0, 60);
  const callsign = str(body.callsign);
  const content = str(body.content);

  if (!content) {
    return res.status(400).json({ error: 'missing_content', message: 'Введи текст повідомлення.' });
  }
  if (content.length > 500) {
    return res.status(400).json({ error: 'content_too_long', message: 'Максимум 500 символів.' });
  }

  // dm always needs a recipient; system/astra accept a callsign to narrow to
  // one player, otherwise broadcast to all.
  if (target === 'dm' && !callsign) {
    return res.status(400).json({
      error: 'callsign_required',
      message: 'Для особистого повідомлення введи нік гравця.',
    });
  }

  try {
    // Resolve recipient when a callsign is supplied.
    let recipient: { id: string; callsign: string | null } | null = null;
    if (callsign) {
      recipient = await getPlayerIdByCallsign(callsign);
      if (!recipient) {
        return res.status(404).json({
          error: 'player_not_found',
          message: `Гравця з ніком "${callsign}" не знайдено.`,
        });
      }
    }

    if (target === 'global') {
      const msg = await saveMessage(WEAVER_SENDER_ID, senderName, 'global', content);
      return res.status(200).json({ ok: true, target, delivered: 1, channel: 'global', messageId: msg.id });
    }

    if (target === 'dm') {
      const channel = `dm:${WEAVER_SENDER_ID}:${recipient!.id}`;
      const msg = await saveMessage(WEAVER_SENDER_ID, senderName, channel, content);
      return res.status(200).json({ ok: true, target, delivered: 1, channel, messageId: msg.id });
    }

    // system or astra
    if (recipient) {
      const channel = `${target}:${recipient.id}`;
      const msg = await saveMessage(WEAVER_SENDER_ID, senderName, channel, content);
      return res.status(200).json({ ok: true, target, delivered: 1, channel, messageId: msg.id });
    }

    // Fan-out to all players' per-player channel.
    const delivered = await broadcastPerPlayerMessage(WEAVER_SENDER_ID, senderName, target, content);
    return res.status(200).json({ ok: true, target, delivered, broadcast: true });
  } catch (err) {
    console.error('[admin/broadcast-message] failed:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
