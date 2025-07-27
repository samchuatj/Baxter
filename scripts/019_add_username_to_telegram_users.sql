-- Add username field to telegram_users table
-- This will allow us to look up users by username for PA management

-- Add username column
ALTER TABLE telegram_users ADD COLUMN IF NOT EXISTS username TEXT;

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_telegram_users_username ON telegram_users(username);

-- Update RLS policies to allow username lookups
-- We need to allow anonymous users to query by username for PA management
DROP POLICY IF EXISTS "Allow select for anonymous users" ON telegram_users;
CREATE POLICY "Allow select for anonymous users" ON telegram_users
  FOR SELECT USING (true);

-- Add a unique constraint on username (optional, but recommended)
-- This prevents duplicate usernames in the system
-- ALTER TABLE telegram_users ADD CONSTRAINT telegram_users_username_unique UNIQUE (username);

-- Note: We're not adding the unique constraint yet because:
-- 1. Some users might not have usernames
-- 2. We want to test the functionality first
-- 3. We can add it later if needed 