-- Add offer columns to dishes table
ALTER TABLE dishes
ADD COLUMN IF NOT EXISTS offer TEXT,
ADD COLUMN IF NOT EXISTS offer_discount DECIMAL(5, 2);
