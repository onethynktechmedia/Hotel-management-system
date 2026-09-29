# Galaxy Garden Hotel - Offline Billing Software

## Overview

This is a complete standalone offline billing software for restaurant/hotel management. It works entirely offline using local storage for data persistence and includes:

- **Order Management**: Create, edit, and manage customer orders
- **Menu Management**: Add, edit, and delete dishes with pricing
- **Table Management**: Configure restaurant tables with capacity
- **Bill Generation**: Generate and print bills with thermal printer support
- **Data Backup**: Export/import data for backup and restore
- **Real-time Dashboard**: View orders, revenue, and statistics

## Features

### Core Functionality
- ✅ Complete offline operation (no internet required)
- ✅ User authentication with role-based access
- ✅ Order creation with multiple items
- ✅ Real-time order editing and item management
- ✅ Discount support (amount or percentage)
- ✅ Thermal printer integration for bill printing
- ✅ Data export/import for backup
- ✅ Responsive design for desktop and tablet

### Technical Features
- Built with Next.js 16 and React 19
- Electron wrapper for desktop application
- LocalStorage for data persistence
- WebUSB printer support
- TypeScript for type safety
- TailwindCSS for styling

## Installation

### Prerequisites

Before installing, ensure you have:
- Node.js 18+ and npm
- Git (for cloning)
- For building installers: Electron Builder dependencies

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hotel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000/offline-login in your browser

### Building for Production

#### Build the Next.js application
```bash
npm run build
```

#### Build Electron Installers

**For Windows (.exe installer):**
```bash
npm run electron-build-win
```
Output: `dist/Galaxy Garden Hotel Admin Setup.exe`

**For macOS (.dmg):**
```bash
npm run electron-build-mac
```
Output: `dist/Galaxy Garden Hotel Admin.dmg`

**For Linux (.AppImage and .deb):**
```bash
npm run electron-build-linux
```
Output: `dist/Galaxy Garden Hotel Admin.AppImage` and `.deb` file

**For all platforms:**
```bash
npm run electron-build
```

### Development with Electron

To test the Electron app in development:
```bash
npm run electron-dev
```

This will:
1. Start the Next.js development server
2. Launch the Electron window
3. Open DevTools for debugging

## Usage Guide

### First Time Setup

1. **Login to the system**
   - Default credentials are pre-configured:
     - Admin: `admin@hotel.com` / `admin123`
     - Waiter: `waiter@hotel.com` / `waiter123`
     - Kitchen: `kitchen@hotel.com` / `kitchen123`

2. **Configure your menu**
   - Go to the "Add New Dish" section
   - Add your restaurant dishes with:
     - Dish name
     - Price
     - Category (Starters, Main Course, Bread, etc.)

3. **Configure tables**
   - Go to the "Add New Table" section
   - Add your restaurant tables with:
     - Table number
     - Capacity (number of guests)

### Creating Orders

1. Click the **"New Order"** button
2. Enter customer name
3. Select a table
4. Add items to the order:
   - Select dish from dropdown
   - Enter quantity
   - Click "Add Item"
5. Review the order total
6. Click **"Create Order"**

### Managing Orders

- **Edit Order**: Click the blue edit icon to modify an existing order
- **Print Bill**: Click the green printer icon to generate and print a bill
- **Delete Order**: Click the red trash icon to remove an order
- **Mark as Paid**: In the bill modal, click "Mark Paid" after payment

### Printing Bills

1. Click the printer icon on any order
2. Optionally add a discount:
   - Choose "Amount" or "Percentage"
   - Enter the discount value
3. Click **"Connect"** to connect your thermal printer (if using WebUSB)
4. Click **"Print Bill"** to print
5. Click **"Mark Paid"** to complete the transaction

### Data Backup

**Export Data (Backup):**
1. Scroll to the "Data Management" section
2. Click **"Export Data (Backup)"**
3. A JSON file will be downloaded with all your data

**Import Data (Restore):**
1. Scroll to the "Data Management" section
2. Click **"Import Data (Restore)"**
3. Select your backup JSON file
4. All data will be restored

## Printer Setup

### Thermal Printer Support

The software supports thermal printers via WebUSB:

1. Connect your thermal printer to your computer via USB
2. In the bill modal, click **"Connect"**
3. Grant browser permission to access the printer
4. The printer will be connected and ready for printing

### Fallback Printing

If WebUSB is not available, the system falls back to:
- Browser print dialog
- PDF generation for manual printing

## File Structure

```
hotel/
├── electron/
│   └── main.js              # Electron main process
├── src/
│   ├── app/
│   │   ├── offline-login/   # Offline login page
│   │   └── offline-admin/   # Main offline admin panel
│   ├── lib/
│   │   ├── local-storage-db.ts  # Local storage database
│   │   └── webusb-printer.ts    # Printer utilities
│   └── components/
├── public/
│   └── icon.png             # App icon
├── package.json
└── next.config.ts
```

## Data Storage

All data is stored in the browser's localStorage:
- `hotel_orders` - Order data
- `hotel_dishes` - Menu items
- `hotel_tables` - Table configuration
- `hotel_users` - User accounts
- `offline_user` - Current logged-in user

## Security Notes

⚠️ **Important Security Considerations:**

1. **Data Storage**: Data is stored in localStorage, which is not encrypted
2. **Authentication**: Passwords are stored in plain text (for demo purposes)
3. **Backup Files**: Exported JSON files contain all data in plain text
4. **Production Use**: For production deployment, implement:
   - Proper password hashing
   - Encrypted local storage
   - Secure backup mechanisms
   - User authentication improvements

## Troubleshooting

### Build Issues

**Problem**: Build fails with TypeScript errors
**Solution**: 
```bash
npm run build
# Check for specific errors and fix them
```

**Problem**: Electron build fails
**Solution**: Ensure all dependencies are installed:
```bash
npm install
npm run build  # Build Next.js first
npm run electron-build
```

### Runtime Issues

**Problem**: Data not persisting
**Solution**: Check browser localStorage settings and ensure cookies/localStorage are enabled

**Problem**: Printer not connecting
**Solution**: 
- Ensure printer is connected via USB
- Check browser permissions for USB devices
- Try using the fallback print option

**Problem**: App not starting
**Solution**: Check that port 3000 is not already in use

## System Requirements

### Minimum Requirements
- **OS**: Windows 10+, macOS 10.13+, or Linux (Ubuntu 18.04+)
- **RAM**: 4GB
- **Storage**: 500MB free space
- **Display**: 1024x768 resolution

### Recommended Requirements
- **OS**: Windows 11, macOS 12+, or Linux (Ubuntu 22.04+)
- **RAM**: 8GB
- **Storage**: 1GB free space
- **Display**: 1920x1080 resolution

## Support

For issues or questions:
- Check the troubleshooting section above
- Review the code comments in source files
- Check Electron and Next.js documentation

## License

This software is provided as-is for offline billing purposes.

## Credits

Developed by: onethynk techmedia
Technology Stack: Next.js, Electron, React, TypeScript, TailwindCSS

---

**Version**: 1.0.0  
**Last Updated**: September 2026
