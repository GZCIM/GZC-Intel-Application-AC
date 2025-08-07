#!/bin/bash

# GZC Intel Local Development Startup Script
# Bulletproof startup with Vite corruption fix applied

echo "🚀 Starting GZC Intel Local Development Environment"
echo "=================================================="

# Check if Redis password is provided
if [ -z "$REDIS_PASSWORD" ]; then
    echo "⚠️  No REDIS_PASSWORD provided - using local Redis"
    echo "   Set REDIS_PASSWORD environment variable to use Azure Redis"
    export USE_LOCAL_REDIS=true
else
    echo "✅ Using Azure Redis with provided password"
    export USE_LOCAL_REDIS=false
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.local.yml down

# Clean up any corrupted containers/volumes
echo "🧹 Cleaning up Docker system..."
docker system prune -f

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose -f docker-compose.local.yml up --build -d

# Wait for services to be ready with progress indicator
echo "⏳ Waiting for services to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:5100/health >/dev/null 2>&1 && curl -s http://localhost:3500 >/dev/null 2>&1; then
        echo "✅ All services ready!"
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

# Check service health with detailed diagnostics
echo "🔍 Checking service health..."

# Check backend
if curl -s http://localhost:5100/health | grep -q "up"; then
    echo "✅ Backend: Ready at http://localhost:5100"
    echo "   WebSocket endpoints: /ws_esp, /ws_rfs, /ws_execution"
else
    echo "❌ Backend: Not responding - checking logs..."
    docker-compose -f docker-compose.local.yml logs backend --tail 10
fi

# Check frontend
if curl -s http://localhost:3500 | grep -q "GZC Intel App"; then
    echo "✅ Frontend: Ready at http://localhost:3500"
    echo "   Vite dev server running with global installation"
else
    echo "❌ Frontend: Not responding - checking logs..."
    docker-compose -f docker-compose.local.yml logs frontend --tail 10
fi

# Check Redis
if docker-compose -f docker-compose.local.yml exec redis-local redis-cli ping >/dev/null 2>&1; then
    echo "✅ Redis: Local Redis responding"
else
    echo "⚠️  Redis: Using Azure Redis or connection issue"
fi

echo ""
echo "🎉 GZC Intel Local Development Environment Started!"
echo "=================================================="
echo ""
echo "📱 Application: http://localhost:3500"
echo "🔧 Backend API: http://localhost:5100"
echo "📊 Health Check: http://localhost:5100/health"
echo ""
echo "🛠️  Development Features:"
echo "   ✅ Hot reload for frontend changes"
echo "   ✅ Bloomberg volatility component integrated"  
echo "   ✅ Professional component registry"
echo "   ✅ Multi-theme support"
echo "   ✅ WebSocket connections ready"
echo "   ✅ Real-time data feeds"
echo "   ✅ PostgreSQL backend (SQL Server removed)"
echo "   ✅ Global Vite installation (corruption-proof)"
echo ""
echo "🔧 Management Commands:"
echo "   docker-compose -f docker-compose.local.yml logs     # View logs"
echo "   docker-compose -f docker-compose.local.yml down     # Stop all"
echo "   docker-compose -f docker-compose.local.yml restart  # Restart"
echo "   docker-compose -f docker-compose.local.yml ps       # Container status"
echo ""

# Ask if user wants to follow logs
read -p "📋 Follow logs? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Following logs (Ctrl+C to exit):"
    docker-compose -f docker-compose.local.yml logs -f
fi