-- Add is_master column to tables table
ALTER TABLE tables ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT FALSE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_tables_is_master ON tables(is_master);
