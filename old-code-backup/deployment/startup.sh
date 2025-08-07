#!/bin/sh

# Start backend in background
cd /app/backend
python3 run.py &

# Start nginx in foreground
nginx -g "daemon off;"