-- Create telegram_messages table to store messages from Telegram
CREATE TABLE IF NOT EXISTS telegram_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'image')),
  original_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE telegram_messages ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON telegram_messages
  FOR ALL USING (auth.role() = 'authenticated');

-- Allow insert for anonymous users (for API routes)
CREATE POLICY "Allow insert for anonymous users" ON telegram_messages
  FOR INSERT WITH CHECK (true);

-- Allow select for users to see their own messages
CREATE POLICY "Allow select own messages" ON telegram_messages
  FOR SELECT USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_telegram_messages_user_id ON telegram_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_telegram_id ON telegram_messages(telegram_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_created_at ON telegram_messages(created_at); 