# Deployment Guide

## Cloud Deployment (Vercel)

### Deploy to Vercel
1. Push code to GitHub (already done)
2. Go to [vercel.com](https://vercel.com)
3. Import your repository: `https://github.com/onethynktechmedia/Hotel-management-system`
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
5. Click Deploy

### Your Live Link
After deployment, you'll get a URL like: `https://hotel-management-system.vercel.app`

---

## Offline Deployment (Local Server)

### Prerequisites
- Linux server (Ubuntu/Debian recommended)
- Node.js 18+ installed
- Internet connection for initial setup only

### Quick Setup

1. **Run the setup script**
   ```bash
   chmod +x OFFLINE_SETUP.sh
   sudo ./OFFLINE_SETUP.sh
   ```

2. **Start the application**
   ```bash
   pm2 start npm --name 'hotel-app' -- start
   ```

3. **Access the application**
   - Local: http://localhost:3000
   - Network: http://YOUR_SERVER_IP:3000

### Manual Setup (Alternative)

1. **Install PostgreSQL**
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

2. **Create Database**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE hotel_management;
   CREATE USER hotel_user WITH PASSWORD 'hotel_password';
   GRANT ALL PRIVILEGES ON DATABASE hotel_management TO hotel_user;
   \q
   ```

3. **Install Dependencies**
   ```bash
   npm install
   npm install -g pm2
   ```

4. **Setup Environment**
   ```bash
   echo "DATABASE_URL=postgresql://hotel_user:hotel_password@localhost:5432/hotel_management" > .env.local
   echo "NEXT_PUBLIC_SUPABASE_URL=http://localhost:3000" >> .env.local
   echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=local_development_key" >> .env.local
   ```

5. **Build and Run**
   ```bash
   npm run build
   pm2 start npm --name 'hotel-app' -- start
   pm2 save
   pm2 startup
   ```

### Access from Other Devices

1. **Find your server IP**
   ```bash
   ip addr show | grep inet
   ```

2. **Access from mobile/tablet**
   - Connect to same WiFi network
   - Open browser: `http://YOUR_SERVER_IP:3000`

### Printer Setup (Offline)

1. **Install CUPS**
   ```bash
   sudo apt install cups
   sudo systemctl start cups
   sudo systemctl enable cups
   ```

2. **Add Thermal Printer**
   ```bash
   sudo lpadmin -p EC58 -v usb://Everycom/EC58 -m everywhere
   sudo cupsaccept EC58
   sudo lpoptions -d EC58
   ```

3. **Enable Printer Sharing**
   ```bash
   sudo cupsctl --share-printers
   ```

### PM2 Commands

```bash
# Start application
pm2 start npm --name 'hotel-app' -- start

# Stop application
pm2 stop hotel-app

# Restart application
pm2 restart hotel-app

# View logs
pm2 logs hotel-app

# Monitor
pm2 monit

# Save process list
pm2 save

# Setup startup script
pm2 startup
```

### Firewall Setup

```bash
# Allow port 3000
sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable
```

---

## Production Server Recommendations

### Hardware
- **Minimum**: 2GB RAM, 20GB storage
- **Recommended**: 4GB RAM, 50GB SSD
- **Options**: Raspberry Pi 4, Mini PC, or VPS

### Operating System
- Ubuntu 22.04 LTS or 24.04 LTS
- Debian 12

### Network
- Local WiFi router for offline access
- Static IP recommended for easy access

### Backup Strategy

```bash
# Backup database
sudo -u postgres pg_dump hotel_management > backup.sql

# Restore database
sudo -u postgres psql hotel_management < backup.sql

# Automated backup (add to crontab)
0 2 * * * sudo -u postgres pg_dump hotel_management > /backups/hotel_$(date +\%Y\%m\%d).sql
```

---

## Troubleshooting

### Application won't start
```bash
# Check logs
pm2 logs hotel-app

# Check if port 3000 is in use
lsof -i :3000

# Kill process on port 3000
kill -9 $(lsof -t -i:3000)
```

### Database connection failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Test connection
psql -U hotel_user -d hotel_management -h localhost
```

### Printer not working
```bash
# Check CUPS status
sudo systemctl status cups

# List printers
lpstat -p

# Test print
echo "Test Print" | lp -d EC58
```

---

## Summary

### For Online Use
- Deploy to Vercel: https://vercel.com
- Link: Will be provided after deployment
- Requires: Supabase cloud database

### For Offline Use
- Run: `sudo ./OFFLINE_SETUP.sh`
- Access: http://localhost:3000 or http://YOUR_IP:3000
- Requires: Local PostgreSQL, thermal printer via USB
- Works: Completely offline after initial setup
