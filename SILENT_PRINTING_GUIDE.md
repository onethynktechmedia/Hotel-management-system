# Silent Printing Guide

## How Silent Printing Works

The application now supports **silent printing** (no print preview popup) when running in **Electron desktop mode**.

## Important: Silent Printing Only Works in Electron Mode

**Silent printing does NOT work when running in browser mode (localhost:3000)**. This is a browser security restriction - Chrome/Chromium will always show a print dialog when printing from a web page.

### Browser Mode (localhost:3000)
- Print preview popup **WILL appear** (cannot be avoided due to browser security)
- Uses WebUSB or browser print dialog
- For development/testing only

### Electron Desktop Mode
- Print preview popup **WILL NOT appear** (silent printing)
- Uses Electron's native printing API
- For production deployment

## How to Run in Electron Mode

### Development
```bash
npm run electron:dev
```

This will:
1. Start the Next.js dev server
2. Launch the Electron desktop app
3. Enable silent printing

### Production Build
```bash
npm run dist
```

This will:
1. Build the Next.js app for production
2. Package it as an Electron desktop application
3. Create installers for Windows/Linux/Mac

## Setting Up Your Printer

For silent printing to work, you must:

1. **Install your thermal printer driver** on your OS
2. **Set it as the default printer** in your system settings
3. **Configure paper size** to 58mm or 80mm in printer settings

### Linux (CUPS)
```bash
# Install printer driver
sudo apt-get install cups

# Add printer via CUPS web interface
# http://localhost:631

# Set as default printer
lpoptions -d PRINTER_NAME
```

### Windows
1. Open Settings → Devices → Printers & scanners
2. Add your thermal printer
3. Click "Manage" → "Set as default"

## Troubleshooting

### Print Dialog Still Appears in Electron

1. Make sure you're running `npm run electron:dev` (not `npm run dev`)
2. Check that the printer is set as default in OS settings
3. Check Electron console for errors (DevTools should open automatically in dev mode)

### WebUSB Printing Not Working

1. Make sure your printer supports WebUSB
2. Connect printer via USB (not Bluetooth)
3. Grant browser permission to access USB devices

### Print Output is Cut Off

1. Check printer paper size setting (should be 58mm or 80mm)
2. Adjust CSS `@page size` in the print function if needed
3. Ensure printer margins are set to 0 in driver settings

## Verification

To verify silent printing is working:

1. Run the app in Electron mode: `npm run electron:dev`
2. Place an order and click "Print Bill"
3. The bill should print directly without any dialog
4. If a dialog appears, check the console for errors

## Note for Vercel Deployment

When deployed to Vercel, the app runs in browser mode only. Silent printing is not available in this deployment. For production use with silent printing, you must build and distribute the Electron desktop application.
