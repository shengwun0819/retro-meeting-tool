-- Track guest (non-SSO) user sessions for visibility in Supabase dashboard
-- Google SSO users appear in Authentication > Users automatically;
-- guests who enter a nickname are logged here.

CREATE TABLE IF NOT EXISTS guest_sessions (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Allow anonymous inserts (same open-access pattern as other tables)
ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON guest_sessions FOR ALL USING (true) WITH CHECK (true);
