-- Delete all sample expenses from the expenses table
-- This will remove all expense records for the current user

DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete all expenses and get the count
    DELETE FROM expenses;
    
    -- Get the number of deleted rows
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Show confirmation message
    RAISE NOTICE 'Successfully deleted % expense records', deleted_count;
    
    -- Reset the sequence if you want to start IDs from 1 again (optional)
    -- Note: This is only needed if you're using a serial/sequence for IDs
    -- Since we're using UUIDs, this step is not necessary
    
END $$;
