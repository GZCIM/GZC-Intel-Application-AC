# Local Development with Production Container

## Overview
We're using the working production container (`gzcacr.azurecr.io/gzc-intel-app:fss-complete-fix`) as our local development environment. This gives us all the working features while we develop new components.

## Quick Start

```bash
# Start local development (single command)
./start-local-dev.sh

# Access app
open http://localhost:3500
```

## What You Get
- ✅ **Tools Tab** - Full production features
- ✅ **Working WebSockets** - Live data feeds
- ✅ **Live FX Quotes** - From Azure Redis cache
- ✅ **Portfolio Management** - Real trading interface
- ✅ **Real-time Analytics** - Market data and charts

## Development Workflow

### 1. For UI/Component Changes
Since we're using the production container, UI changes require:

1. **Develop new component locally** (in separate folder)
2. **Test component** with Bloomberg volatility app
3. **Integrate into production** via new Docker build
4. **Deploy to Azure**

### 2. For Backend Changes
Backend source code is available in `fx-websocket-backend/`:

```bash
# Edit backend files
vim fx-websocket-backend/app.py

# Build new container with changes
docker build -t gzc-intel-app:local .

# Run with local changes
docker run -d --name gzc-local -p 3500:3500 gzc-intel-app:local
```

### 3. Adding Bloomberg Volatility Component

To add Bloomberg component to production version:

1. **Extract built assets** from container
2. **Modify JavaScript bundles** to include Bloomberg component
3. **Build new container image**
4. **Test locally**
5. **Deploy to Azure**

## Container Management

```bash
# Start development
./start-local-dev.sh

# Check status
docker ps
docker logs gzc-production

# Stop development
docker stop gzc-production

# Restart with fresh container
docker stop gzc-production && docker rm gzc-production
./start-local-dev.sh

# Access container for debugging
docker exec -it gzc-production /bin/bash
```

## Environment Variables
All production environment variables are included:
- `FIX_SOCKET_HOST=fixapi-nysim1.fxspotstream.com`
- `REDIS_HOST=gzc-redis.redis.cache.windows.net`
- `REDIS_PASSWORD` (from local .env)

## Next Steps for Bloomberg Integration

1. **Create new Docker image** with Bloomberg component
2. **Modify production JavaScript** to include component
3. **Build and test locally**
4. **Deploy to Azure Container Registry**
5. **Update Azure Container Apps**

This approach gives you:
- ✅ Working local development
- ✅ Production-identical environment  
- ✅ Clear deployment path
- ✅ No confusion between versions