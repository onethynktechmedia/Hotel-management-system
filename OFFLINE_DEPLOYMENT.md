# Offline Deployment Guide

## Can This Work Offline?

**Yes, this application can work offline** with proper setup. However, there are some important considerations:

### Current Architecture
- **Frontend**: Next.js (React) - Can work offline
- **Backend**: Supabase (PostgreSQL + Realtime) - Requires internet connection
- **Printing**: WebUSB (Desktop) / Browser Print (Mobile) - Works offline

### For Complete Offline Operation

You need to replace Supabase with a local database. Here are your options:

## Option 1: Local PostgreSQL Database (Recommended)

### Prerequisites
- PostgreSQL installed on your machine
- Node.js installed
- Your EC58B thermal printer connected via USB

### Setup Steps

1. **Install PostgreSQL**
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   ```

2. **Create Database**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE hotel_management;
   CREATE USER hotel_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE hotel_management TO hotel_user;
   \q
   ```

3. **Run Schema**
   ```bash
   psql -U hotel_user -d hotel_management -f supabase-schema.sql
   ```

4. **Update Environment Variables**
   Create `.env.local`:
   ```env
   DATABASE_URL=postgresql://hotel_user:your_password@localhost:5432/hotel_management
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:3000
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_key
   ```

5. **Install Dependencies**
   ```bash
   npm install pg @types/pg
   ```

6. **Create API Routes for Local Database**
   Replace Supabase calls with direct PostgreSQL queries in your API routes.

## Option 2: Docker Deployment (Easiest)

### Prerequisites
- Docker installed
- Docker Compose installed

### Setup Steps

1. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   services:
     postgres:
       image: postgres:15
       container_name: hotel_db
       environment:
         POSTGRES_DB: hotel_management
         POSTGRES_USER: hotel_user
         POSTGRES_PASSWORD: your_password
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data
         - ./supabase-schema.sql:/docker-entrypoint-initdb.d/schema.sql
   
   app:
     build: .
     container_name: hotel_app
     ports:
       - "3000:3000"
     environment:
       DATABASE_URL: postgresql://hotel_user:your_password@postgres:5432/hotel_management
     depends_on:
       - postgres
   
   volumes:
     postgres_data:
   ```

2. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

3. **Run Docker**
   ```bash
   docker-compose up -d
   ```

## Option 3: Electron Desktop App (Best for Offline)

### Prerequisites
- Node.js installed
- Your EC58B thermal printer connected via USB

### Setup Steps

1. **Install Electron**
   ```bash
   npm install electron electron-builder --save-dev
   ```

2. **Create electron/main.js**
   ```javascript
   const { app, BrowserWindow } = require('electron')
   const path = require('path')
   
   function createWindow() {
     const win = new BrowserWindow({
       width: 1200,
       height: 800,
       webPreferences: {
         nodeIntegration: true,
         contextIsolation: false
       }
     })
     
     win.loadURL('http://localhost:3000')
   }
   
   app.whenReady().then(createWindow)
   ```

3. **Update package.json**
   ```json
   {
     "main": "electron/main.js",
     "scripts": {
       "electron": "electron .",
       "electron-build": "electron-builder"
     }
   }
   ```

4. **Run Electron App**
   ```bash
   npm run electron
   ```

## Printing in Offline Mode

### Desktop (Electron/Local)
- **WebUSB**: Works directly with USB printer
- **No internet required**
- **Direct printing to EC58B**

### Mobile (Offline)
- **Browser Print**: Requires printer to be shared via network
- **Bluetooth Printer**: Can use Web Bluetooth API
- **Cloud Print**: Not available offline

## Network Printer Setup for Mobile

To print from mobile devices in offline mode:

1. **Share Printer via Network**
   ```bash
   # Install CUPS
   sudo apt install cups
   
   # Enable printer sharing
   sudo cupsctl --share-printers
   
   # Add printer to CUPS
   sudo lpadmin -p EC58B -v usb://Everycom/EC58 -m everywhere
   ```

2. **Connect Mobile to Same Network**
   - Connect mobile device to local WiFi
   - Access app via local IP (e.g., http://192.168.1.100:3000)
   - Print via browser print dialog

## Summary

### What Works Offline Now
- ✅ Frontend (Next.js)
- ✅ Printing (WebUSB on desktop, browser print on mobile)
- ✅ Local database (with setup)

### What Requires Internet
- ❌ Supabase (can be replaced with local PostgreSQL)
- ❌ Vercel deployment (can be replaced with local server)

### Recommended Offline Setup
1. **Use Docker** for easy local deployment
2. **Replace Supabase** with local PostgreSQL
3. **Use Electron** for desktop app
4. **Configure CUPS** for network printing (mobile access)

## Quick Start for Offline Testing

```bash
# 1. Clone and setup
git clone <your-repo>
cd hotel
npm install

# 2. Setup local database
sudo apt install postgresql
sudo -u postgres psql -c "CREATE DATABASE hotel_management;"
sudo -u postgres psql -d hotel_management -f supabase-schema.sql

# 3. Update .env.local
echo "DATABASE_URL=postgresql://postgres@localhost:5432/hotel_management" > .env.local

# 4. Run locally
npm run dev

# 5. Access at http://localhost:3000
```

## Production Offline Deployment

For a complete offline production system:

1. **Use a dedicated server** (Raspberry Pi, mini PC)
2. **Install PostgreSQL locally**
3. **Deploy Next.js with PM2**
4. **Configure CUPS for printing**
5. **Set up local network** (WiFi router)
6. **Connect devices to local network**

This gives you a complete offline POS system that works without internet.
