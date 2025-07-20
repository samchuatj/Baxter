-- Create pending_expenses table for expense confirmation flow
CREATE TABLE IF NOT EXISTS pending_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  telegram_id BIGINT NOT NULL,
  expense_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_pending_expenses_user_id ON pending_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_expenses_telegram_id ON pending_expenses(telegram_id);
CREATE INDEX IF NOT EXISTS idx_pending_expenses_status ON pending_expenses(status);
CREATE INDEX IF NOT EXISTS idx_pending_expenses_created_at ON pending_expenses(created_at);

-- Enable Row Level Security
ALTER TABLE pending_expenses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own pending expenses
CREATE POLICY "Users can view their own pending expenses" ON pending_expenses
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own pending expenses
CREATE POLICY "Users can insert their own pending expenses" ON pending_expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own pending expenses
CREATE POLICY "Users can update their own pending expenses" ON pending_expenses
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow service role to manage all pending expenses (for API operations)
CREATE POLICY "Service role can manage all pending expenses" ON pending_expenses
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_pending_expenses_updated_at 
    BEFORE UPDATE ON pending_expenses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 