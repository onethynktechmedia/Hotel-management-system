#!/bin/bash

# Setup script for Hotel Management System

echo "Setting up Hotel Management System..."

# Copy environment file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "✓ Environment file created"
else
    echo "✓ Environment file already exists"
fi

# Install dependencies
echo "Installing dependencies..."
npm install

echo ""
echo "Setup complete!"
echo "Run 'npm run dev' to start the development server"
