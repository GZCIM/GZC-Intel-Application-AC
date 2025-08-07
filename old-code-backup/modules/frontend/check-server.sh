#!/bin/bash
if ! curl -s http://localhost:3500/ > /dev/null 2>&1; then
    echo "Server not running, starting it..."
    ./start-server.sh
else
    echo "Server is running"
fi