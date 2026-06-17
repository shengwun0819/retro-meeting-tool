-- Extend feedback table for the dashboard:
--   user_id      — auth.users.id of the submitter (nullable; pre-dashboard rows have none)
--   author_name  — display name at submission time
--   status       — pending / acknowledged / in_progress / done / wontfix
--   admin_note   — optional reply visible to everyone
--   updated_at   — bumped whenever status / admin_note changes

ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS user_id     UUID,
  ADD COLUMN IF NOT EXISTS author_name TEXT,
  ADD COLUMN IF NOT EXISTS status      TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_note  TEXT,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Constrain status values
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_status_check;
ALTER TABLE feedback ADD CONSTRAINT feedback_status_check
  CHECK (status IN ('pending', 'acknowledged', 'in_progress', 'done', 'wontfix'));

-- Index for "my feedback" lookup
CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON feedback(user_id);
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback(created_at DESC);
