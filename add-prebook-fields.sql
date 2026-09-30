-- Add pre-booking fields to tables table
ALTER TABLE tables ADD COLUMN IF NOT EXISTS is_prebooked BOOLEAN DEFAULT FALSE;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS prebooked_by TEXT;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS prebooked_time TIMESTAMP WITH TIME ZONE;
