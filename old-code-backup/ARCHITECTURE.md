# GZC Intel Application Architecture

## Core Components

### 1. Frontend (gzc-intel-frontend)
- **Framework**: React 19 + TypeScript
- **Key Libraries**: 
  - react-grid-layout (drag-drop)
  - framer-motion (animations)
  - socket.io-client (WebSockets)
  - @azure/msal-react (authentication)
- **Features**:
  - Drag-and-drop component dashboard
  - Real-time FX data display
  - Portfolio management
  - Professional trading interface

### 2. WebSocket Backend (Integrated)
- **Technology**: Python FastAPI + WebSockets
- **Integration**: Runs inside main container
- **Proxy**: nginx handles WebSocket upgrades
- **Endpoints**:
  - ESP (Electronic Streaming Prices)
  - RFS (Request for Stream)
  - Execution feed

### 3. Deployment
- **Platform**: Azure Container Apps
- **Registry**: Azure Container Registry (gzcacr)
- **Network**: VNET integrated environment
- **SSL**: Managed by Azure

## Data Flow
```
User Browser
    ↓
Azure Container Apps (HTTPS)
    ↓
nginx proxy (in container)
    ↓
WebSocket Backend (Python)
    ↓
FIX Protocol Gateway
    ↓
Market Data Providers
```

## Key Design Decisions

1. **Monolithic Container**: Frontend + Backend in single container for simplicity
2. **nginx Proxy**: Handles WebSocket upgrade and routing
3. **No External Dependencies**: All WebSocket handling internal
4. **Production First**: No experimental features in this repository

## Working Configuration
The `fss-complete-fix` image is the ONLY verified working configuration.
DO NOT modify WebSocket paths or proxy configuration.