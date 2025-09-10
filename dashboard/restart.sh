#!/bin/bash

echo "🔄 Restarting Meter Dashboard..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if PM2 is running
if ! pgrep -f "pm2" > /dev/null; then
    print_error "PM2 is not running. Starting PM2..."
    pm2 start ecosystem.config.js --env production
    exit 0
fi

# Check if our app is running
if pm2 describe meter-dashboard > /dev/null 2>&1; then
    print_status "Restarting existing PM2 process..."
    pm2 restart meter-dashboard
    print_status "Application restarted successfully!"
else
    print_status "Starting new PM2 process..."
    pm2 start ecosystem.config.js --env production
    print_status "Application started successfully!"
fi

# Show status
pm2 status meter-dashboard