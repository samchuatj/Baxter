-- First, let's get the user ID from the auth.users table
-- Replace 'YOUR_EMAIL_HERE' with your actual email address
-- Or run: SELECT id FROM auth.users LIMIT 1; to get any user ID

-- Method 1: Insert sample data for a specific user
-- Replace the UUID below with your actual user ID from auth.users table
DO $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get the first user from auth.users (or specify your email)
    SELECT id INTO current_user_id FROM auth.users LIMIT 1;
    
    -- If no user found, raise an error
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No user found in auth.users table. Please create a user account first.';
    END IF;
    
    -- Insert sample expenses using the found user ID
    INSERT INTO expenses (user_id, date, merchant_name, total_amount, business_purpose, receipt_filename) VALUES
    -- January 2024 expenses
    (current_user_id, '2024-01-03', 'Office Depot', 45.99, 'Office supplies for Q1 project', 'receipt_office_depot_20240103.pdf'),
    (current_user_id, '2024-01-05', 'Starbucks', 12.50, 'Client meeting coffee', 'receipt_starbucks_20240105.pdf'),
    (current_user_id, '2024-01-08', 'Uber', 28.75, 'Transportation to client site', 'receipt_uber_20240108.pdf'),
    (current_user_id, '2024-01-12', 'Amazon Business', 156.80, 'Computer accessories and cables', 'receipt_amazon_20240112.pdf'),
    (current_user_id, '2024-01-15', 'Marriott Hotel', 189.00, 'Accommodation for conference', 'receipt_marriott_20240115.pdf'),
    (current_user_id, '2024-01-18', 'Shell Gas Station', 65.40, 'Fuel for business travel', 'receipt_shell_20240118.pdf'),
    (current_user_id, '2024-01-22', 'FedEx', 22.30, 'Shipping documents to client', 'receipt_fedex_20240122.pdf'),
    (current_user_id, '2024-01-25', 'Best Buy', 89.99, 'External hard drive for backups', 'receipt_bestbuy_20240125.pdf'),
    (current_user_id, '2024-01-28', 'LinkedIn Premium', 59.99, 'Professional networking subscription', 'receipt_linkedin_20240128.pdf'),
    
    -- February 2024 expenses
    (current_user_id, '2024-02-02', 'Panera Bread', 18.45, 'Working lunch with team', 'receipt_panera_20240202.pdf'),
    (current_user_id, '2024-02-05', 'Microsoft Store', 299.99, 'Office 365 Business license', 'receipt_microsoft_20240205.pdf'),
    (current_user_id, '2024-02-08', 'Delta Airlines', 450.00, 'Flight to client presentation', 'receipt_delta_20240208.pdf'),
    (current_user_id, '2024-02-12', 'Staples', 34.67, 'Printer paper and supplies', 'receipt_staples_20240212.pdf'),
    (current_user_id, '2024-02-15', 'Zoom', 14.99, 'Video conferencing subscription', 'receipt_zoom_20240215.pdf'),
    (current_user_id, '2024-02-18', 'Hertz Car Rental', 125.50, 'Rental car for business trip', 'receipt_hertz_20240218.pdf'),
    (current_user_id, '2024-02-22', 'Adobe Creative Cloud', 52.99, 'Design software subscription', 'receipt_adobe_20240222.pdf'),
    (current_user_id, '2024-02-25', 'Costco Business', 78.90, 'Bulk office snacks and supplies', 'receipt_costco_20240225.pdf'),
    
    -- March 2024 expenses
    (current_user_id, '2024-03-01', 'Slack', 8.00, 'Team communication platform', 'receipt_slack_20240301.pdf'),
    (current_user_id, '2024-03-05', 'Home Depot', 145.30, 'Office renovation materials', 'receipt_homedepot_20240305.pdf'),
    (current_user_id, '2024-03-08', 'Chipotle', 15.75, 'Working lunch during project deadline', 'receipt_chipotle_20240308.pdf'),
    (current_user_id, '2024-03-12', 'Apple Store', 199.00, 'iPad accessories for presentations', 'receipt_apple_20240312.pdf'),
    (current_user_id, '2024-03-15', 'Dropbox Business', 20.00, 'Cloud storage upgrade', 'receipt_dropbox_20240315.pdf'),
    (current_user_id, '2024-03-18', 'Lyft', 32.80, 'Airport transportation', 'receipt_lyft_20240318.pdf'),
    (current_user_id, '2024-03-22', 'GitHub', 4.00, 'Private repository hosting', 'receipt_github_20240322.pdf'),
    (current_user_id, '2024-03-25', 'Hilton Garden Inn', 165.00, 'Hotel for client workshop', 'receipt_hilton_20240325.pdf'),
    
    -- Test cases for edge scenarios
    (current_user_id, '2024-03-28', 'Target', 23.45, NULL, 'receipt_target_20240328.pdf'),
    (current_user_id, '2024-03-30', 'Subway', 9.99, 'Quick lunch between meetings', NULL),
    (current_user_id, '2024-04-01', 'Dell Technologies', 2499.99, 'New laptop for development work', 'receipt_dell_20240401.pdf'),
    (current_user_id, '2024-04-03', 'Notion', 10.00, 'Project management tool subscription', 'receipt_notion_20240403.pdf'),
    (current_user_id, '2024-04-05', 'Canva Pro', 12.99, 'Design tool for marketing materials', 'receipt_canva_20240405.pdf'),
    (current_user_id, '2024-04-08', 'Grammarly Business', 15.00, 'Writing assistance tool', 'receipt_grammarly_20240408.pdf'),
    (current_user_id, '2024-04-10', 'Coursera', 49.00, 'Professional development course', 'receipt_coursera_20240410.pdf'),
    (current_user_id, '2024-04-12', 'WeWork', 350.00, 'Coworking space monthly membership', 'receipt_wework_20240412.pdf');
    
    RAISE NOTICE 'Successfully inserted % expense records for user %', 32, current_user_id;
END $$;
