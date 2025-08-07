# GZC Intel Application AC

## Overview
Core GZC Intel Application with WebSocket backend - production-ready multi-repo architecture.

## Architecture

This is the main orchestration repository that brings together three key components:

1. **Main Repository** (this repo): Orchestration, deployment configs, and documentation
2. **Frontend Repository**: React-based UI with component inventory system ([gzc-intel-app](https://github.com/GZCIM/gzc-intel-app))
3. **Backend Repository**: Flask WebSocket server for real-time FX data ([fx-websocket-backend](https://github.com/GZCIM/fx-websocket-backend))

## Repository Structure

```
GZC-Intel-Application-AC/
├── gzc-intel-frontend/      # Submodule: React/TypeScript frontend
├── fx-websocket-backend/    # Submodule: Flask/Socket.IO backend
├── deployment/              # Kubernetes and Docker configurations
├── docker-compose.yml       # Local development orchestration
└── README.md               # This file
```

## Key Features
- Real-time FX data streaming via WebSockets
- Drag-and-drop component dashboard
- Professional trading interface
- WebSocket integration for ESP/RFS/Execution
- FIX protocol support for market data

## Production Images
- Frontend: `gzcacr.azurecr.io/gzc-intel-app:fss-complete-fix`
- Backend: WebSocket server integrated

## Quick Start

### Clone with Submodules
```bash
git clone --recursive https://github.com/GZCIM/GZC-Intel-Application-AC.git
cd GZC-Intel-Application-AC
```

### Local Development
```bash
# Start all services
docker-compose up

# Frontend will be available at http://localhost:3000
# Backend WebSocket at ws://localhost:5000
```

### Update Submodules
```bash
git submodule update --init --recursive
```

## Development Guidelines
This is the CORE application - no experimental features, only production-ready code.

## Related Projects
- Bloomberg Volatility Surface App (research/experimental features)
- Bloomberg Gateway K8s Service (market data provider)