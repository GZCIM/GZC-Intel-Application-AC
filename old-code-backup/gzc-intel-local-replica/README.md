# GZC Intel Application - Local Development Environment

Complete local replica of the Azure production environment with Bloomberg integration.

## 🏗️ Architecture

This local environment replicates the exact production architecture:

- **Frontend**: React/TypeScript with professional component system
- **Backend**: Flask-SocketIO with Redis integration and FIX protocol
- **WebSockets**: Real-time data feeds (`/ws_esp`, `/ws_rfs`, `/ws_execution`)
- **Component System**: Professional registry with Bloomberg volatility integration
- **Multi-Theme**: Dynamic theme switching with Bloomberg component adaptation

## 🚀 Quick Start

```bash
# Clone and start development environment
cd gzc-intel-local-replica
./start-local-development.sh
```

Access the application at: http://localhost:3500

## 🔧 Development Setup

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### Environment Variables
```bash
# Optional: Use Azure Redis (production)
export REDIS_PASSWORD="[your-azure-redis-password]"

# Without REDIS_PASSWORD, uses local Redis for development
```

### Directory Structure
```
gzc-intel-local-replica/
├── frontend/                 # React frontend source
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── core/           # Core systems (tabs, registry, providers)
│   │   ├── contexts/       # React contexts (theme, user, quotes)
│   │   └── modules/        # Feature modules
│   ├── package.json
│   └── vite.config.ts
├── backend/                  # Flask backend source
│   ├── app/
│   │   ├── controllers/    # WebSocket and API controllers
│   │   ├── dao/           # Data access objects
│   │   └── util/          # Utilities (FIX, Redis, logging)
│   ├── app.py
│   └── requirements.txt
├── deployment/              # Deployment configurations
├── docker-compose.local.yml # Local development orchestration
└── start-local-development.sh
```

## 📱 Bloomberg Integration

### Volatility Component
The Bloomberg volatility analysis component is fully integrated:

- **Component ID**: `bloomberg-volatility`
- **Registry**: Professional component registry with contract validation
- **Theme Integration**: Adapts to application theme dynamically
- **Features**: 3D volatility surfaces, smile analysis, term structure

### Adding Components
Components are registered in `/frontend/src/core/registry/ProfessionalComponentRegistry.ts`:

```typescript
await this.registerComponent(
  'component-id',
  {
    metadata: { /* component metadata */ },
    capabilities: { /* sizing, modes, performance */ },
    lifecycle: { /* initialization hooks */ },
    dataContract: { /* inputs/outputs */ }
  },
  () => import('path/to/component')
)
```

## 🔌 WebSocket Architecture

### Endpoints
- **ESP Feed**: `/ws_esp` - Real-time price streaming
- **RFS Feed**: `/ws_rfs` - Request-for-stream data
- **Execution**: `/ws_execution` - Trade execution updates

### Connection Flow
1. Frontend connects via Socket.IO client
2. Backend establishes FIX protocol connections
3. Redis caches and distributes real-time data
4. WebSocket broadcasts updates to connected clients

## 🎨 Theme System

### Multi-Theme Support
- **Dynamic theme switching**
- **Component theme adaptation**
- **Bloomberg component color integration**

### Theme Context
```typescript
const { currentTheme, setTheme } = useTheme()
// Available themes: quantum, classic, dark, etc.
```

## 🧪 Testing

### Local Development Testing
```bash
# Start development environment
./start-local-development.sh

# Test Bloomberg component loading
# 1. Open http://localhost:3500
# 2. Navigate to component selector
# 3. Search for "Bloomberg" or "Volatility"
# 4. Add component to workspace
```

### Health Checks
- **Frontend**: http://localhost:3500
- **Backend**: http://localhost:5100/health
- **WebSocket**: Test connection in browser console

## 🚀 Production Deployment

### Build Production Image
```bash
# Build complete production image
docker build -t gzc-intel-app:local .

# Run production container
docker run -d \
  -p 3500:3500 \
  -p 5100:5100 \
  -e REDIS_PASSWORD="$REDIS_PASSWORD" \
  gzc-intel-app:local
```

### Azure Deployment
This environment matches the Azure production configuration:
- Same environment variables
- Same WebSocket endpoints
- Same component architecture
- Same Redis integration

## 📊 Monitoring

### Development Logs
```bash
# View all service logs
docker-compose -f docker-compose.local.yml logs

# Follow specific service
docker-compose -f docker-compose.local.yml logs -f frontend
docker-compose -f docker-compose.local.yml logs -f backend
```

### Debug Features
- **Component Inventory Debug**: Built-in debugging for component registration
- **WebSocket Connection Monitor**: Real-time connection status
- **Theme System Inspector**: Theme debugging utilities

## 🔒 Security

- **No hardcoded secrets**: Uses environment variables
- **Redis SSL**: Production Redis uses SSL connections
- **FIX Protocol Security**: Authenticated connections to price feeds
- **CORS Configuration**: Proper cross-origin handling

## 🤝 Contributing

1. Make changes in respective directories (`frontend/` or `backend/`)
2. Test locally with `./start-local-development.sh`
3. Verify Bloomberg component integration
4. Ensure all WebSocket connections work
5. Test theme switching with Bloomberg components

## 📞 Support

For issues or questions:
1. Check service logs: `docker-compose logs`
2. Verify environment variables are set correctly
3. Ensure Docker and Docker Compose are updated
4. Test WebSocket connections in browser console

---

This local environment provides a complete development replica of the Azure production system with Bloomberg integration ready for testing and development.