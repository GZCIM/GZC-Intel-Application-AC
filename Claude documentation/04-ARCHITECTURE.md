# System Architecture

## 🏗 High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│         React + TypeScript + Vite                │
│              (Port 3500)                         │
└──────────────────┬──────────────────────────────┘
                   │
         ┌─────────┴──────────┬──────────────┐
         │                    │              │
    ┌────▼─────┐      ┌──────▼──────┐  ┌────▼─────┐
    │ Backend  │      │  Bloomberg  │  │  Redis   │
    │  Flask   │      │     API     │  │  Cache   │
    │   5100   │      │    8080     │  │   6379   │
    └──────────┘      └─────────────┘  └──────────┘
```

## 📦 Container Structure

### Production Container
```
Docker Image: gzcacr.azurecr.io/gzc-intel-app:VERSION
├── /var/www/html/          # Frontend build
├── /app/backend/           # Flask backend
├── /etc/nginx/             # Nginx config
└── /usr/bin/supervisord    # Process manager
```

### Azure Container App
- **Name**: gzc-intel-application-ac
- **URL**: https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io
- **Resource Group**: gzc-kubernetes-rg
- **Registry**: gzcacr.azurecr.io

## 🎨 Frontend Architecture

### Component System
```
ComponentInventory (Singleton)
    ├── Registration
    ├── Search Index
    └── Category Management

DynamicCanvas
    ├── React Grid Layout
    ├── Edit/View Modes
    └── Persistence Layer

ComponentRenderer
    ├── Lazy Loading
    ├── Error Boundaries
    └── Size Management
```

### State Management
```
App.tsx
  ├── ThemeProvider
  │   └── Theme persistence
  ├── UserProvider
  │   └── User selection
  └── TabLayoutManager
      └── Layout persistence
```

### Tab System
- Each tab has independent layout
- Layouts persist to localStorage
- Components maintain position/size per tab

## 🔌 Backend Services

### FXSpotStream Service
```python
Flask Application
  ├── WebSocket Handlers
  │   ├── /ws_esp
  │   ├── /ws_rfs
  │   └── /ws_execution
  ├── REST Endpoints
  │   ├── /health
  │   └── /api/subscribe_quote
  └── Redis Integration
      └── Quote caching
```

### Bloomberg Integration
```
Bloomberg Terminal (VM)
  └── Python API Server
      ├── /health
      ├── /api/market-data
      └── /api/fx/rates
```

## 💾 Data Flow

### Quote Updates
```
Bloomberg Terminal
    ↓ (HTTP Poll)
Backend Service
    ↓ (WebSocket)
Frontend Components
    ↓ (State Update)
UI Render
```

### Component State
```
User Action (drag/resize)
    ↓
Grid Layout Update
    ↓
localStorage Save
    ↓
Next Load Restoration
```

## 🔐 Security Layers

### Authentication
- Azure AD integration (planned)
- User context management
- Session persistence

### Network Security
- NSG rules for Bloomberg VM
- CORS configuration
- Container app ingress rules

## 🚀 Deployment Pipeline

### Build Process
```
1. Frontend Build (Vite)
2. Docker Image Creation
3. ACR Push
4. Container App Update
5. Revision Activation
```

### Environment Configuration
```bash
# Production
REDIS_PASSWORD=[Azure Key Vault]
FLASK_RUN_PORT=5000
NODE_ENV=production

# Development
REDIS_PASSWORD=local-dev
FLASK_RUN_PORT=5100
NODE_ENV=development
```

## 📊 Component Categories

### Financial Components
- Portfolio Dashboard
- Analytics Dashboard
- Trading Interface
- Market Overview

### Utility Components
- Documentation Viewer
- Empty Tab Placeholder
- Error Boundary
- Loading States

## 🔄 Update Mechanisms

### Real-time Updates
- WebSocket for quotes
- Polling for Bloomberg data
- React state for UI updates

### Persistent Storage
- localStorage for layouts
- Redis for quote cache
- Azure Storage (future)

## 🎯 Design Principles

1. **Modularity**: Components are self-contained
2. **Persistence**: User state survives refreshes
3. **Real-time**: Live data where possible
4. **Scalability**: Container-based deployment
5. **Maintainability**: Clear separation of concerns

-- Claude Code @ 2025-01-08T18:40:15Z