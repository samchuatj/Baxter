-- Insert sample expenses for testing
-- Note: This will only work if you have a user account created
-- Replace the user_id with an actual user ID from your auth.users table

INSERT INTO expenses (user_id, date, merchant_name, total_amount, business_purpose, receipt_filename) VALUES
  (auth.uid(), '2024-01-15', 'Office Depot', 45.99, 'Office supplies for Q1 project', 'receipt_office_depot_20240115.pdf'),
  (auth.uid(), '2024-01-18', 'Starbucks', 12.50, 'Client meeting coffee', 'receipt_starbucks_20240118.pdf'),
  (auth.uid(), '2024-01-22', 'Uber', 28.75, 'Transportation to client site', 'receipt_uber_20240122.pdf'),
  (auth.uid(), '2024-01-25', 'Amazon Business', 156.80, 'Computer accessories and cables', 'receipt_amazon_20240125.pdf'),
  (auth.uid(), '2024-02-02', 'FedEx', 22.30, 'Shipping documents to client', 'receipt_fedex_20240202.pdf'),
  (auth.uid(), '2024-02-05', 'Best Buy', 89.99, 'External hard drive for backups', 'receipt_bestbuy_20240205.pdf'),
  (auth.uid(), '2024-02-10', 'Shell Gas Station', 65.40, 'Fuel for business travel', 'receipt_shell_20240210.pdf'),
  (auth.uid(), '2024-02-14', 'Hilton Hotel', 189.00, 'Accommodation for conference', 'receipt_hilton_20240214.pdf');
