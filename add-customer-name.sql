-- Add customer_name and customer_mobile columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_mobile TEXT;
