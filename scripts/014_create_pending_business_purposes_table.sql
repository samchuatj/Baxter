-- Create pending_business_purposes table for business purpose confirmation flow
CREATE TABLE IF NOT EXISTS pending_business_purposes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  telegram_id BIGINT NOT NULL,
  purpose_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_pending_business_purposes_user_id ON pending_business_purposes(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_business_purposes_telegram_id ON pending_business_purposes(telegram_id);
CREATE INDEX IF NOT EXISTS idx_pending_business_purposes_status ON pending_business_purposes(status);
CREATE INDEX IF NOT EXISTS idx_pending_business_purposes_created_at ON pending_business_purposes(created_at);

-- Enable Row Level Security
ALTER TABLE pending_business_purposes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own pending business purposes
CREATE POLICY "Users can view their own pending business purposes" ON pending_business_purposes
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own pending business purposes
CREATE POLICY "Users can insert their own pending business purposes" ON pending_business_purposes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own pending business purposes
CREATE POLICY "Users can update their own pending business purposes" ON pending_business_purposes
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow service role to manage all pending business purposes (for API operations)
CREATE POLICY "Service role can manage all pending business purposes" ON pending_business_purposes
  FOR ALL USING (auth.role() = 'service_role');

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_pending_business_purposes_updated_at 
    BEFORE UPDATE ON pending_business_purposes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 