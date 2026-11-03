# QZ Tray Printing Setup Guide

This guide explains how to set up direct, silent receipt printing using QZ Tray for the Dhole Patil Khanawal hotel management system.

## Overview

QZ Tray enables direct printing to thermal receipt printers without opening Chrome's print preview dialog. This provides a seamless experience for staff printing bills and KOTs.

## Requirements

- **Operating System**: Windows, Linux, or macOS
- **QZ Tray**: Installed and running on the computer connected to the printer
- **Printer**: Thermal receipt printer with drivers installed
- **Supabase Account**: For secure signing (recommended)
- **QZ Tray Certificate**: Generated from QZ Tray application

## Installation Steps

### 1. Install QZ Tray

#### Windows:
1. Download QZ Tray from https://qz.io/download/
2. Run the installer
3. Start QZ Tray from the Start menu
4. Allow QZ Tray through Windows Firewall when prompted

#### Linux (Ubuntu/Debian):
```bash
# Download the latest Linux build from https://qz.io/download/
wget https://github.com/qz-tray/qz-tray/releases/download/v2.2/qz-tray_2.2_amd64.deb
sudo dpkg -i qz-tray_2.2_amd64.deb
sudo apt-get install -f  # Fix any dependencies
qz-tray  # Start QZ Tray
```

#### macOS:
1. Download QZ Tray for macOS from https://qz.io/download/
2. Open the .dmg file
3. Drag QZ Tray to Applications
4. Launch QZ Tray from Applications

### 2. Configure Printer

#### Windows:
1. Install printer drivers (usually provided with the printer)
2. Go to Settings > Devices > Printers & scanners
3. Add your thermal printer
4. Set it as default printer (optional)
5. Note the exact printer name (case-sensitive, e.g., "EPSON TM-T88V")

#### Linux (CUPS):
```bash
# Install CUPS if not already installed
sudo apt-get install cups

# Add printer via CUPS web interface
# Open http://localhost:631 in your browser
# Add your printer following the on-screen instructions
```

#### macOS:
1. Install printer drivers
2. Go to System Preferences > Printers & Scanners
3. Add your thermal printer
4. Note the exact printer name

### 3. Generate QZ Tray Certificate

**IMPORTANT FOR PRODUCTION:**

1. Open QZ Tray application
2. Go to **Settings** > **Certificates**
3. Click **Generate New Certificate**
4. Save the certificate with a memorable name (e.g., "dhole-patil-khanawal")
5. **Save the private key securely** - you'll need this for the signing endpoint
6. Note the **Certificate ID** (usually displayed after generation)

**⚠️ SECURITY WARNING:**
- Never commit the private key to git
- Never share the private key publicly
- Store it securely in Supabase environment variables
- The private key allows any website to print to your printers

### 4. Deploy Secure Signing Endpoint

#### Option A: Using Supabase Edge Functions (Recommended)

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link to your project:
```bash
supabase link --project-ref YOUR_PROJECT_ID
```

4. Set environment variable in Supabase Dashboard:
   - Go to Supabase Dashboard > Edge Functions
   - Add environment variable: `QZ_PRIVATE_KEY`
   - Paste your private key (from step 3)

5. Deploy the signing function:
```bash
supabase functions deploy sign-qz
```

6. Note the function URL (e.g., `https://your-project.supabase.co/functions/v1/sign-qz`)

#### Option B: Development Mode (NOT FOR PRODUCTION)

For testing without proper signing, you can disable security checks:

1. Open QZ Tray
2. Go to **Settings** > **Security**
3. Disable security checks (⚠️ INSECURE - only for local testing)
4. Set environment variable:
   ```
   NEXT_PUBLIC_QZ_SECURITY_DISABLED=true
   ```

**⚠️ WARNING:** Never use this in production as it allows any website to print to your printers.

### 5. Configure Environment Variables

Add these to your `.env.local` file:

```bash
# QZ Tray Configuration
NEXT_PUBLIC_QZ_CERT_ID=your_certificate_id
NEXT_PUBLIC_QZ_SIGNING_URL=https://your-project.supabase.co/functions/v1/sign-qz

# Printer Configuration (optional - can be set in UI)
NEXT_PUBLIC_DEFAULT_PRINTER=EPSON TM-T88V

# Development mode (ONLY FOR TESTING - DO NOT USE IN PRODUCTION)
# NEXT_PUBLIC_QZ_SECURITY_DISABLED=true
```

### 6. Configure Printer in Application

The application can be configured to use a specific printer:

1. Navigate to **Settings** > **Printer Configuration**
2. Select your printer from the dropdown
3. Click **Save**

Or set the default printer via environment variable (see step 5).

## Testing

### 1. Verify QZ Tray is Running

- Windows: Check system tray for QZ Tray icon
- Linux: Check if `qz-tray` process is running
- macOS: Check if QZ Tray is in Applications

### 2. Test Connection

Open the application and navigate to a bill. Click "Print Bill".

If QZ Tray is properly configured:
- ✅ Bill prints directly to the printer
- ✅ No Chrome print preview dialog appears
- ✅ No repeated security prompts

If issues occur:
- ❌ Check QZ Tray is running
- ❌ Check printer is connected and powered on
- ❌ Check printer name matches exactly
- ❌ Check signing endpoint is configured
- ❌ Check browser console for errors

### 3. Fallback Behavior

If QZ Tray is not available or printing fails:
- The application automatically falls back to browser print
- Chrome print preview dialog will open
- User can manually select printer and print

## Troubleshooting

### QZ Tray Not Connecting

**Problem:** "QZ Tray is not running" error

**Solutions:**
1. Ensure QZ Tray application is running
2. Check QZ Tray is allowed through firewall
3. Try restarting QZ Tray
4. Check QZ Tray log for errors

### Printer Not Found

**Problem:** "Printer not found" error

**Solutions:**
1. Verify printer is installed in system settings
2. Check printer name matches exactly (case-sensitive)
3. Ensure printer is powered on and connected
4. Try using a different printer or USB port

### Signing Errors

**Problem:** "Failed to configure secure signing" error

**Solutions:**
1. Verify signing endpoint URL is correct
2. Check QZ_PRIVATE_KEY is set in Supabase
3. Verify certificate ID matches
4. Check Supabase Edge Function logs
5. For testing, disable security checks (development mode only)

### Silent Printing Not Working

**Problem:** Print preview dialog still appears

**Solutions:**
1. Verify QZ Tray security is properly configured
2. Check printer is set as default in QZ Tray
3. Ensure signing is working (check console)
4. Verify printer supports direct printing

### Repeated Security Prompts

**Problem:** QZ Tray shows security prompt repeatedly

**Solutions:**
1. Configure proper signing (see step 4)
2. Ensure the website is added to QZ Tray trusted sites
3. Check certificate is valid and not expired
4. Verify signing endpoint is accessible

## Security Best Practices

1. **Always use secure signing in production**
2. **Never expose private keys in frontend code**
3. **Use environment variables for sensitive data**
4. **Rotate certificates periodically**
5. **Monitor printing activity for anomalies**
6. **Restrict signing endpoint to authorized domains**
7. **Keep QZ Tray updated to latest version**

## Compatibility

### Operating Systems

| OS | Status | Notes |
|----|--------|-------|
| Windows 10/11 | ✅ Full Support | Recommended |
| Windows 7/8 | ✅ Full Support | May need updates |
| Linux (Ubuntu/Debian) | ✅ Full Support | Requires CUPS |
| Linux (Other) | ⚠️ May Work | Depends on distro |
| macOS 10.15+ | ✅ Full Support | Tested |
| macOS 10.14- | ⚠️ May Work | May need updates |

### Browsers

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome | ✅ Full Support | Recommended |
| Edge | ✅ Full Support | Chromium-based |
| Firefox | ⚠️ Limited | WebUSB may not work |
| Safari | ❌ Not Supported | Use Chrome/Edge |

### Printers

| Printer Type | Status | Notes |
|--------------|--------|-------|
| Thermal (58mm) | ✅ Full Support | Standard receipt printer |
| Thermal (80mm) | ✅ Full Support | Wider receipts |
| Inkjet/Laser | ✅ Full Support | May need CSS adjustments |
| Network Printers | ✅ Full Support | Must be visible to system |

## Advanced Configuration

### Multiple Printers

To use multiple printers (e.g., KOT printer and Bill printer):

1. Configure each printer in system settings
2. Add both printers to application settings
3. Select appropriate printer for each print job

### Custom Receipt Design

The receipt design is controlled by HTML/CSS in the print handlers:
- KOT: `src/lib/webusb-printer.ts` (generateKOTPlainText)
- Bill: `src/app/secure-dashboard-xyz789/page.tsx` (handlePrintBill)

Modify these functions to customize receipt layout.

### Print Queue Management

For high-volume printing, consider:
- Implementing a print queue in the backend
- Adding print job status tracking
- Supporting reprint functionality

## Support

For issues specific to QZ Tray:
- Documentation: https://qz.io/docs/
- GitHub: https://github.com/qz-tray/qz-tray
- Support: https://qz.io/support/

For issues with this integration:
- Check browser console for errors
- Review QZ Tray logs
- Verify Supabase Edge Function logs
- Test with development mode (signing disabled)

## Files Changed

This implementation adds/modifies the following files:

1. **src/lib/qz-printer.ts** - New QZ Tray service
2. **supabase/functions/sign-qz/index.ts** - New signing endpoint
3. **src/app/secure-dashboard-xyz789/page.tsx** - Updated print handlers
4. **src/app/staff-portal-abc456/page.tsx** - Updated print handlers
5. **src/app/chef-station-def123/page.tsx** - Updated print handlers
6. **package.json** - Added qz-tray dependency
7. **.env.local** - Added QZ Tray configuration variables

## Testing Checklist

- [ ] QZ Tray installed and running
- [ ] Printer installed and recognized by system
- [ ] Certificate generated in QZ Tray
- [ ] Private key saved securely
- [ ] Signing endpoint deployed to Supabase
- [ ] Environment variables configured
- [ ] Printer configured in application
- [ ] Test print successful (no preview dialog)
- [ ] Fallback to browser print works when QZ unavailable
- [ ] No repeated security prompts
- [ ] Receipt format matches requirements
