# Complete Repository Structure

## GitHub Organization: GZCIM

### 1. Main Orchestration Repository
**Repo**: `GZCIM/GZC-Intel-Application-AC`
- **Purpose**: Core orchestration, deployment configs, multi-repo management
- **Contains**: 
  - Docker compose files
  - Deployment scripts
  - Submodule references
  - Documentation

### 2. Frontend Repository  
**Repo**: `GZCIM/gzc-intel-app`
- **Purpose**: React frontend with component system
- **Contains**:
  - React application (TypeScript)
  - Component registry system
  - WebSocket client (QuoteContext)
  - UI components library
  - Drag-and-drop dashboard

### 3. Backend Repository
**Repo**: `GZCIM/fx-websocket-backend`
- **Purpose**: Flask backend with WebSocket and FIX protocol
- **Contains**:
  - Flask + Socket.IO server
  - FIX protocol integration (FXSpotStream)
  - WebSocket endpoints
  - Redis connection for quotes
  - Real-time data streaming

### 4. Component Repositories (Optional)
**Repo**: `GZCIM/bloomberg-volatility-surface`
- **Purpose**: Standalone components that can be integrated
- **Contains**: Specialized visualization components

## Local Structure
```
GZC Intel Application AC/
├── .gitmodules                    # Submodule configuration
├── fx-websocket-backend/          # Submodule → GZCIM/fx-websocket-backend
│   ├── app/                       # Flask application
│   ├── run.py                     # Entry point
│   └── requirements.txt           # Python dependencies
├── gzc-intel-frontend/            # Submodule → GZCIM/gzc-intel-app  
│   ├── src/
│   │   ├── components/            # React components
│   │   ├── contexts/              # Including QuoteContext (WebSocket)
│   │   └── core/tabs/             # Component registry
│   └── package.json               # Node dependencies
└── docker-compose.prod-replica.yml # Full system orchestration
```

## Complete Application Stack

1. **Frontend** (React)
   - UI Components
   - WebSocket client
   - Real-time updates

2. **Backend** (Flask)
   - Socket.IO server
   - WebSocket endpoints
   - Business logic

3. **FIX Integration**
   - FXSpotStream connection
   - Real-time FX quotes
   - Trading capabilities

4. **Data Layer**
   - Redis for quote caching
   - WebSocket for real-time streaming

All components are properly captured in the multi-repo structure.