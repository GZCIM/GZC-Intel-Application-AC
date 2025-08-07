#!/bin/bash

echo "🚀 Starting GZC Intel App - Production Copy"
echo "=========================================="

# Check if we have Redis password
if [ -z "$REDIS_PASSWORD" ]; then
    echo "⚠️  WARNING: REDIS_PASSWORD not set"
    echo "   You can set it with: export REDIS_PASSWORD='your-password'"
    echo "   Or check app/backend/.env for the password"
    echo ""
fi

# Option 1: Docker Compose (Recommended)
echo "Starting with Docker Compose..."
echo ""

# Clean up any existing containers
docker-compose down 2>/dev/null

# Start services
docker-compose up --build

# If Docker fails, offer alternative
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Docker Compose failed. Try the manual method:"
    echo ""
    echo "1. Install nginx:"
    echo "   brew install nginx"
    echo ""
    echo "2. Configure nginx:"
    echo "   cp nginx-config/sites-enabled/default /usr/local/etc/nginx/servers/gzc-intel.conf"
    echo "   nginx -s reload"
    echo ""
    echo "3. Start backend:"
    echo "   cd app/backend"
    echo "   pip install -r requirements.txt"
    echo "   python run.py"
fi