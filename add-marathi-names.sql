-- Add Marathi name field to dishes table
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS marathi_name TEXT;
