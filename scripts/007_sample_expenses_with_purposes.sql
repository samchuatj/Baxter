-- Insert 5 sample expenses with business purposes
-- This script will create expenses linked to the business purpose categories

DO $$
DECLARE
    current_user_id UUID;
    travel_id UUID;
    software_id UUID;
    food_id UUID;
    others_id UUID;
BEGIN
    -- Get the first user from auth.users
    SELECT id INTO current_user_id FROM auth.users LIMIT 1;
    
    -- If no user found, raise an error
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No user found in auth.users table. Please create a user account first.';
    END IF;
    
    -- Get the business purpose IDs
    SELECT id INTO travel_id FROM business_purposes WHERE name = 'Travel';
    SELECT id INTO software_id FROM business_purposes WHERE name = 'Software Subscription';
    SELECT id INTO food_id FROM business_purposes WHERE name = 'Food';
    SELECT id INTO others_id FROM business_purposes WHERE name = 'Others';
    
    -- Insert 5 sample expenses with different business purposes
    INSERT INTO expenses (user_id, date, merchant_name, total_amount, business_purpose_id, receipt_filename) VALUES
    
    -- Travel expense
    (current_user_id, '2024-01-15', 'Delta Airlines', 450.00, travel_id, 'receipt_delta_20240115.pdf'),
    
    -- Software subscription expense
    (current_user_id, '2024-01-18', 'Adobe Creative Cloud', 52.99, software_id, 'receipt_adobe_20240118.pdf'),
    
    -- Food expense
    (current_user_id, '2024-01-20', 'Starbucks', 12.50, food_id, 'receipt_starbucks_20240120.pdf'),
    
    -- Others expense
    (current_user_id, '2024-01-22', 'Office Depot', 89.99, others_id, 'receipt_office_depot_20240122.pdf'),
    
    -- Travel expense without receipt (edge case)
    (current_user_id, '2024-01-25', 'Uber', 28.75, travel_id, NULL);
    
    RAISE NOTICE 'Successfully inserted 5 sample expenses for user %', current_user_id;
    
    -- Show summary of what was inserted
    RAISE NOTICE 'Sample expenses created:';
    RAISE NOTICE '- Delta Airlines ($450.00) - Travel';
    RAISE NOTICE '- Adobe Creative Cloud ($52.99) - Software Subscription';
    RAISE NOTICE '- Starbucks ($12.50) - Food';
    RAISE NOTICE '- Office Depot ($89.99) - Others';
    RAISE NOTICE '- Uber ($28.75) - Travel (no receipt)';
    
END $$;
