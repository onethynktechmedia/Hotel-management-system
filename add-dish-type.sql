-- Add dish_type column to order_items table
ALTER TABLE order_items ADD COLUMN dish_type TEXT DEFAULT 'Normal';

-- Update existing order_items to have 'Normal' as default
UPDATE order_items SET dish_type = 'Normal' WHERE dish_type IS NULL;
