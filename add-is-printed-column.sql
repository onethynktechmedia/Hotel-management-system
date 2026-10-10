-- Add is_printed column to orders table
ALTER TABLE orders ADD COLUMN is_printed BOOLEAN DEFAULT FALSE;
