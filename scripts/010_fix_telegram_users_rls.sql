-- Fix RLS policies for telegram_users table to allow anonymous inserts
-- Drop existing policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON telegram_users;
DROP POLICY IF EXISTS "Allow insert for anonymous users" ON telegram_users;
DROP POLICY IF EXISTS "Allow select for anonymous users" ON telegram_users;
DROP POLICY IF EXISTS "Allow delete for anonymous users" ON telegram_users;

-- Create new policies that allow anonymous operations
-- Allow insert for anonymous users (for API routes)
CREATE POLICY "Allow insert for anonymous users" ON telegram_users
  FOR INSERT WITH CHECK (true);

-- Allow select for anonymous users (for API routes)
CREATE POLICY "Allow select for anonymous users" ON telegram_users
  FOR SELECT USING (true);

-- Allow update for anonymous users (for API routes)
CREATE POLICY "Allow update for anonymous users" ON telegram_users
  FOR UPDATE USING (true);

-- Allow delete for anonymous users (for API routes)
CREATE POLICY "Allow delete for anonymous users" ON telegram_users
  FOR DELETE USING (true);

-- Also allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON telegram_users
  FOR ALL USING (auth.role() = 'authenticated'); 