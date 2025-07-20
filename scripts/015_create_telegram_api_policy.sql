-- Create a specific RLS policy for Telegram API operations
-- This policy allows the API route to insert expenses and messages for verified users

-- For telegram_messages table
CREATE POLICY "Allow Telegram API inserts" ON telegram_messages
  FOR INSERT WITH CHECK (
    -- Allow if the user_id matches a verified telegram user
    EXISTS (
      SELECT 1 FROM telegram_users 
      WHERE telegram_users.user_id = telegram_messages.user_id
    )
  );

-- For expenses table  
CREATE POLICY "Allow Telegram API expense inserts" ON expenses
  FOR INSERT WITH CHECK (
    -- Allow if the user_id matches a verified telegram user
    EXISTS (
      SELECT 1 FROM telegram_users 
      WHERE telegram_users.user_id = expenses.user_id
    )
  );

-- Note: These policies only allow INSERT operations
-- SELECT, UPDATE, DELETE operations are still protected by existing RLS policies 