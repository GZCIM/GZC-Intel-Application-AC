# Submodule Management

## Submodules Overview

This project uses Git submodules to manage two separate repositories:

1. **Frontend Submodule** (`gzc-intel-frontend`)
   - Repository: https://github.com/GZCIM/gzc-intel-app
   - Branch: main
   - React/TypeScript application

2. **Backend Submodule** (`fx-websocket-backend`)
   - Repository: https://github.com/GZCIM/fx-websocket-backend
   - Branch: main
   - Flask/Socket.IO WebSocket server

### Initial Clone
```bash
git clone --recursive https://github.com/GZCIM/GZC-Intel-Application-AC.git
```

### Update Submodule
```bash
git submodule update --init --recursive
```

### Pull Latest Changes for All Submodules
```bash
# Update all submodules at once
git submodule update --remote --merge

# Or update individually:
# Frontend
cd gzc-intel-frontend
git checkout main
git pull origin main
cd ..

# Backend
cd fx-websocket-backend
git checkout main
git pull origin main
cd ..

# Commit the submodule updates
git add gzc-intel-frontend fx-websocket-backend
git commit -m "Update submodules to latest versions"
```

### IMPORTANT
- Always use the `main` branch for production
- The `alex_integration` branch has experimental changes that broke WebSockets
- Stick with `fss-complete-fix` image for deployments