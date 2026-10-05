-- Add sample non-veg dishes to the database
-- Run this in your Supabase SQL editor

-- Insert non-veg dishes
INSERT INTO dishes (name, description, price, category, image_url, is_available, food_type) VALUES
('Chicken Biryani', 'Aromatic basmati rice cooked with tender chicken pieces and authentic spices', 280, 'Main Course', null, true, 'nonveg'),
('Butter Chicken', 'Creamy tomato-based curry with tender chicken pieces', 250, 'Main Course', null, true, 'nonveg'),
('Chicken Tikka', 'Marinated chicken pieces grilled to perfection with Indian spices', 220, 'Starters', null, true, 'nonveg'),
('Mutton Biryani', 'Rich and flavorful basmati rice with tender mutton pieces', 320, 'Main Course', null, true, 'nonveg'),
('Egg Curry', 'Hard-boiled eggs in a spiced tomato and onion gravy', 180, 'Main Course', null, true, 'nonveg'),
('Fish Curry', 'Fresh fish cooked in traditional coastal spices', 240, 'Main Course', null, true, 'nonveg'),
('Chicken 65', 'Spicy deep-fried chicken with bold South Indian flavors', 200, 'Starters', null, true, 'nonveg'),
('Prawn Masala', 'Succulent prawns in a rich and spicy tomato-based gravy', 300, 'Main Course', null, true, 'nonveg'),
('Chicken Korma', 'Mild and creamy chicken curry with aromatic spices', 260, 'Main Course', null, true, 'nonveg'),
('Seekh Kebab', 'Minced meat skewers grilled with traditional spices', 230, 'Starters', null, true, 'nonveg');

-- Update existing dishes to ensure they have food_type set
UPDATE dishes SET food_type = 'veg' WHERE food_type IS NULL OR food_type = '';
