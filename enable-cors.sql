-- Enable CORS for localhost:3000
-- Run this in your Supabase SQL Editor

-- This SQL will configure CORS to allow requests from localhost:3000
-- Note: CORS is typically configured at the project level, but we can try this approach

-- Alternative: Use Supabase CLI if you have it installed
-- Run this in your terminal:
-- supabase cors add http://localhost:3000

-- If the above doesn't work, you may need to:
-- 1. Go to Project Settings → API in Supabase dashboard
-- 2. Look for "Additional CORS URLs" or similar
-- 3. Add http://localhost:3000

-- For now, let's try to disable RLS temporarily to see if that helps
-- This is not a CORS fix but might help with permissions

ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE tables DISABLE ROW LEVEL SECURITY;
ALTER TABLE dishes DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
