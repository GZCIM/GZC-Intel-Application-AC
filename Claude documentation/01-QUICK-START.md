# GZC Intel Application - Quick Start Guide

## 🚀 Get Started in 2 Minutes

### Local Development
```bash
# Frontend (port 3500)
cd Main_Frontend
npm run dev

# Backend (port 5100) 
cd app/backend
python fxspotstream.py
```

### Access Points
- **Local Frontend**: http://localhost:3500
- **Local Backend**: http://localhost:5100
- **Production**: https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io
- **Bloomberg API**: http://20.172.249.92:8080

## 📁 Project Structure
```
GZC Intel Application AC/
├── Main_Frontend/        # React frontend (THIS IS WHERE YOU WORK)
│   ├── src/             # Source code
│   ├── dist/            # Build output
│   └── CLAUDE.md        # Frontend-specific rules
├── app/backend/         # Flask backend with WebSockets
├── Dockerfile           # Container configuration
└── CLAUDE.md           # Project-wide rules
```

## 🛠 Common Tasks

### Deploy to Azure
```bash
# 1. Build frontend
cd Main_Frontend
npx vite build

# 2. Create Docker image with version tag
cd ..
VERSION=v$(date +%Y%m%d-%H%M%S)
docker build -t gzcacr.azurecr.io/gzc-intel-app:$VERSION --platform linux/amd64 .

# 3. Push to registry
docker push gzcacr.azurecr.io/gzc-intel-app:$VERSION

# 4. Deploy to container app (USE CORRECT NAME!)
az containerapp update \
  --name gzc-intel-application-ac \
  --resource-group gzc-kubernetes-rg \
  --image gzcacr.azurecr.io/gzc-intel-app:$VERSION
```

### Fix Common Issues
```bash
# Port conflict on 3500
kill $(lsof -t -i :3500)

# Clear corrupt localStorage (in browser console)
localStorage.clear()
location.reload()

# Force browser refresh after deployment
# Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

## ⚠️ Critical Rules
1. **ALWAYS work in Main_Frontend** for frontend changes
2. **NEVER use `:latest` Docker tag** - always version with timestamp
3. **Container app name is `gzc-intel-application-ac`** (NOT gzc-intel-app)
4. **Use `npx vite build`** to bypass TypeScript errors

## 📞 Need Help?
1. Check `02-DEVELOPMENT-GUIDE.md` for detailed instructions
2. See `03-TROUBLESHOOTING.md` for common problems
3. Review `04-ARCHITECTURE.md` for system design

-- Claude Code @ 2025-01-08T18:38:45Z