-- Add is_service column to dishes table for special cooking services
-- This column distinguishes between fixed-price items and rate-based services

ALTER TABLE dishes
ADD COLUMN IF NOT EXISTS is_service BOOLEAN DEFAULT FALSE;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_dishes_is_service ON dishes(is_service);
