-- Add missing columns to telegram_messages table
ALTER TABLE telegram_messages 
ADD COLUMN IF NOT EXISTS ai_response TEXT,
ADD COLUMN IF NOT EXISTS expense_json TEXT,
ADD COLUMN IF NOT EXISTS expense_created BOOLEAN DEFAULT FALSE;

-- Update the table comment to reflect the new structure
COMMENT ON TABLE telegram_messages IS 'Stores messages from Telegram with AI processing results and expense creation status'; 