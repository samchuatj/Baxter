-- Create pending_auth table to store temporary authentication tokens
CREATE TABLE IF NOT EXISTS pending_auth (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  telegram_id BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- Add RLS policies
ALTER TABLE pending_auth ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (for the bot)
CREATE POLICY "Allow all operations for authenticated users" ON pending_auth
  FOR ALL USING (auth.role() = 'authenticated');

-- Allow insert for anonymous users (for the bot)
CREATE POLICY "Allow insert for anonymous users" ON pending_auth
  FOR INSERT WITH CHECK (true);

-- Allow select for anonymous users (for API routes)
CREATE POLICY "Allow select for anonymous users" ON pending_auth
  FOR SELECT USING (true);

-- Allow delete for anonymous users (for cleanup)
CREATE POLICY "Allow delete for anonymous users" ON pending_auth
  FOR DELETE USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_auth_token ON pending_auth(token);
CREATE INDEX IF NOT EXISTS idx_pending_auth_expires ON pending_auth(expires_at);

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_pending_auth()
RETURNS void AS $$
BEGIN
  DELETE FROM pending_auth WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a cron job to clean up expired tokens (optional)
-- This would require pg_cron extension
-- SELECT cron.schedule('cleanup-expired-auth', '*/5 * * * *', 'SELECT cleanup_expired_pending_auth();'); 