-- Create offers table for Dhole Patil Khanawal
CREATE TABLE IF NOT EXISTS offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  discount_percent DECIMAL(5, 2) NOT NULL,
  min_order_value DECIMAL(10, 2),
  max_discount DECIMAL(10, 2),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_promotional BOOLEAN DEFAULT false,
  applicable_dishes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_offers_is_active ON offers(is_active);
CREATE INDEX IF NOT EXISTS idx_offers_dates ON offers(start_date, end_date);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample offers
INSERT INTO offers (title, description, discount_percent, min_order_value, max_discount, start_date, end_date, is_active, is_promotional) VALUES
('Weekend Special', 'Get 20% off on all orders this weekend', 20, 500, 200, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', true, true),
('First Order Discount', '15% off on your first order', 15, 300, 100, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', true, false),
('Lunch Special', '10% off on orders between 12 PM - 3 PM', 10, 200, 50, CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', true, true)
ON CONFLICT DO NOTHING;
