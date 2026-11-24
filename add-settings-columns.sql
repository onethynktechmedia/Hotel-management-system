-- Add missing columns to settings table for hotel configuration
ALTER TABLE settings ADD COLUMN IF NOT EXISTS tax_rates JSONB DEFAULT '{"cgst": 5, "sgst": 5}';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS printer_settings JSONB DEFAULT '{"printer_type": "thermal_58mm", "auto_print": true, "paper_size": "58mm"}';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"new_orders": true, "low_inventory": true, "staff_changes": false}';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS theme_settings JSONB DEFAULT '{"primary_color": "#6B3E26", "secondary_color": "#9A572D"}';
