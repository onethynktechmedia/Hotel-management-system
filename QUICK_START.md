# Quick Start Guide - Offline Billing Software

## 5-Minute Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Run Development Server
```bash
npm run dev
```

### Step 3: Open the Application
Open your browser and navigate to:
```
http://localhost:3000/offline-login
```

### Step 4: Login
Use these default credentials:
- **Email**: admin@hotel.com
- **Password**: admin123

### Step 5: Start Using
You're now in the offline admin panel! You can:
- Create orders
- Add dishes to your menu
- Configure tables
- Print bills
- Export/Import data

## Building for Distribution

### Windows Installer
```bash
npm run build
npm run electron-build-win
```
Find the installer in: `dist/Galaxy Garden Hotel Admin Setup.exe`

### macOS DMG
```bash
npm run build
npm run electron-build-mac
```
Find the installer in: `dist/Galaxy Garden Hotel Admin.dmg`

### Linux AppImage
```bash
npm run build
npm run electron-build-linux
```
Find the installer in: `dist/Galaxy Garden Hotel Admin.AppImage`

## Key Features at a Glance

| Feature | Description |
|---------|-------------|
| 📝 Order Management | Create, edit, delete orders with multiple items |
| 🍽️ Menu Management | Add dishes with prices and categories |
| 🪑 Table Management | Configure restaurant tables |
- 🖨️ Bill Printing | Thermal printer support with discounts |
| 💾 Data Backup | Export/import JSON backups |
- 📊 Dashboard | Real-time statistics and revenue tracking |

## Default Data

The system comes pre-loaded with:
- **5 Sample Dishes**: Butter Chicken, Paneer Tikka, Naan, Dal Makhani, Biryani
- **5 Sample Tables**: Tables 1-5 with various capacities
- **3 Sample Users**: Admin, Waiter, Kitchen

You can delete or modify this data as needed.

## Common Tasks

### Add a New Dish
1. Scroll to "Add New Dish" section
2. Enter dish name, price, and category
3. Click "Add Dish"

### Create an Order
1. Click "New Order" button
2. Enter customer name and select table
3. Add items from the menu
4. Click "Create Order"

### Print a Bill
1. Click the printer icon on any order
2. Optionally add discount
3. Click "Print Bill"

### Backup Your Data
1. Scroll to "Data Management" section
2. Click "Export Data (Backup)"
3. Save the JSON file

## Need Help?

See the full documentation in `OFFLINE_BILLING_SOFTWARE_GUIDE.md`
