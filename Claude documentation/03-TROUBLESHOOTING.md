# Troubleshooting Guide

## 🔴 Critical Issues & Solutions

### Components Not Loading in Modal
**Symptoms**: Modal appears empty, no components listed

**Solution**:
```javascript
// Clear localStorage corruption (browser console)
localStorage.clear()
location.reload()
```

**If persists in Chrome but works in Safari**:
- Chrome: Settings → Privacy → Clear browsing data → Cached images and files
- Use incognito mode to test

---

### Port 3500 Already in Use
**Symptoms**: Can't start dev server, "address already in use"

**Solution**:
```bash
# Find and kill process
lsof -i :3500
kill $(lsof -t -i :3500)

# Restart dev server
cd Main_Frontend
npm run dev
```

---

### Azure Deployment Not Updating
**Symptoms**: Changes not visible after deployment

**Solutions**:
1. **Always use versioned tags**:
```bash
VERSION=v$(date +%Y%m%d-%H%M%S)
docker build -t gzcacr.azurecr.io/gzc-intel-app:$VERSION ...
```

2. **Force browser refresh**: Ctrl+Shift+R (Cmd+Shift+R on Mac)

3. **Check active revision**:
```bash
az containerapp revision list \
  --name gzc-intel-application-ac \
  --resource-group gzc-kubernetes-rg \
  --query "[0].{active:properties.active}" -o table
```

---

### TypeScript Build Errors
**Symptoms**: Red squiggles everywhere, build fails

**Solution**:
```bash
# Use Vite directly (bypasses TypeScript)
npx vite build

# NOT this (includes TypeScript check)
npm run build
```

---

### WebSocket Connection Failed
**Symptoms**: No real-time quotes, console errors

**Solutions**:
1. **Start backend**:
```bash
cd app/backend
python fxspotstream.py
```

2. **Check Redis**:
```bash
redis-cli ping
# Should return: PONG
```

3. **Verify CORS in backend allows frontend URL**

---

### Component Drag/Drop Not Working
**Symptoms**: Can't move components in edit mode

**Solutions**:
1. **Ensure edit mode is active** (look for blue borders)
2. **Check data-grid attributes exist**
3. **Clear and rebuild layout**:
```javascript
// Browser console
localStorage.removeItem('tabLayouts')
location.reload()
```

---

### Wrong Container App Updated
**Symptoms**: Deployment succeeds but site doesn't change

**Solution**:
```bash
# CORRECT name
az containerapp update --name gzc-intel-application-ac ...

# WRONG name (don't use!)
az containerapp update --name gzc-intel-app ...
```

---

### localStorage Corruption
**Symptoms**: "JSON Parse error" in console

**Solution**:
```javascript
// Browser console - nuclear option
localStorage.clear()
sessionStorage.clear()
location.reload()
```

---

### Mixed Content Blocking
**Symptoms**: HTTPS site can't load HTTP Bloomberg API

**Current Workarounds**:
1. Use development mode (HTTP localhost)
2. Configure browser to allow mixed content (not recommended)
3. Future: Update Bloomberg server to HTTPS

---

## 🔧 Diagnostic Commands

### Check What's Running
```bash
# Frontend port
lsof -i :3500

# Backend port  
lsof -i :5100

# Redis
redis-cli ping
```

### Azure Container App Status
```bash
# List recent revisions
az containerapp revision list \
  --name gzc-intel-application-ac \
  --resource-group gzc-kubernetes-rg \
  --query "[0:3].{name:name, active:properties.active}" -o table

# Check logs
az containerapp logs show \
  --name gzc-intel-application-ac \
  --resource-group gzc-kubernetes-rg \
  --follow
```

### Docker Debugging
```bash
# Check image contents
docker run --rm gzcacr.azurecr.io/gzc-intel-app:VERSION ls /var/www/html/

# Run locally
docker run -p 3500:80 gzcacr.azurecr.io/gzc-intel-app:VERSION
```

## 🚨 Emergency Procedures

### Rollback Deployment
```bash
# Get previous revision
az containerapp revision list \
  --name gzc-intel-application-ac \
  --resource-group gzc-kubernetes-rg \
  --query "[1].name" -o tsv

# Activate it
az containerapp revision set-mode \
  --name gzc-intel-application-ac \
  --resource-group gzc-kubernetes-rg \
  --mode single \
  --revision [PREVIOUS_REVISION_NAME]
```

### Restart Container App
```bash
az containerapp revision restart \
  --name gzc-intel-application-ac \
  --resource-group gzc-kubernetes-rg \
  --revision [REVISION_NAME]
```

### Force New Revision
```bash
az containerapp revision copy \
  --name gzc-intel-application-ac \
  --resource-group gzc-kubernetes-rg
```

-- Claude Code @ 2025-01-08T18:39:45Z