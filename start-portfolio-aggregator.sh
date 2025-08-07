#!/bin/bash

echo "Starting Portfolio Aggregator Backend..."

# Change to portfolio aggregator directory
cd portfolio-aggregator/app

# Check if venv exists, create if not
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Set environment variables to connect to our local backend
export ESP_STREAM_URL="ws://localhost:5100/ws_esp"
export RFS_STREAM_URL="ws://localhost:5100/ws_rfs"
export EXEC_STREAM_URL="ws://localhost:5100/ws_execution"

# Start the FastAPI application on port 5001 (to avoid conflict with backend on 5100)
echo "Starting Portfolio Aggregator on port 5001..."
uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload