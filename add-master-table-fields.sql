-- Add master table fields to tables table
ALTER TABLE tables ADD COLUMN IF NOT EXISTS master_table_id TEXT;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT FALSE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_master_table_id ON tables(master_table_id);
