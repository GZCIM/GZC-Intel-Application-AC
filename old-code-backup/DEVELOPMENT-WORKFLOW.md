# Development Workflow Guide

## Current Multi-Repo Structure

The GZC Intel Application AC uses a multi-repo architecture:

1. **Main Repository**: `GZC-Intel-Application-AC`
   - Orchestration and deployment configs
   - Submodules for each component
   - Docker compose files

2. **Frontend Repository**: `gzc-intel-frontend` (submodule)
   - React application with component system
   - Component registry at `src/core/tabs/enhancedComponentRegistry.ts`
   - Modular architecture for easy component integration

3. **Backend Repository**: `fx-websocket-backend` (submodule)
   - Flask + Socket.IO backend
   - FIX protocol connections
   - WebSocket server for frontend

## Development Flow

### 1. Building Standalone Apps
When developing new features (like Bloomberg Volatility):
- Build as standalone app first
- Use similar architecture (React, TypeScript, same UI patterns)
- Test thoroughly in isolation

### 2. Component Integration Process

#### A. Extract Component from Standalone App
```bash
# Example: Extracting volatility component
cp -r /path/to/standalone/src/components/VolatilityAnalysis ./gzc-intel-frontend/src/components/
```

#### B. Register Component in Main App
Edit `gzc-intel-frontend/src/core/tabs/enhancedComponentRegistry.ts`:
```typescript
BloombergVolatility: {
  loader: () => import('../../components/volatility/VolatilityAnalysisTab'),
  metadata: {
    id: 'BloombergVolatility',
    displayName: 'Bloomberg Volatility Surface',
    category: 'analytics'
  }
}
```

#### C. Handle Dependencies
- Copy required API clients, utils, contexts
- Update import paths
- Install any missing npm packages

### 3. Testing Integration
1. Run locally with production container
2. Test component appears in component library
3. Verify all features work

### 4. Deployment Process

#### A. Push to GitHub
```bash
# Commit changes
git add .
git commit -m "Add [Component Name] to component library"
git push origin main
```

#### B. Deploy to Azure
```bash
# Build new container
docker build -t gzcacr.azurecr.io/gzc-intel-app:new-version .

# Push to ACR
az acr login --name gzcacr
docker push gzcacr.azurecr.io/gzc-intel-app:new-version

# Update Container App
az containerapp update \
  --name gzc-intel-app \
  --resource-group gzc-kubernetes-rg \
  --image gzcacr.azurecr.io/gzc-intel-app:new-version
```

## Component Standards

To ensure smooth integration:

1. **Similar Architecture**
   - Use React functional components
   - TypeScript for type safety
   - Same theming system (useTheme hook)
   - Consistent error handling

2. **API Integration**
   - Use axios for HTTP calls
   - WebSocket connections via Socket.IO
   - Proper error boundaries

3. **UI Patterns**
   - Follow existing component structure
   - Use same styling approach
   - Implement loading/error states

## Example: Bloomberg Volatility Integration

We already integrated the Bloomberg Volatility component:
1. Copied component files to `gzc-intel-frontend/src/components/volatility/`
2. Added to component registry
3. Component now available in the app's component library

## Notes for Engineers

- Each repository can be developed independently
- Use submodules to maintain separation
- Always test integration locally before deploying
- Follow the existing patterns for consistency