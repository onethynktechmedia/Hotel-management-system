-- Add item_type column to order_items table to track Normal or Extra items
ALTER TABLE order_items ADD COLUMN item_type TEXT DEFAULT 'Normal';

-- Update existing order_items to have 'Normal' as default
UPDATE order_items SET item_type = 'Normal' WHERE item_type IS NULL;
