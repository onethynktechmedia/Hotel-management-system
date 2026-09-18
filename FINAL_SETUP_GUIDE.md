# Hotel Management System - Complete Setup Guide

## Final Working Links

### Local/Offline (Your Server)
- **Local Access**: http://localhost:3000
- **Network Access**: http://192.168.1.13:3000
- **Database**: Local PostgreSQL (hotel_management)

### Online (Cloud Deployment)
- **GitHub**: https://github.com/onethynktechmedia/Hotel-management-system
- **Deploy to Vercel**: https://vercel.com (Import the GitHub repo)
- **After Deployment**: You'll get a URL like https://hotel-management-system.vercel.app

---

## Current Setup Status

✅ **Local PostgreSQL Database** - Running and configured  
✅ **Application Running** - PM2 process active  
✅ **API Routes** - All using local database  
✅ **Network Access** - Available on 192.168.1.13:3000  
✅ **Printer Sharing** - CUPS configured for network printing  

---

## How It Works

### Online Mode (Cloud)
1. Deploy to Vercel
2. Use Supabase cloud database
3. Works from anywhere with internet
4. Automatic backups and scaling

### Offline Mode (Local)
1. Uses local PostgreSQL database
2. No internet required
3. Full functionality available
4. Perfect for restaurants with unreliable internet

---

## Manual Order Entry (Offline Mode)

The admin dashboard already supports manual order entry. Here's how to use it:

1. **Login as Admin**: admin@hotel.com / admin123
2. **Go to Admin Dashboard**
3. **Click "Orders" tab**
4. **Manual Order Entry**:
   - Select table
   - Add items manually
   - Set quantities
   - Calculate total
   - Submit order

---

## Offline Printing Setup

### Printer Configuration
Your printer is already configured with CUPS for network printing.

### Test Printing
```bash
echo "Test Print" | lp -d EC58
```

### Print from Application
1. Go to any order in admin dashboard
2. Click "Print Bill"
3. Select your thermal printer
4. Print directly

---

## Deployment Instructions

### Option 1: Keep Current Offline Setup (Recommended for Restaurant)

Your current setup is perfect for offline use:
- Server running at http://192.168.1.13:3000
- All devices on same WiFi can access
- No internet needed
- Full functionality

**To access from other devices:**
1. Connect device to same WiFi
2. Open browser: http://192.168.1.13:3000
3. Login with credentials

### Option 2: Deploy Online (Vercel)

1. Go to https://vercel.com
2. Click "New Project"
3. Import GitHub repository: `onethynktechmedia/Hotel-management-system`
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
5. Click "Deploy"

**Note**: For online deployment, you'll need a Supabase project. The current code is set up for local PostgreSQL.

---

## Server Management

### Start Application
```bash
pm2 start npm --name 'hotel-app' -- start
```

### Stop Application
```bash
pm2 stop hotel-app
```

### Restart Application
```bash
pm2 restart hotel-app
```

### View Logs
```bash
pm2 logs hotel-app
```

### Monitor Performance
```bash
pm2 monit
```

---

## Database Management

### Backup Database
```bash
pg_dump hotel_management > backup.sql
```

### Restore Database
```bash
psql hotel_management < backup.sql
```

### View Data
```bash
psql -d hotel_management
```

---

## Troubleshooting

### Application Not Starting
```bash
# Check if port 3000 is in use
lsof -ti:3000 | xargs kill -9

# Restart application
pm2 restart hotel-app
```

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Network Access Issues
```bash
# Check if server is listening on all interfaces
ss -tlnp | grep 3000

# Should show: *:3000 (not 127.0.0.1:3000)
```

### Printer Not Working
```bash
# Check CUPS status
sudo systemctl status cups

# List printers
lpstat -p

# Test print
echo "Test" | lp -d EC58
```

---

## Login Credentials

- **Admin**: admin@hotel.com / admin123
- **Waiter**: waiter@hotel.com / waiter123
- **Kitchen**: kitchen@hotel.com / kitchen123

---

## Features Available

### ✅ Menu Management
- View dishes by category
- Add/Edit/Delete dishes
- Set prices and availability

### ✅ Order Management
- Create orders from menu
- Manual order entry
- Track order status
- Order history

### ✅ Table Management
- View table status
- Assign tables
- Release tables

### ✅ Billing
- Generate bills
- Apply discounts
- Print bills (offline supported)

### ✅ Kitchen Display
- View incoming orders
- Update order status
- Mark orders as ready

### ✅ Waiter Interface
- Take orders
- View table status
- Manage orders

---

## Summary

**Your current setup is complete and working:**
- ✅ Offline capable with local PostgreSQL
- ✅ Network accessible at http://192.168.1.13:3000
- ✅ Manual order entry available in admin dashboard
- ✅ Offline printing configured with CUPS
- ✅ All features functional

**For online deployment:**
- Deploy to Vercel with Supabase credentials
- Will work from anywhere with internet

**For offline use:**
- Keep current setup
- Access from devices on same WiFi
- No internet required

The system is production-ready for restaurant use!
