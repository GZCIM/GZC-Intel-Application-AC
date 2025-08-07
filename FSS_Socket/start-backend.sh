#!/bin/bash
cd /app/backend
export FLASK_PORT=5100
export FLASK_HOST=0.0.0.0
export PYTHONUNBUFFERED=1
# Create empty log config if missing
touch log.cfg
echo "Starting FXSpotStream backend on port 5100..."
python -u run.py 2>&1
