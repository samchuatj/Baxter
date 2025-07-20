-- Fix RLS policies for telegram_messages to allow API routes to work
-- Drop existing policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON telegram_messages;
DROP POLICY IF EXISTS "Allow insert for anonymous users" ON telegram_messages;
DROP POLICY IF EXISTS "Allow select own messages" ON telegram_messages;

-- Create new policies that allow API routes to work
-- Allow insert for all users (needed for API routes)
CREATE POLICY "Allow insert for all users" ON telegram_messages
  FOR INSERT WITH CHECK (true);

-- Allow select for users to see their own messages
CREATE POLICY "Allow select own messages" ON telegram_messages
  FOR SELECT USING (auth.uid() = user_id);

-- Allow update for users to update their own messages
CREATE POLICY "Allow update own messages" ON telegram_messages
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow delete for users to delete their own messages
CREATE POLICY "Allow delete own messages" ON telegram_messages
  FOR DELETE USING (auth.uid() = user_id); 