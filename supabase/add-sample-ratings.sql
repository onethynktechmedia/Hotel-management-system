-- Add sample ratings to dishes
-- This script adds random ratings (3-5 stars) to existing dishes

-- First, let's check if dish_ratings table exists
-- If not, create it
CREATE TABLE IF NOT EXISTS dish_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dish_id UUID REFERENCES dishes(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  user_ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add sample ratings for each dish
-- Adjust the number of ratings based on your actual dishes

-- Example: Add 20 random ratings for a specific dish (replace UUID with actual dish ID)
-- You can run this multiple times with different dish IDs

-- Uncomment and modify these lines after getting actual dish IDs:
/*
INSERT INTO dish_ratings (dish_id, rating, user_ip, user_agent)
SELECT
  'YOUR_DISH_UUID_HERE',
  (random() * 2 + 3)::integer, -- Random rating between 3 and 5
  '192.168.1.' || (random() * 255)::integer,
  'Sample Rating'
FROM generate_series(1, 20);
*/

-- To get dish IDs, run:
-- SELECT id, name FROM dishes;
