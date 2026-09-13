-- Fix RLS policies to allow all operations on orders
-- Run this in your Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view orders" ON orders;
DROP POLICY IF EXISTS "Anyone can insert orders" ON orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON orders;

-- Create simple policy that allows all operations
CREATE POLICY "Enable all access on orders" ON orders FOR ALL USING (true) WITH CHECK (true);

-- Also fix order_items policies
DROP POLICY IF EXISTS "Anyone can view order_items" ON order_items;
DROP POLICY IF EXISTS "Anyone can insert order_items" ON order_items;
DROP POLICY IF EXISTS "Anyone can update order_items" ON order_items;

CREATE POLICY "Enable all access on order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

-- Fix notifications policies
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update notifications" ON notifications;

CREATE POLICY "Enable all access on notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- Fix tables policies
DROP POLICY IF EXISTS "Anyone can view tables" ON tables;
DROP POLICY IF EXISTS "Admin can manage tables" ON tables;

CREATE POLICY "Enable all access on tables" ON tables FOR ALL USING (true) WITH CHECK (true);
