-- Migration: Add receipt_hash to expenses and enforce uniqueness per user

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_hash TEXT;

-- Create a unique index to prevent duplicate receipts per user
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_receipt_hash ON expenses(user_id, receipt_hash); 