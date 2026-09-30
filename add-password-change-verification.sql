-- Create password_change_requests table for waiter password change verification
-- This table stores password change requests with email verification tokens

CREATE TABLE IF NOT EXISTS password_change_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  new_password TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_change_requests_user_id ON password_change_requests(user_id);

-- Create index on token for faster verification
CREATE INDEX IF NOT EXISTS idx_password_change_requests_token ON password_change_requests(token);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_password_change_requests_status ON password_change_requests(status);

-- Create index on expires_at for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_password_change_requests_expires_at ON password_change_requests(expires_at);

-- Enable Row Level Security
ALTER TABLE password_change_requests ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to manage all password change requests
CREATE POLICY "Service role can manage all password change requests"
  ON password_change_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policy to allow users to view their own password change requests
CREATE POLICY "Users can view their own password change requests"
  ON password_change_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_password_change_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER password_change_requests_updated_at
  BEFORE UPDATE ON password_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_password_change_requests_updated_at();

-- Comment on table
COMMENT ON TABLE password_change_requests IS 'Stores password change requests with email verification tokens for security';

-- Comment on columns
COMMENT ON COLUMN password_change_requests.user_id IS 'ID of the user whose password is being changed';
COMMENT ON COLUMN password_change_requests.new_password IS 'The new password to be set after verification';
COMMENT ON COLUMN password_change_requests.token IS 'Unique verification token sent to user email';
COMMENT ON COLUMN password_change_requests.expires_at IS 'Timestamp when the verification token expires';
COMMENT ON COLUMN password_change_requests.status IS 'Status of the request: pending, completed, or expired';
