#\!/bin/bash
cd "$(dirname "$0")"

# Check if server is already running
if lsof -Pi :3500 -t >/dev/null; then
    echo "Server is already running on port 3500"
    exit 0
fi

# Kill any zombie node processes
pkill -f "vite" 2>/dev/null

# Start server with proper memory allocation
echo "Starting development server on port 3500..."
NODE_OPTIONS='--max-old-space-size=8192' npm run dev &

# Wait for server to be ready
echo "Waiting for server to start..."
for i in {1..30}; do
    if curl -s http://localhost:3500/ > /dev/null 2>&1; then
        echo "✓ Server is running at http://localhost:3500/"
        exit 0
    fi
    sleep 1
done

echo "✗ Server failed to start after 30 seconds"
exit 1
EOF < /dev/null