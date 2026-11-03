# Windows Build Instructions

This document explains how to build the Windows installer for the Dhole Patil Khanawal Hotel Billing application from a Linux development environment.

## Prerequisites

1. **Node.js** (v18 or higher) installed
2. **npm** installed
3. **Wine** (for building Windows installers on Linux)
4. **Mono** (for .NET assemblies required by electron-builder on Linux)

### Installing Wine and Mono on Linux

#### Ubuntu/Debian:
```bash
sudo dpkg --add-architecture i386
sudo apt update
sudo apt install wine64 wine32 mono-complete
```

#### Fedora/RHEL:
```bash
sudo dnf install wine mono-complete
```

#### openSUSE:
```bash
sudo zypper install wine mono-complete
```

## Build Process

### Step 1: Configure Environment Variables

The application requires Supabase credentials for cloud sync functionality.

**Option A: Interactive Setup**
```bash
npm run setup-prod
```

**Option B: Manual Setup**
Edit `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Build the Next.js Application

```bash
npm run build
```

This creates the production build in the `.next` directory.

### Step 4: Build Windows Installer

**For NSIS Installer (recommended for distribution):**
```bash
npm run dist:win
```

**For Portable Executable (no installation required):**
```bash
npm run dist:win:portable
```

## Output Location

After building, the Windows installers will be in the `dist/` directory:

- **NSIS Installer**: `Dhole Patil Khanawal-1.0.0-x64.exe` (~80-150 MB)
- **Portable Version**: `Dhole Patil Khanawal-Portable-1.0.0.exe` (~80-150 MB)

## Distribution Instructions

### For NSIS Installer (.exe)

1. Copy the `.exe` file from the `dist/` directory
2. Send it to the target Windows machine (USB, email, cloud storage, etc.)
3. On the Windows machine, double-click the installer
4. Follow the installation wizard:
   - Choose installation directory (default: `C:\Users\{username}\AppData\Local\Programs\dhole-patil-khanawal`)
   - Create desktop shortcut (recommended)
   - Create Start Menu shortcut (recommended)
   - Launch application after installation (recommended)

### For Portable Version

1. Copy the `.exe` file from the `dist/` directory
2. Send it to the target Windows machine
3. Simply double-click to run - no installation required
4. Application data will be stored in the same directory as the executable

## What Gets Installed

The installer includes:
- **Electron Runtime**: Desktop application framework
- **Next.js Application**: Built React frontend
- **SQLite Database**: better-sqlite3 for local data storage
- **Configuration**: Application settings and environment variables

## Database Location

After installation, the SQLite database is stored at:
```
C:\Users\{username}\AppData\Roaming\dhole-patil-khanawal\hotel-billing.db
```

## Features in Production Build

- ✓ Offline-first operation (works without internet)
- ✓ Local SQLite database for data persistence
- ✓ Automatic sync to Supabase when online
- ✓ Database backup and restore functionality
- ✓ Desktop shortcuts and Start Menu integration
- ✓ Auto-updates capability (if configured)
- ✓ Professional installer with license agreement

## Troubleshooting

### Wine/Mono Issues

If you encounter Wine-related errors:
```bash
# Check Wine version
wine --version

# Initialize Wine
winecfg

# If wine32 is missing (Ubuntu/Debian)
sudo dpkg --add-architecture i386
sudo apt update
sudo apt install wine32
```

### Build Fails

1. Ensure all dependencies are installed: `npm install`
2. Clean build artifacts: `rm -rf .next dist node_modules/.cache`
3. Rebuild: `npm run build && npm run dist:win`

### Application Won't Start on Windows

1. Check Windows Event Viewer for error logs
2. Verify antivirus isn't blocking the application
3. Run as administrator if permission issues occur
4. Check that .NET Framework 4.7.2+ is installed

## Advanced Options

### Cross-Platform Builds

You can build for multiple platforms at once:
```bash
npm run dist              # Builds for current platform
npm run dist:win          # Windows only
npm run dist:linux        # Linux only
npm run dist:mac          # macOS only (requires macOS)
```

### Custom Configuration

Edit the `build` section in `package.json` to customize:
- Installer icon
- Installation directory
- Shortcut creation
- File associations
- Digital signing (for Windows)

### Code Signing (Production)

For production distribution, you should code-sign your Windows executable:

1. Obtain a code signing certificate from a CA (e.g., DigiCert, Sectigo)
2. Add to `package.json`:
```json
"win": {
  "certificateFile": "path/to/certificate.pfx",
  "certificatePassword": "your-password"
}
```

3. Rebuild: `npm run dist:win`

## Security Notes

- Never commit `.env.local` or `.env` files with real credentials
- Environment variables are embedded in the build - use production-only values
- Consider using electron-updater for automatic updates
- Regular security updates for dependencies: `npm audit fix`

## Support

For issues or questions:
- Email: phapaletejas11@gmail.com
- Project: Dhole Patil Khanawal Hotel Billing System
