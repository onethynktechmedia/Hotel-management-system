# Add Offers to Menu Items - Setup Guide

## 📋 Step 1: Add Offer Columns to Dishes Table

Go to your Supabase Dashboard → SQL Editor → Run this SQL:

```sql
ALTER TABLE dishes
ADD COLUMN IF NOT EXISTS offer TEXT,
ADD COLUMN IF NOT EXISTS offer_discount DECIMAL(5, 2);
```

## 📋 Step 2: Add Offers to Menu Items

After adding the columns, run:

```bash
node scripts/add-dish-offers.js
```

This will add offers to these dishes:

### 🍗 Non-Veg Offers:
- Chicken Handi Half - **20% OFF**
- Chicken Handi Full - **25% OFF**
- Chicken Thali - **15% OFF**
- Mutton Thali - **15% OFF**
- Chicken Biryani - **10% OFF**
- Chicken Fry - **FREE DELIVERY**

### 🥗 Veg Offers:
- Paneer Masala - **BUY 1 GET 1**
- Vangi Masala - **10% OFF**

### 🍚 Rice Offers:
- Plain Rice Full - **5% OFF**
- Jeera Rice Full - **5% OFF**

### 🫓 Bread Offers:
- Bhakri - **BUY 5 GET 1 FREE**
- Chapati - **BUY 5 GET 1 FREE**

### 🥘 Sides Offers:
- Masala Papad - **2 FOR ₹50**

## 🎨 What's Already Done:

The menu page has been updated to show offers like Zomato:

1. **Green Badge with Lightning Icon** - Shows "⚡ 20% OFF" style
2. **Strikethrough Original Price** - Shows original price with discount
3. **Final Price** - Shows discounted price
4. **Pulse Animation** - Lightning icon pulses to attract attention

## 🎯 After Setup:

1. Refresh the menu page
2. You'll see green offer badges on dishes
3. Original price shown with strikethrough
4. Discounted price displayed prominently

## 📱 Example Display:

```
┌─────────────────────────────┐
│ [Image of Chicken Handi]   │
│                             │
│ Chicken Handi Half          │
│ चिकन हंडी हाफ             │
│ ⭐⭐⭐⭐⭐ 4.5              │
│ ⚡ 20% OFF                 │
│                             │
│ Non-Veg    ₹300            │
│            (₹375)          │
└─────────────────────────────┘
```

The offers will display just like Zomato! 🎉
