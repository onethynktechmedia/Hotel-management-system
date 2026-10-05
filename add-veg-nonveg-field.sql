-- Add veg/nonveg field to dishes table
ALTER TABLE dishes 
ADD COLUMN IF NOT EXISTS food_type VARCHAR(20) DEFAULT 'veg';

-- Add payment_type field to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) DEFAULT 'cash';

-- Update existing dishes to have food_type
UPDATE dishes SET food_type = 'veg' WHERE food_type IS NULL;
