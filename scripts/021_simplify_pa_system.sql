-- Simplify PA System - Remove personal_assistants table and update group_chats
-- This migration removes the complex PA management and simplifies to group-based access

-- Drop the personal_assistants table (no longer needed)
DROP TABLE IF EXISTS personal_assistants CASCADE;

-- Update group_chats table to include owner information
ALTER TABLE group_chats ADD COLUMN IF NOT EXISTS owner_telegram_id BIGINT;
ALTER TABLE group_chats ADD COLUMN IF NOT EXISTS owner_username TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_group_chats_owner_telegram_id ON group_chats(owner_telegram_id);

-- Update RLS policies for group_chats to allow anonymous operations for bot
DROP POLICY IF EXISTS "Allow anonymous operations for bot" ON group_chats;
CREATE POLICY "Allow anonymous operations for bot" ON group_chats
    FOR ALL USING (true);

-- Clean up any existing PA records (they're no longer needed)
-- Note: This is safe since we're removing the entire table 