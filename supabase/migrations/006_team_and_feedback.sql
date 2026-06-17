-- Add team field to retro_sessions
ALTER TABLE retro_sessions ADD COLUMN IF NOT EXISTS team TEXT;

-- Feedback table for user feedback collection
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON feedback FOR ALL USING (true) WITH CHECK (true);
