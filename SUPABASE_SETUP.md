# Supabase Setup Instructions

## Step 1: Disable RLS (Row Level Security) in Supabase

This is REQUIRED for the app to work. Follow these exact steps:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Login to your account
   - Click on your "Hotel" project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar (looks like `>_`)
   - Click "New Query" button

3. **Run this SQL**
   ```sql
   ALTER TABLE public.dishes DISABLE ROW LEVEL SECURITY;
   ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
   ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
   ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
   ALTER TABLE public.tables DISABLE ROW LEVEL SECURITY;
   ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
   ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
   ```

4. **Click "Run" button**
   - Wait for "Success" message
   - This will disable RLS on all tables

## Step 2: Verify Environment Variables

Check that `.env.local` exists with correct credentials:

```bash
cat .env.local
```

It should contain:
```
NEXT_PUBLIC_SUPABASE_URL=https://qthtkmlvoarafrxyjdpe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0aHRrbWx2b2FyYWZyeHlqZHBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NjY2MTcsImV4cCI6MjEwNDI0MjYxN30.VagDFieZVq2Ni5ofDBXENH0KC34SD744hjbqIGD1IvE
```

## Step 3: Restart the Development Server

```bash
# Kill existing server
pkill -f "next dev"

# Start new server
npm run dev
```

## Step 4: Test the API

### Option A: Using curl (Linux/Mac)

```bash
chmod +x test-api.sh
./test-api.sh
```

### Option B: Using Postman

**GET Request:**
- **URL**: `http://localhost:3000/api/dishes`
- **Method**: `GET`
- **Headers**: 
  - `Content-Type: application/json`

**Expected Response:**
```json
[
  {
    "id": "uuid",
    "name": "Dish Name",
    "description": "Description",
    "price": 100.00,
    "category": "category",
    "image_url": "url",
    "is_available": true,
    "created_at": "timestamp"
  }
]
```

### Option C: Using Browser

Open in browser:
```
http://localhost:3000/api/dishes
```

## Step 5: Test the Menu Page

Open in browser:
```
http://localhost:3000/menu
```

## Troubleshooting

### If API returns 404:
- Restart the dev server
- Check that `/src/app/api/dishes/route.ts` exists
- Clear Next.js cache: `rm -rf .next`

### If API returns 500:
- Check server console for error logs
- Verify Supabase credentials in `.env.local`
- Ensure RLS is disabled in Supabase

### If dishes don't load:
- Check browser console for errors
- Verify Supabase has data in `dishes` table
- Check network tab in browser dev tools

## API Endpoints Reference

### Dishes
- `GET /api/dishes` - Get all dishes
- `POST /api/dishes` - Create new dish
- `PATCH /api/dishes/[id]` - Update dish
- `DELETE /api/dishes/[id]` - Delete dish

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `PATCH /api/orders/[id]` - Update order
- `DELETE /api/orders/[id]` - Delete order

### Tables
- `GET /api/tables` - Get all tables
- `POST /api/tables` - Create new table
- `PATCH /api/tables/[id]` - Update table
- `DELETE /api/tables/[id]` - Delete table

### Auth
- `POST /api/auth/login` - User login
