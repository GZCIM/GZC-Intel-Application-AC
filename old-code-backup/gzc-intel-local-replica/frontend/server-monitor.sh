#!/bin/bash

# Auto-restart server with monitoring
cd "$(dirname "$0")"

echo "🚀 Starting GZC Intel App Server Monitor"

# Kill any existing processes
pkill -f "node.*vite" 2>/dev/null || true
sleep 2

# Start server with proper memory allocation
echo "Starting server on port 3500..."
NODE_OPTIONS='--max-old-space-size=8192' npm run dev &
SERVER_PID=$!

# Monitor function
monitor_server() {
    while true; do
        sleep 30
        if ! curl -s http://localhost:3500/ > /dev/null 2>&1; then
            echo "⚠️  Server not responding, restarting..."
            kill $SERVER_PID 2>/dev/null || true
            NODE_OPTIONS='--max-old-space-size=8192' npm run dev &
            SERVER_PID=$!
        fi
    done
}

# Keep server running
echo "✅ Server started with PID: $SERVER_PID"
echo "📊 Monitoring server health every 30 seconds"
echo "Press Ctrl+C to stop"

# Start monitoring in background
monitor_server &
MONITOR_PID=$!

# Wait for interrupt
trap "kill $SERVER_PID $MONITOR_PID 2>/dev/null; exit" INT TERM
wait