-- Add order_type column to orders table to track Normal, Repeat, or Extra orders
ALTER TABLE orders ADD COLUMN order_type TEXT DEFAULT 'Normal';

-- Update existing orders to have 'Normal' as default
UPDATE orders SET order_type = 'Normal' WHERE order_type IS NULL;

-- Add customer_name and customer_mobile columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'customer_name'
    ) THEN
        ALTER TABLE orders ADD COLUMN customer_name TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'customer_mobile'
    ) THEN
        ALTER TABLE orders ADD COLUMN customer_mobile TEXT;
    END IF;
END $$;
