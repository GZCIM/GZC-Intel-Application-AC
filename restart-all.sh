#!/bin/bash

echo "Stopping all services..."
lsof -ti:5100 -ti:5001 -ti:8080 -ti:8081 | xargs kill -9 2>/dev/null || true

echo "Starting backend on port 5100..."
cd app/backend
source venv/bin/activate
python3.12 run.py > ../../backend-server.log 2>&1 &
cd ../..

sleep 3

echo "Starting Portfolio Aggregator on port 5001..."
cd portfolio-aggregator/app
if [ ! -d "venv" ]; then
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt > ../../portfolio-install.log 2>&1
else
    source venv/bin/activate
fi
export ESP_STREAM_URL="ws://localhost:5100/ws_esp"
export RFS_STREAM_URL="ws://localhost:5100/ws_rfs"
export EXEC_STREAM_URL="ws://localhost:5100/ws_execution"
uvicorn app.main:app --host 0.0.0.0 --port 5001 > ../../portfolio-server.log 2>&1 &
cd ../..

sleep 3

echo "Starting enhanced proxy on port 8081..."
node enhanced-proxy.js > proxy.log 2>&1 &

sleep 2

echo "Services started!"
echo "Access the app at: http://localhost:8081"
echo "Portfolio Aggregator API at: http://localhost:5001"
echo ""
echo "Check status with:"
echo "  Backend log: tail -f backend-server.log"
echo "  Portfolio Aggregator log: tail -f portfolio-server.log"
echo "  Proxy log: tail -f proxy.log"