#!/bin/bash

echo "🚀 Starting GZC Intel App - Simple Local Mode"
echo "==========================================="

# Get the directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Kill any existing processes
echo "Stopping any existing servers..."
pkill -f "python.*run.py" 2>/dev/null
pkill -f "python.*http.server" 2>/dev/null

# Start frontend
echo ""
echo "1. Starting Frontend on port 3500..."
cd "$DIR/frontend"
python3.12 -m http.server 3500 > "$DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

# Start backend
echo "2. Starting Backend on port 5100..."
cd "$DIR/app/backend"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "   Creating virtual environment..."
    python3.12 -m venv venv
fi

# Activate virtual environment and install dependencies
echo "   Installing dependencies..."
source venv/bin/activate
pip install -r requirements.txt > "$DIR/backend-install.log" 2>&1

# Set environment variables
export FLASK_PORT=5100
export FLASK_HOST=0.0.0.0
export PYTHONUNBUFFERED=1

# Copy .env if it exists
if [ -f ".env" ]; then
    echo "   Loading environment from .env"
    set -a
    source .env
    set +a
fi

# Start the backend
echo "   Starting Flask application..."
python run.py > "$DIR/backend.log" 2>&1 &
BACKEND_PID=$!

echo ""
echo "✅ Services Started:"
echo "   Frontend: http://localhost:3500"
echo "   Backend: http://localhost:5100"
echo ""
echo "📝 Logs:"
echo "   Frontend: $DIR/frontend.log"
echo "   Backend: $DIR/backend.log"
echo ""
echo "⚠️  Note: WebSocket proxying won't work in this mode."
echo "   For full functionality, use Docker Compose or nginx."
echo ""
echo "Press Ctrl+C to stop all services..."

# Cleanup function
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $FRONTEND_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    exit 0
}

trap cleanup INT TERM

# Wait forever
while true; do
    sleep 1
done