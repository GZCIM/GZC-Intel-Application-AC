#!/bin/bash

# Kill any existing Chrome instances with debug port
pkill -f "remote-debugging-port=9222" || true

# Wait a moment
sleep 1

# Start Chrome with debugging
echo "Starting Chrome with debugging on port 9222..."
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --no-first-run \
  --user-data-dir=/tmp/chrome-debug-profile \
  http://localhost:3500 &

# Wait for Chrome to start
sleep 3

echo "Chrome started with debugging enabled!"
echo "You can now run: npm run debug:events"