-- Update RLS policies for business_purposes table
-- This ensures users can only see their own custom purposes, but everyone can see default ones

-- Drop existing policies
DROP POLICY IF EXISTS "Everyone can view business purposes" ON business_purposes;
DROP POLICY IF EXISTS "Users can insert business purposes" ON business_purposes;
DROP POLICY IF EXISTS "Users can update their own business purposes" ON business_purposes;

-- Create new policies for business_purposes
-- Users can view default purposes (is_default = true) OR purposes they created
CREATE POLICY "Users can view default and their own business purposes" ON business_purposes
  FOR SELECT USING (
    is_default = true OR 
    (created_by IS NOT NULL AND auth.uid() = created_by)
  );

-- Users can insert new purposes (must be non-default and created_by must be their user ID)
CREATE POLICY "Users can insert their own business purposes" ON business_purposes
  FOR INSERT WITH CHECK (
    is_default = false AND 
    auth.uid() = created_by
  );

-- Users can update purposes they created (but not default ones)
CREATE POLICY "Users can update their own business purposes" ON business_purposes
  FOR UPDATE USING (
    is_default = false AND 
    created_by IS NOT NULL AND 
    auth.uid() = created_by
  );

-- Users can delete purposes they created (but not default ones)
CREATE POLICY "Users can delete their own business purposes" ON business_purposes
  FOR DELETE USING (
    is_default = false AND 
    created_by IS NOT NULL AND 
    auth.uid() = created_by
  );

-- Add a unique constraint to prevent duplicate names per user
-- This allows different users to have the same custom purpose name
ALTER TABLE business_purposes DROP CONSTRAINT IF EXISTS business_purposes_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_purposes_name_user 
ON business_purposes (name, created_by) 
WHERE created_by IS NOT NULL;

-- Add a unique constraint for default purposes (name must be unique when created_by is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_purposes_name_default 
ON business_purposes (name) 
WHERE created_by IS NULL; 