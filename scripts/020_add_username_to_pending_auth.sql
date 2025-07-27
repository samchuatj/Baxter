-- Add username field to pending_auth table
-- This will allow us to store usernames during the linking process

-- Add username column
ALTER TABLE pending_auth ADD COLUMN IF NOT EXISTS username TEXT;

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_pending_auth_username ON pending_auth(username); 