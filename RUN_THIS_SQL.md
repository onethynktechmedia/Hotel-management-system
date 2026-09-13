# Database Schema Update Required

To enable the enhanced waiter management features, you need to run the following SQL in your Supabase SQL Editor:

```sql
-- Add additional fields to users table for waiter management
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

## Steps to Apply:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the SQL above
4. Click "Run" to execute the changes

## What This Adds:

- `phone`: Optional phone number for waiters
- `is_available`: Boolean field to track waiter availability
- `last_active`: Timestamp to track when waiter was last active

These fields are required for the enhanced waiter management features including:
- Adding new waiters with login credentials
- Editing waiter details
- Resetting waiter passwords
- Managing waiter availability status
- Phone number contact information
