-- Create telegram_users table to map Telegram users to Supabase users
CREATE TABLE IF NOT EXISTS telegram_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_telegram_users_telegram_id ON telegram_users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_telegram_users_user_id ON telegram_users(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own telegram mappings
CREATE POLICY "Users can view their own telegram mappings" ON telegram_users
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own telegram mappings
CREATE POLICY "Users can insert their own telegram mappings" ON telegram_users
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own telegram mappings
CREATE POLICY "Users can update their own telegram mappings" ON telegram_users
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own telegram mappings
CREATE POLICY "Users can delete their own telegram mappings" ON telegram_users
    FOR DELETE USING (auth.uid() = user_id); 