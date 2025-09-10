#!/bin/bash

echo "🚀 Starting Meter Dashboard Deployment..."

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

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_error "PM2 is not installed. Installing PM2..."
    npm install -g pm2
fi

# Create logs directory if it doesn't exist
if [ ! -d "logs" ]; then
    print_status "Creating logs directory..."
    mkdir -p logs
fi

# Install dependencies
print_status "Installing dependencies..."
npm install --production

# Stop existing PM2 process if running
print_status "Stopping existing PM2 process..."
pm2 stop meter-dashboard 2>/dev/null || print_warning "No existing process to stop"

# Delete existing PM2 process
pm2 delete meter-dashboard 2>/dev/null || print_warning "No existing process to delete"

# Start the application with PM2
print_status "Starting application with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
print_status "Saving PM2 configuration..."
pm2 save

# Show PM2 status
print_status "Deployment completed! Current PM2 status:"
pm2 status

# Show logs location
print_status "Logs are available in ./logs/ directory"
print_status "Use 'pm2 logs meter-dashboard' to view real-time logs"
print_status "Use 'pm2 monit' to monitor the application"

echo ""
print_status "🎉 Deployment successful!"
print_status "Your Meter Dashboard is now running at http://localhost:3000"