# Online/Offline Mode Integration Guide

## Overview

Your Hotel Management System now supports **both online and offline modes**, allowing seamless operations regardless of internet connectivity.

## Architecture

### Online Mode (`/admin`)
- **Database**: Supabase (cloud-based)
- **Features**: Full real-time sync, multi-user support, cloud backup
- **Requirement**: Internet connection required
- **Use Case**: Normal operations when internet is available

### Offline Mode (`/offline-admin`)
- **Database**: localStorage (browser-based)
- **Features**: Complete offline functionality, thermal printing, local data persistence
- **Requirement**: No internet needed
- **Use Case**: Internet outages, remote locations, backup operations

## How It Works

### 1. Online Mode (Default)
- Admin logs in at `/login`
- Redirected to `/admin` (online dashboard)
- All data synced to Supabase cloud
- Real-time updates across all devices

### 2. Automatic Offline Detection
- System continuously monitors internet connection
- When internet disconnects, warning modal appears
- Options:
  - **Stay Here**: Continue in online mode (limited functionality)
  - **Go to Offline Mode**: Switch to offline billing system

### 3. Manual Mode Switching

#### From Online to Offline
- Click the **WifiOff** icon (red button) in the header
- User session is saved to localStorage
- Redirected to `/offline-admin`
- All offline features available immediately

#### From Offline to Online
- Click the **Wifi** icon (green button) in the header
- System checks internet connection
- If online: Redirected to `/admin`
- If offline: Alert message to connect to internet

## Features Comparison

| Feature | Online Mode | Offline Mode |
|---------|-------------|--------------|
| Order Management | ✅ | ✅ |
| Menu Management | ✅ | ✅ |
| Table Management | ✅ | ✅ |
| Bill Printing | ✅ | ✅ |
| Thermal Printer | ✅ | ✅ |
| Reports | ✅ | ✅ |
| Real-time Sync | ✅ | ❌ |
| Multi-user | ✅ | ❌ |
| Cloud Backup | ✅ | ❌ |
| Internet Required | ✅ | ❌ |

## User Flow

### Normal Operation (Online)
1. Admin logs in at `/login`
2. Works in `/admin with full features
3. Data synced to Supabase automatically

### Internet Disconnection
1. System detects offline status
2. Warning modal appears automatically
3. Admin can switch to offline mode
4. Continue operations without interruption

### Internet Restoration
1. System detects online status
2. Admin can switch back to online mode
3. Data sync (future enhancement)

## Data Storage

### Online Mode
- **Orders**: Supabase `orders` table
- **Dishes**: Supabase `dishes` table
- **Tables**: Supabase `tables` table
- **Payments**: Supabase `payments` table
- **Notifications**: Supabase `notifications` table

### Offline Mode
- **Orders**: localStorage `hotel_orders`
- **Dishes**: localStorage `hotel_dishes`
- **Tables**: localStorage `hotel_tables`
- **Users**: localStorage `hotel_users`

## UI Indicators

### Online Mode Header
- **Green Wifi Icon**: Connection status indicator
- **"Online" Badge**: Shows connected status
- **Red WifiOff Button**: Manual switch to offline

### Offline Mode Header
- **Red "OFFLINE MODE" Badge**: Shows offline status
- **Green Wifi Button**: Switch to online (if internet available)
- **Gray Wifi Button**: No internet available

## Security

### Authentication
- **Online**: Supabase auth with JWT tokens
- **Offline**: localStorage session management
- Session preserved when switching modes

### Data Isolation
- Online and offline data stored separately
- No automatic data sync (manual export/import available)
- Prevents data conflicts

## Future Enhancements

### Data Synchronization
- Automatic sync when internet returns
- Conflict resolution for duplicate orders
- Merge offline data with online database

### Seamless Mode Switching
- Background sync without user interruption
- Smart caching for offline access
- Progressive web app (PWA) support

## Troubleshooting

### Can't switch to online mode
- Check internet connection
- Verify Supabase credentials
- Clear browser cache

### Offline data not loading
- Check localStorage is enabled
- Verify browser supports localStorage
- Check for storage quota limits

### Printer not working in offline mode
- Ensure WebUSB is supported
- Check printer permissions
- Verify printer is connected

## File Structure

```
src/
├── app/
│   ├── login/              # Online login
│   ├── admin/              # Online admin panel
│   ├── offline-login/      # Offline login
│   └── offline-admin/      # Offline admin panel
├── components/
│   ├── Sidebar.tsx         # Online sidebar
│   └── OfflineSidebar.tsx  # Offline sidebar
└── lib/
    ├── local-storage-db.ts # Offline database
    └── sound-effects.ts    # Audio feedback
```

## Electron Desktop App

The desktop app (Electron) loads the offline mode by default:
- **Development**: Loads `http://localhost:3000/offline-login`
- **Production**: Starts local server and loads offline mode
- **Icon**: Shows "Galaxy Garden Hotel Admin - OFFLINE"

This ensures the desktop app works even without internet from startup.

## Testing

### Test Online Mode
1. Connect to internet
2. Login at `/login`
3. Navigate to `/admin`
4. Verify green "Online" indicator

### Test Offline Mode
1. Disconnect internet
2. Click "Go to Offline Mode" in warning modal
3. Verify red "OFFLINE MODE" badge
4. Test all features (orders, printing, etc.)

### Test Mode Switching
1. From online: Click red WifiOff button
2. Verify redirect to `/offline-admin`
3. From offline: Click green Wifi button
4. Verify redirect to `/admin`

## Conclusion

This dual-mode system ensures your hotel operations never stop, regardless of internet connectivity. The professional UI and seamless switching provide a smooth experience for your staff in any situation.
