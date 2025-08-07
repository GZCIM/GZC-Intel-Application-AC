#\!/bin/bash

echo "Stopping all services..."
lsof -ti:5100 -ti:8080 -ti:8081 | xargs kill -9 2>/dev/null || true

echo "Starting backend on port 5100..."
cd app/backend
source venv/bin/activate
python3.12 run.py > ../../backend-server.log 2>&1 &
cd ../..

sleep 3

echo "Starting enhanced proxy on port 8081..."
node enhanced-proxy.js > proxy.log 2>&1 &

sleep 2

echo "Services started\!"
echo "Access the app at: http://localhost:8081"
echo ""
echo "Check status with:"
echo "  Backend log: tail -f backend-server.log"
echo "  Proxy log: tail -f proxy.log"
