# Offers Management System - Setup Guide

## ✅ What's Been Implemented

### 1. **Offers Sidebar Tab**
- Added "Offers" tab to admin dashboard sidebar
- Located between "Menu" and "Tables"
- Shows offers icon (TrendingUp)

### 2. **Offers Management Page**
Full CRUD operations for offers:
- **View** all offers in a table
- **Add** new offers with modal form
- **Edit** existing offers
- **Delete** offers with confirmation
- **Toggle** active/inactive status

### 3. **Offer Fields**
- Title (required)
- Description
- Discount Percentage (1-100%)
- Minimum Order Value
- Maximum Discount Cap
- Start Date (required)
- End Date (required)
- Active Status (toggle)
- Promotional Status (toggle)

### 4. **API Endpoints**
- `GET /api/offers` - Fetch all offers
- `POST /api/offers` - Create new offer
- `PATCH /api/offers/[id]` - Update offer
- `DELETE /api/offers/[id]` - Delete offer

### 5. **Database Schema**
Table: `offers`
- id (UUID, primary key)
- title (VARCHAR 255)
- description (TEXT)
- discount_percent (DECIMAL)
- min_order_value (DECIMAL)
- max_discount (DECIMAL)
- start_date (DATE)
- end_date (DATE)
- is_active (BOOLEAN)
- is_promotional (BOOLEAN)
- applicable_dishes (TEXT[])
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

## 📋 Setup Instructions

### Step 1: Create the Offers Table in Supabase

1. Go to your Supabase Dashboard: https://qthtkmlvoarafrxyjdpe.supabase.co
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the SQL from `supabase/offers-table.sql`
5. Paste and click **Run**
6. Verify the table was created in Table Editor

### Step 2: Insert Sample Offers

After creating the table, run:
```bash
node scripts/create-offers-table.js
```

This will insert 3 sample offers:
- Weekend Special (20% off)
- First Order Discount (15% off)
- Lunch Special (10% off)

### Step 3: Test the Offers Feature

1. Start the dev server: `npm run dev`
2. Login to admin dashboard: http://localhost:3002/dpk
3. Click "Offers" in the sidebar
4. You should see the offers management page

## 🎯 How to Use

### Add New Offer
1. Click "Offers" in sidebar
2. Click "Add Offer" button
3. Fill in the form:
   - Title: e.g., "Weekend Special"
   - Description: e.g., "20% off all orders"
   - Discount Percentage: e.g., 20
   - Min Order Value: e.g., 500
   - Max Discount: e.g., 200
   - Start/End Date: Select dates
   - Active: Check to enable
   - Promotional: Check for promotional offers
4. Click "Create Offer"

### Edit Offer
1. Click the Edit icon (pencil) on any offer
2. Modify the fields
3. Click "Update Offer"

### Delete Offer
1. Click the Delete icon (trash) on any offer
2. Confirm deletion

### Toggle Active Status
Click the "Active/Inactive" button to enable/disable an offer

## 🔧 Sample Offers Created

### 1. Weekend Special
- 20% discount
- Min order: ₹500
- Max discount: ₹200
- Valid for 7 days
- Promotional: Yes

### 2. First Order Discount
- 15% discount
- Min order: ₹300
- Max discount: ₹100
- Valid for 30 days
- Promotional: No

### 3. Lunch Special
- 10% discount
- Min order: ₹200
- Max discount: ₹50
- Valid for 90 days
- Promotional: Yes

## 📱 Next Steps (Future Enhancements)

To make offers work like Zomato:

1. **Display offers on menu cards**
   - Fetch active offers from API
   - Show badge on dishes with offers
   - Display discount percentage

2. **Apply offers to orders**
   - Check if order meets min order value
   - Calculate discount based on offer
   - Show discount in bill

3. **Apply offers to specific dishes**
   - Add dish selection in offer form
   - Only apply to selected dishes
   - Show offer on applicable dishes only

4. **Offer validity check**
   - Check current date vs offer dates
   - Auto-expire expired offers
   - Show upcoming offers

5. **Offer statistics**
   - Track offer usage
   - Show revenue impact
   - Most popular offers

## 📁 Files Modified/Created

**Modified:**
- `src/types/index.ts` - Added Offer interface
- `src/components/Sidebar.tsx` - Added Offers tab
- `src/app/secure-dashboard-xyz789/page.tsx` - Added offers management UI

**Created:**
- `src/app/api/offers/route.ts` - Offers API (GET, POST)
- `src/app/api/offers/[id]/route.ts` - Offer API (PATCH, DELETE)
- `supabase/offers-table.sql` - SQL to create table
- `scripts/create-offers-table.js` - Script to insert sample offers
- `OFFERS_SETUP.md` - This documentation

## 🎉 Features

✅ Full CRUD operations
✅ Modal form for add/edit
✅ Status toggle (active/inactive)
✅ Promotional flag
✅ Date range validation
✅ Discount percentage with min/max caps
✅ Responsive table design
✅ Confirmation dialogs
✅ Sound effects on actions
✅ Error handling
✅ Sample data included

The offers management system is now ready to use! 🚀
