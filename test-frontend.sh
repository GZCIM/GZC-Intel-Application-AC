#!/bin/bash
echo "Testing frontend on port 3500..."
cd "$(dirname "$0")/frontend"
echo "Current directory: $(pwd)"
echo "Files: $(ls -1 | head -5)"
echo ""
echo "Starting server..."
echo "Access at: http://localhost:3500"
echo ""
python3.12 -m http.server 3500