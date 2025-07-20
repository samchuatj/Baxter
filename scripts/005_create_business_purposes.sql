-- Create the business_purposes table
CREATE TABLE IF NOT EXISTS business_purposes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_purposes_name ON business_purposes(name);

-- Enable Row Level Security
ALTER TABLE business_purposes ENABLE ROW LEVEL SECURITY;

-- Create policies for business_purposes
-- Everyone can view all purposes (they're shared across users)
CREATE POLICY "Everyone can view business purposes" ON business_purposes
  FOR SELECT USING (true);

-- Users can insert new purposes
CREATE POLICY "Users can insert business purposes" ON business_purposes
  FOR INSERT WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

-- Users can update purposes they created
CREATE POLICY "Users can update their own business purposes" ON business_purposes
  FOR UPDATE USING (auth.uid() = created_by);

-- Insert the default business purposes
INSERT INTO business_purposes (name, is_default, created_by) VALUES
  ('Travel', true, NULL),
  ('Software Subscription', true, NULL),
  ('Food', true, NULL),
  ('Others', true, NULL);

-- Add the business_purpose_id column to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS business_purpose_id UUID REFERENCES business_purposes(id);

-- Create index for the foreign key
CREATE INDEX IF NOT EXISTS idx_expenses_business_purpose_id ON expenses(business_purpose_id);

-- Update existing expenses to use the new business_purpose_id
-- This maps existing text values to the new purpose IDs
DO $$
DECLARE
    travel_id UUID;
    software_id UUID;
    food_id UUID;
    others_id UUID;
BEGIN
    -- Get the IDs for each purpose
    SELECT id INTO travel_id FROM business_purposes WHERE name = 'Travel';
    SELECT id INTO software_id FROM business_purposes WHERE name = 'Software Subscription';
    SELECT id INTO food_id FROM business_purposes WHERE name = 'Food';
    SELECT id INTO others_id FROM business_purposes WHERE name = 'Others';
    
    -- Update existing expenses based on their business_purpose text
    UPDATE expenses SET business_purpose_id = travel_id 
    WHERE business_purpose ILIKE '%travel%' OR business_purpose ILIKE '%flight%' OR business_purpose ILIKE '%hotel%' OR business_purpose ILIKE '%accommodation%' OR business_purpose ILIKE '%transportation%' OR business_purpose ILIKE '%rental%';
    
    UPDATE expenses SET business_purpose_id = software_id 
    WHERE business_purpose ILIKE '%software%' OR business_purpose ILIKE '%subscription%' OR business_purpose ILIKE '%license%' OR business_purpose ILIKE '%saas%' OR business_purpose ILIKE '%platform%' OR business_purpose ILIKE '%tool%';
    
    UPDATE expenses SET business_purpose_id = food_id 
    WHERE business_purpose ILIKE '%lunch%' OR business_purpose ILIKE '%coffee%' OR business_purpose ILIKE '%meal%' OR business_purpose ILIKE '%food%' OR business_purpose ILIKE '%restaurant%' OR business_purpose ILIKE '%dining%';
    
    -- Set remaining expenses to 'Others'
    UPDATE expenses SET business_purpose_id = others_id 
    WHERE business_purpose_id IS NULL AND business_purpose IS NOT NULL;
    
    RAISE NOTICE 'Updated existing expenses with business purpose categories';
END $$;
