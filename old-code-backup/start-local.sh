#!/bin/bash

echo "Starting GZC Intel App - Local Production Replica"
echo "================================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Build and start all services
echo "Building and starting services..."
docker-compose -f docker-compose.prod-replica.yml up --build

# Services will be available at:
# - Frontend: http://localhost:3500
# - Backend API: http://localhost:5100
# - Quote WebSocket: ws://localhost:8080/quotes