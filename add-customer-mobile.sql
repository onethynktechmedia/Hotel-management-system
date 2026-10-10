-- Add customer_mobile and customer_name columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_mobile TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_description TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT;
