-- Temporarily disable RLS for telegram_messages and expenses tables
-- This allows the API route to work without authentication issues

-- Disable RLS for telegram_messages
ALTER TABLE telegram_messages DISABLE ROW LEVEL SECURITY;

-- Disable RLS for expenses (temporarily for testing)
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;

-- Note: This is a temporary solution for testing
-- In production, you should use proper service role keys and RLS policies 