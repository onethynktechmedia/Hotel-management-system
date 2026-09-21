# Electron Desktop App Build Guide

## Build Commands

### Development
```bash
npm run electron-dev
```

### Production Builds

**Windows (.exe):**
```bash
npm run electron-build-win
```

**macOS (.dmg):**
```bash
npm run electron-build-mac
```

**Linux (.AppImage):**
```bash
npm run electron-build-linux
```

**All Platforms:**
```bash
npm run electron-build
```

## Output Location

Installers are created in the `dist/` directory.

## Installation

**Windows:** Run the .exe installer
**macOS:** Open .dmg and drag to Applications
**Linux:** Run `chmod +x *.AppImage && ./filename.AppImage`

## Features

- Offline support with localStorage
- Auto-sync when online
- Thermal printer integration
- Full order/menu/table management
