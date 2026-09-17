# Printing Setup Guide

## Overview
This hotel management system supports direct thermal printing via WebUSB for production deployments. The system automatically falls back to browser printing if WebUSB is not available.

## Printer Requirements
- **USB Thermal Printer** (e.g., Everycom EC58, EC58B)
- **58mm paper width**
- **ESC/POS compatible**
- **USB connection**

## Production Printing (WebUSB)

### How It Works
1. When you click "Print Bill" or "Print Order", the system attempts to connect to the USB printer directly via WebUSB
2. If WebUSB succeeds, the bill is sent directly to the printer
3. If WebUSB fails (not supported, printer not connected, etc.), it falls back to browser print dialog

### Browser Requirements
- **Chrome/Edge** (WebUSB is supported)
- **HTTPS** required for WebUSB to work (or localhost for development)
- **USB device access permission** - Browser will prompt to allow USB access

### Setup Instructions

#### 1. Connect the Printer
- Plug the USB thermal printer into your computer
- Ensure the printer is powered on

#### 2. Allow Browser Access
- When you click "Print" for the first time, the browser will show a USB device selection dialog
- Select your thermal printer from the list
- Click "Connect" to allow the browser to access the printer

#### 3. Print
- The system will automatically send ESC/POS formatted data to the printer
- The printer will print the bill/kitchen order

## Development/Local Printing

For local development with a Linux server, you can use CUPS:

### Install CUPS
```bash
sudo apt-get update
sudo apt-get install cups
```

### Add Printer
```bash
sudo lpadmin -p EC58 -v usb://Everycom/EC58 -m everywhere
sudo cupsaccept EC58
sudo lpoptions -d EC58
```

### Test Printing
```bash
echo "Test Print" | lp -d EC58
```

## Troubleshooting

### WebUSB Not Working
1. **Check HTTPS**: WebUSB only works on HTTPS or localhost
2. **Check Browser**: Use Chrome or Edge (Firefox/Safari don't support WebUSB)
3. **Check Permissions**: Allow USB access when prompted
4. **Check Connection**: Ensure printer is connected via USB

### Fallback to Browser Print
If WebUSB fails, the system automatically falls back to browser print:
1. A new window/tab opens with the bill content
2. The browser print dialog appears
3. Select your thermal printer from the printer list
4. Click Print

### Printer Not Printing
1. Check printer is powered on
2. Check USB cable is connected
3. Check printer has paper
4. Try refreshing the page and printing again

## Supported Printers
- Everycom EC58
- Everycom EC58B
- Any ESC/POS compatible USB thermal printer (58mm width)

## Custom Printer Configuration
If using a different printer, modify the vendor ID in `src/lib/webusb-printer.ts`:

```typescript
const printer = new WebUSBPrinter({
  vendorId: 0xYOUR_VENDOR_ID,  // Your printer's vendor ID
  productId: 0xYOUR_PRODUCT_ID // Your printer's product ID
})
```

To find your printer's IDs:
1. Connect printer to computer
2. Open Chrome: `chrome://usb-internals/`
3. Find your device and note the Vendor ID and Product ID
