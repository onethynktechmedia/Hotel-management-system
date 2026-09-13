-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for staff authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'waiter', 'kitchen')),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tables for restaurant seating
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_number INTEGER UNIQUE NOT NULL,
  capacity INTEGER NOT NULL,
  is_occupied BOOLEAN DEFAULT FALSE,
  is_master BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dishes/Menu items
CREATE TABLE dishes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  waiter_id UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'paid')),
  total_amount DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Make table_id nullable for station orders
ALTER TABLE orders ALTER COLUMN table_id DROP NOT NULL;

-- Order items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  dish_id UUID REFERENCES dishes(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10, 2) NOT NULL,
  special_instructions TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'served')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  order_id UUID REFERENCES orders(id),
  type TEXT NOT NULL CHECK (type IN ('new_order', 'order_confirmed', 'order_ready', 'order_completed', 'payment_received')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_waiter_id ON orders(waiter_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Insert default admin user (password: admin123 - you should change this)
INSERT INTO users (email, password, role, name) VALUES
('admin@hotel.com', 'admin123', 'admin', 'Admin User'),
('waiter@hotel.com', 'waiter123', 'waiter', 'John Waiter'),
('kitchen@hotel.com', 'kitchen123', 'kitchen', 'Chef Mike');

-- Insert sample tables
INSERT INTO tables (table_number, capacity) VALUES
(1, 4), (2, 4), (3, 6), (4, 2), (5, 8), (6, 4), (7, 4), (8, 6);

-- Insert sample dishes with images
INSERT INTO dishes (name, description, price, category, image_url) VALUES
('Butter Chicken', 'Creamy tomato-based curry with tender chicken', 350.00, 'Main Course', 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop'),
('Paneer Tikka', 'Grilled cottage cheese with spices', 280.00, 'Starters', 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop'),
('Dal Makhani', 'Creamy black lentils slow-cooked with butter', 220.00, 'Main Course', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop'),
('Naan', 'Traditional Indian bread', 40.00, 'Bread', 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop'),
('Biryani', 'Fragrant rice with aromatic spices and choice of meat', 380.00, 'Main Course', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop'),
('Samosa', 'Crispy pastry filled with spiced potatoes', 60.00, 'Starters', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop'),
('Chicken Tikka', 'Marinated grilled chicken pieces', 320.00, 'Starters', 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop'),
('Vegetable Pulao', 'Fragrant rice with mixed vegetables', 240.00, 'Main Course', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop'),
('Raita', 'Cooling yogurt side dish', 50.00, 'Sides', 'https://images.unsplash.com/photo-1604999333679-b86d54738315?w=400&h=300&fit=crop'),
('Gulab Jamun', 'Sweet milk dumplings in sugar syrup', 120.00, 'Desserts', 'https://images.unsplash.com/photo-1666190094762-2a8a9e3b4b2c?w=400&h=300&fit=crop');

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update users" ON users FOR UPDATE USING (true);

CREATE POLICY "Anyone can view tables" ON tables FOR SELECT USING (true);
CREATE POLICY "Admin can manage tables" ON tables FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view dishes" ON dishes FOR SELECT USING (true);
CREATE POLICY "Admin can manage dishes" ON dishes FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Anyone can insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update orders" ON orders FOR UPDATE USING (true);

CREATE POLICY "Anyone can view order_items" ON order_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert order_items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update order_items" ON order_items FOR UPDATE USING (true);

CREATE POLICY "Users can view their notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Users can insert notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update notifications" ON notifications FOR UPDATE USING (true);

CREATE POLICY "Anyone can view payments" ON payments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert payments" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update payments" ON payments FOR UPDATE USING (true);
