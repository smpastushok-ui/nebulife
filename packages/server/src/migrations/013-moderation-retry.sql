-- Migration 013: Moderation retries + admin escalation
-- Allows cron/moderate to retry failed Gemini calls before dismissing, and to
-- escalate to admin email when Gemini is persistently unavailable.

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

-- New status value possible: pending_admin (waiting for manual review).
-- No CHECK constraint exists on status so no schema change needed beyond the
-- column above; status is free-form text validated by application code.

-- Extend the status filter index so the admin-escalated queue is also fast.
CREATE INDEX IF NOT EXISTS idx_reports_pending_admin
  ON reports(status) WHERE status = 'pending_admin';
