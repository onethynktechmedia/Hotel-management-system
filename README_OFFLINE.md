# Galaxy Garden Hotel - Offline Billing Software

A complete standalone offline billing and management system for restaurants and hotels. Works entirely without internet connection.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open in browser
# Navigate to: http://localhost:3000/offline-login
```

**Default Login**: admin@hotel.com / admin123

## ✨ Features

- **📝 Order Management** - Create, edit, and manage customer orders
- **🍽️ Menu Management** - Add dishes with pricing and categories
- **🪑 Table Management** - Configure restaurant tables
- **🖨️ Bill Printing** - Thermal printer support with discounts
- **💾 Data Backup** - Export/import JSON backups
- **📊 Dashboard** - Real-time statistics and revenue tracking
- **🔒 Offline Mode** - Works completely offline
- **💻 Desktop App** - Build as standalone .exe/.dmg/.AppImage

## 📦 Build Installers

### Windows
```bash
npm run build
npm run electron-build-win
# Output: dist/Galaxy Garden Hotel Admin Setup.exe
```

### macOS
```bash
npm run build
npm run electron-build-mac
# Output: dist/Galaxy Garden Hotel Admin.dmg
```

### Linux
```bash
npm run build
npm run electron-build-linux
# Output: dist/Galaxy Garden Hotel Admin.AppImage
```

## 📖 Documentation

- **Quick Start**: [QUICK_START.md](QUICK_START.md)
- **Full Guide**: [OFFLINE_BILLING_SOFTWARE_GUIDE.md](OFFLINE_BILLING_SOFTWARE_GUIDE.md)

## 🎯 Key Capabilities

### Order Management
- Create orders with multiple items
- Edit existing orders
- Add/remove items dynamically
- Automatic total calculation
- Customer name tracking
- Table assignment

### Bill Generation
- Professional bill format
- Discount support (amount/percentage)
- Thermal printer integration
- WebUSB printer support
- Fallback to browser print

### Data Management
- Local storage persistence
- JSON export for backup
- JSON import for restore
- Sample data initialization
- Data integrity checks

## 🔧 Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Desktop**: Electron
- **Styling**: TailwindCSS
- **Icons**: Lucide React
- **Storage**: LocalStorage (offline)
- **Printing**: WebUSB API

## 📁 Project Structure

```
hotel/
├── electron/              # Electron main process
├── src/
│   ├── app/
│   │   ├── offline-login/   # Login page
│   │   └── offline-admin/   # Main admin panel
│   ├── lib/
│   │   ├── local-storage-db.ts  # Database layer
│   │   └── webusb-printer.ts    # Printer utilities
│   └── components/
├── public/              # Static assets
└── package.json
```

## 🔐 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hotel.com | admin123 |
| Waiter | waiter@hotel.com | waiter123 |
| Kitchen | kitchen@hotel.com | kitchen123 |

## ⚠️ Important Notes

- Data is stored in browser localStorage
- For production use, implement proper security measures
- Backup your data regularly using export feature
- Printer requires WebUSB support or fallback to browser print

## 📞 Support

For detailed documentation, see [OFFLINE_BILLING_SOFTWARE_GUIDE.md](OFFLINE_BILLING_SOFTWARE_GUIDE.md)

## 📄 License

Developed by onethynk techmedia

---

**Version**: 1.0.0 | **Status**: Production Ready
