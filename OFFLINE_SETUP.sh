#!/bin/bash

# Hotel Management System - Offline Setup Script
# This script sets up the system for offline use with local PostgreSQL

echo "🏨 Hotel Management System - Offline Setup"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Install PostgreSQL
echo "📦 Installing PostgreSQL..."
apt update
apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
echo "🚀 Starting PostgreSQL service..."
systemctl start postgresql
systemctl enable postgresql

# Create database and user
echo "🗄️  Creating database and user..."
sudo -u postgres psql << EOF
CREATE DATABASE hotel_management;
CREATE USER hotel_user WITH PASSWORD 'hotel_password';
GRANT ALL PRIVILEGES ON DATABASE hotel_management TO hotel_user;
\c hotel_management
GRANT ALL ON SCHEMA public TO hotel_user;
EOF

# Run schema if exists
if [ -f "supabase-schema.sql" ]; then
    echo "📋 Running database schema..."
    sudo -u postgres psql -d hotel_management -f supabase-schema.sql
fi

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Install PM2 for process management
echo "🔧 Installing PM2..."
npm install -g pm2

# Create .env.local file
echo "🔐 Creating environment file..."
cat > .env.local << EOF
DATABASE_URL=postgresql://hotel_user:hotel_password@localhost:5432/hotel_management
NEXT_PUBLIC_SUPABASE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_ANON_KEY=local_development_key
EOF

# Build the application
echo "🔨 Building application..."
npm run build

echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Start the application: pm2 start npm --name 'hotel-app' -- start"
echo "2. View logs: pm2 logs hotel-app"
echo "3. Access at: http://localhost:3000"
echo "4. To stop: pm2 stop hotel-app"
echo "5. To restart: pm2 restart hotel-app"
