-- Check if the business_purpose_id column exists in expenses table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'expenses' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if the business_purposes table exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'business_purposes' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check foreign key constraints
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'expenses';

-- Show sample data
SELECT COUNT(*) as expense_count FROM expenses;
SELECT COUNT(*) as purpose_count FROM business_purposes;
SELECT name FROM business_purposes ORDER BY name;
