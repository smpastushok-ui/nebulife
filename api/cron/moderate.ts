import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPendingReports, updateReport, chatBanPlayer, saveMessage, getPlayer } from '../../packages/server/src/db.js';
import { moderateMessage } from '../../packages/server/src/gemini-client.js';

// ---------------------------------------------------------------------------
// Humorous ban announcement templates
// ---------------------------------------------------------------------------

const WARN_MSGS = [
  '{nick} балакає забагато. Мовчанка на {dur}.',
  'Командор {nick} отримав попередження. Тихіше, командоре, {dur}.',
  '{nick} порушив тишу космосу. Відключено мікрофон на {dur}.',
];

const BLOCK_MSGS = [
  'Командор {nick} долітався. Відключено від каналу на {dur}.',
  '{nick} порушив кодекс Nebulife. Заблоковано на {dur}.',
  'Сигнал від {nick} класифіковано як небезпечний. Глушіння на {dur}.',
];

const SEVERE_MSGS = [
  'Командор {nick} оголошений персоною нон-ґрата на {dur}.',
  '{nick} позбавлений права голосу на {dur} за грубе порушення.',
  'Рада командорів виключила {nick} з ефіру на {dur}.',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDuration(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} хв`;
  const hours = Math.round(ms / 3600000);
  if (hours < 24) return `${hours} год`;
  const days = Math.round(ms / 86400000);
  return `${days} дн`;
}

function buildAnnouncement(
  verdict: 'WARN' | 'BLOCK' | 'SEVERE',
  nick: string,
  durationMs: number,
): string {
  const dur = formatDuration(durationMs);
  const template = verdict === 'WARN'
    ? pickRandom(WARN_MSGS)
    : verdict === 'BLOCK'
      ? pickRandom(BLOCK_MSGS)
      : pickRandom(SEVERE_MSGS);
  return template.replace('{nick}', nick).replace('{dur}', dur);
}

// ---------------------------------------------------------------------------
// Cron handler
// ---------------------------------------------------------------------------

/**
 * GET /api/cron/moderate
 * Protected by CRON_SECRET. Called every minute by Vercel cron.
 * Processes up to 10 pending reports, calls Gemini, issues chat bans.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization ?? '';
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const reports = await getPendingReports(10);
  if (reports.length === 0) {
    return res.status(200).json({ processed: 0 });
  }

  let processed = 0;

  for (const report of reports) {
    try {
      // Fetch reported player's display name
      const reportedPlayer = await getPlayer(report.reported_id);
      const nick = reportedPlayer?.callsign || reportedPlayer?.name || report.reported_id.slice(0, 8);

      // Parse context from stored JSON
      let contextMessages: Array<{ senderName: string; content: string }> = [];
      try {
        if (report.context_json) {
          contextMessages = JSON.parse(report.context_json);
        }
      } catch { /* ignore */ }

      // Call Gemini moderation
      const result = await moderateMessage({
        content: report.message_content,
        contextMessages,
        senderName: nick,
      });

      const verdict = result.verdict;
      let status = 'dismissed';
      let expiresAt: Date | null = null;
      let durationMs = 0;

      if (verdict === 'WARN') {
        status = 'warned';
        durationMs = 5 * 60 * 1000; // 5 minutes
        expiresAt = new Date(Date.now() + durationMs);
      } else if (verdict === 'BLOCK') {
        status = 'blocked';
        const hours = 1 + Math.floor(Math.random() * 24); // 1-24 hours
        durationMs = hours * 3600 * 1000;
        expiresAt = new Date(Date.now() + durationMs);
      } else if (verdict === 'SEVERE') {
        status = 'severe';
        const days = 7 + Math.floor(Math.random() * 24); // 7-30 days
        durationMs = days * 86400 * 1000;
        expiresAt = new Date(Date.now() + durationMs);
      }

      if (expiresAt && verdict !== 'SAFE') {
        // Issue chat ban across all channels
        await chatBanPlayer(report.reported_id, 'all', expiresAt, result.reason);

        // Post humorous announcement to the channel where it happened
        const announcement = buildAnnouncement(verdict as 'WARN' | 'BLOCK' | 'SEVERE', nick, durationMs);
        await saveMessage('system', 'Gemini', report.channel, announcement);
      }

      // Private notif to reporter via system message
      const reporterChannel = `system:${report.reporter_id}`;
      const verdictText = verdict === 'SAFE'
        ? 'Скарга розглянута. Порушень не виявлено.'
        : verdict === 'WARN'
          ? `Gemini виніс попередження гравцю ${nick}.`
          : `Гравця ${nick} тимчасово заблоковано за вашою скаргою.`;
      await saveMessage('system', 'Gemini', reporterChannel, verdictText);

      // Update report record
      await updateReport(report.id, status, JSON.stringify(result));
      processed++;
    } catch (err) {
      console.error(`[moderate] Failed to process report ${report.id}:`, err);
      // Mark as dismissed to avoid reprocessing broken reports indefinitely
      await updateReport(report.id, 'dismissed', 'error').catch(() => {});
    }
  }

  return res.status(200).json({ processed });
}
