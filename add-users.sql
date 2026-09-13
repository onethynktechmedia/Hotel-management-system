-- Add waiter and kitchen users to existing database
-- Run this only if tables already exist

INSERT INTO users (email, password, role, name) VALUES
('waiter@hotel.com', 'waiter123', 'waiter', 'John Waiter'),
('kitchen@hotel.com', 'kitchen123', 'kitchen', 'Chef Mike')
ON CONFLICT (email) DO NOTHING;
