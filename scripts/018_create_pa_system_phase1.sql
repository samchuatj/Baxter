-- Phase 1: Personal Assistant System - Database Schema
-- Batch 1: Basic tables for PA functionality

-- Create personal_assistants table
CREATE TABLE IF NOT EXISTS personal_assistants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    pa_telegram_id BIGINT NOT NULL,
    pa_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_chats table
CREATE TABLE IF NOT EXISTS group_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    chat_id BIGINT NOT NULL UNIQUE,
    chat_title TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pa_web_access_tokens table
CREATE TABLE IF NOT EXISTS pa_web_access_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    pa_telegram_id BIGINT NOT NULL,
    access_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_personal_assistants_user_id ON personal_assistants(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_assistants_telegram_id ON personal_assistants(pa_telegram_id);
CREATE INDEX IF NOT EXISTS idx_group_chats_user_id ON group_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_group_chats_chat_id ON group_chats(chat_id);
CREATE INDEX IF NOT EXISTS idx_pa_web_access_tokens_user_id ON pa_web_access_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_pa_web_access_tokens_token ON pa_web_access_tokens(access_token);
CREATE INDEX IF NOT EXISTS idx_pa_web_access_tokens_expires ON pa_web_access_tokens(expires_at);

-- Enable Row Level Security
ALTER TABLE personal_assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE pa_web_access_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for personal_assistants
CREATE POLICY "Users can view their own PAs" ON personal_assistants
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own PAs" ON personal_assistants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own PAs" ON personal_assistants
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own PAs" ON personal_assistants
    FOR DELETE USING (auth.uid() = user_id);

-- Allow anonymous operations for bot API routes
CREATE POLICY "Allow anonymous operations for bot" ON personal_assistants
    FOR ALL USING (true);

-- RLS Policies for group_chats
CREATE POLICY "Users can view their own group chats" ON group_chats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own group chats" ON group_chats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own group chats" ON group_chats
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own group chats" ON group_chats
    FOR DELETE USING (auth.uid() = user_id);

-- Allow anonymous operations for bot API routes
CREATE POLICY "Allow anonymous operations for bot" ON group_chats
    FOR ALL USING (true);

-- RLS Policies for pa_web_access_tokens
CREATE POLICY "Users can view their own PA tokens" ON pa_web_access_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own PA tokens" ON pa_web_access_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own PA tokens" ON pa_web_access_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Allow anonymous operations for token validation
CREATE POLICY "Allow anonymous token validation" ON pa_web_access_tokens
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous token creation" ON pa_web_access_tokens
    FOR INSERT WITH CHECK (true);

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_pa_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM pa_web_access_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add unique constraint to prevent duplicate PA relationships
ALTER TABLE personal_assistants ADD CONSTRAINT unique_user_pa_telegram 
    UNIQUE (user_id, pa_telegram_id);

-- Add unique constraint to prevent duplicate group chat registrations
ALTER TABLE group_chats ADD CONSTRAINT unique_user_chat 
    UNIQUE (user_id, chat_id); 