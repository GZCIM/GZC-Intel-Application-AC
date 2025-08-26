# CLAUDE.md - GZC Intel Application AC Frontend

This file provides critical guidance to Claude Code for maintaining and developing this codebase.

## 🚨 CRITICAL RULES - NO EXCEPTIONS

1. **WORKSPACE DISCIPLINE**
   - This is Main_Frontend - all frontend work happens HERE
   - NEVER create files at root level
   - NEVER duplicate existing patterns
   - ALWAYS check for existing files before creating new ones
   - RESPECT the established patterns and architecture
   - UPDATE journal entries in /journal/YYYY-MM-DD/ format
   - MAINTAIN comprehensive documentation

2. **DEPLOYMENT DISCIPLINE**
   - ALWAYS use versioned tags: `v$(date +%Y%m%d-%H%M%S)`
   - NEVER use `:latest` tag - it causes cache pollution
   - ALWAYS deploy from Main_Frontend directory
   - Container app name: `gzc-intel-application-ac` (NOT gzc-intel-app)
   - BUILD locally first, TEST, then deploy

3. **CODE QUALITY**
   - TypeScript errors are warnings, not blockers (use `npx vite build` to bypass)
   - Follow existing patterns in neighboring files
   - Use real implementations only
   - Keep components focused and single-purpose
   - Document all changes in journal

## 📁 Project Structure

```
Main_Frontend/
├── src/
│   ├── components/
│   │   ├── canvas/              # Grid layout system
│   │   │   ├── DynamicCanvas.tsx   # Main canvas with drag-drop
│   │   │   ├── StaticCanvas.tsx    # Fixed layout canvas
│   │   │   └── ComponentRenderer.tsx
│   │   ├── gzc-portfolio/       # Portfolio component
│   │   └── ProfessionalHeader.tsx  # Main header with tabs
│   ├── core/
│   │   ├── components/          # Component inventory
│   │   ├── tabs/               # Tab management system
│   │   └── registry/           # Component registry
│   ├── contexts/               # React contexts
│   ├── hooks/                  # Custom hooks
│   └── services/               # API and services
├── dist/                       # Build output
├── public/                     # Static assets
└── ../journal/                 # Development journal by date
    └── YYYY-MM-DD/            # Daily entries
```

## 🛠 Development Commands

```bash
# Start development server (port 3500)
npm run dev

# Build for production (bypasses TypeScript errors)
npx vite build

# Clean build
rm -rf dist && npx vite build

# Check what's running on port 3500
lsof -i :3500

# Kill process on port 3500
kill $(lsof -t -i :3500)
```

## 🏗️ User Memory Architecture (Cosmos DB + Azure AD) ✅ VERIFIED WORKING

### Authentication & Persistence
The application now uses proper enterprise authentication and persistence:

#### Frontend Authentication
- **MSAL Integration**: `/src/hooks/useAuth.ts` manages Azure AD authentication
- **Token Acquisition**: Automatic token refresh and silent acquisition
- **Database Service**: `/src/services/databaseService.ts` sends Bearer tokens with all requests

#### Backend Security
- **Main_Gateway**: FastAPI backend with Azure AD JWT validation
- **Token Validation**: All endpoints require valid Azure AD tokens
- **User Isolation**: Data filtered by user ID from token claims

#### Cosmos DB Persistence (Primary)
```javascript
// User configuration document structure
{
  id: "user-{userId}",
  userId: "homeAccountId",
  tabs: [...],        // User tabs with components
  layouts: [...],     // Saved layout presets
  preferences: {      // Theme, language, settings
    theme: "dark",
    language: "en"
  },
  timestamp: "2025-08-14T04:30:00Z",
  type: "user-config"
}
```

#### PostgreSQL Fallback (Legacy)
- Used as backup when Cosmos DB is unavailable
- Maintains compatibility with older installations

#### Key Files Modified
- `/src/core/tabs/TabLayoutManager.tsx` - Cosmos DB integration for tabs and layouts
- `/src/services/cosmosConfigService.ts` - Primary Cosmos DB client
- `/Main_Gateway/backend/app/controllers/cosmos_config_controller.py` - Cosmos DB API endpoints
- `/Main_Gateway/backend/app/auth/azure_auth.py` - Azure AD validation

#### API Endpoints
- **GET** `/api/cosmos/config` - Load user configuration from Cosmos DB
- **POST** `/api/cosmos/config` - Save user configuration to Cosmos DB
- **GET** `/api/cosmos/health` - Check Cosmos DB connectivity

### Testing User Memory Persistence
```javascript
// Browser console test
const accounts = window.msalInstance?.getAllAccounts()
console.log('Authenticated:', accounts?.length > 0)

// Test Cosmos DB persistence
// 1. Add Bloomberg Volatility component via Tools → Add Component
// 2. Refresh page (Ctrl+R) - component should persist
// 3. Test in different browser (Chrome vs Safari) - should sync
// 4. Check Network tab for /api/cosmos/config calls (200 = success)

// Manual API test
const token = await window.msalInstance.acquireTokenSilent({
  scopes: ['User.Read'],
  account: accounts[0]
}).then(r => r.accessToken);

fetch('/api/cosmos/config', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log)
```

## 🚀 Deployment Process - COMPLETE CHECKLIST

### Pre-Deployment Checks
```bash
# 1. Verify correct directory
pwd  # Must be: /Users/mikaeleage/GZC Intel Application AC/Main_Frontend

# 2. Check port 3500 is running Vite (not Python!)
lsof -i :3500
# If wrong process, kill it: kill $(lsof -t -i :3500)

# 3. Test locally
npm run dev
# Open http://localhost:3500 and verify changes work
```

### Build & Deploy Steps
```bash
# 4. Build frontend
npx vite build

# 5. Verify build has your changes (example)
grep -l "onContextMenu" dist/assets/DynamicCanvas*.js

# 6. Set version tag
VERSION=v$(date +%Y%m%d-%H%M%S)
echo "Deploying: $VERSION"

# 7. Build Docker image (from parent dir)
cd /Users/mikaeleage/GZC\ Intel\ Application\ AC
docker build -t gzcacr.azurecr.io/gzc-intel-app:$VERSION --platform linux/amd64 .

# 8. Verify Docker image contents
docker run --rm gzcacr.azurecr.io/gzc-intel-app:$VERSION ls /var/www/html/assets/ | head -3

# 9. Push to ACR
docker push gzcacr.azurecr.io/gzc-intel-app:$VERSION

# 10. Deploy to Azure
az containerapp update \
  --name gzc-intel-application-ac \
  --resource-group gzc-kubernetes-rg \
  --image gzcacr.azurecr.io/gzc-intel-app:$VERSION

# 11. Verify deployment
REVISION=$(az containerapp revision list --name gzc-intel-application-ac --resource-group gzc-kubernetes-rg --query "[0].name" -o tsv)
az containerapp revision show --name gzc-intel-application-ac --resource-group gzc-kubernetes-rg --revision $REVISION --query "{active:properties.active, traffic:properties.trafficWeight}"

# 12. Update journal
echo "Deployed $VERSION at $(date)" >> ../journal/$(date +%Y-%m-%d)/deployment.md
```

### Post-Deployment Verification
- Open in incognito: https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io
- Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
- Check browser console for errors
- Test the deployed feature

### Production URL
https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io

### Current Production Version
- **Tag**: v20250814-042941
- **Status**: STABLE ✅
- **Last Deploy**: 2025-08-14 04:29:41
- **Critical Fixes**:
  - Safari compatibility (redirect auth instead of popup)
  - Performance optimizations (debounced panel toggle, React.memo)
  - Memory persistence reliability across Chrome and Safari
  - Eliminated component flashing/flickering

## 🏗 Architecture Patterns

### Component System
- **ComponentInventory**: Central registry of available components
- **DynamicCanvas**: Drag-and-drop grid layout (12 columns)
- **ComponentRenderer**: Renders components with edit/remove capabilities
- **TabLayoutManager**: Manages tab state and persistence

### State Management
- **Context**: Theme, User, Quote contexts
- **localStorage**: Tab layouts, component positions
- **Props drilling**: Minimal, use contexts instead

### Grid Layout Constraints
```typescript
// Component size definitions
{
  minSize: { w: 2, h: 2 },    // Minimum grid units
  maxSize: { w: 12, h: 20 },  // Maximum grid units
  defaultSize: { w: 6, h: 8 }  // Default when added
}
```

## 🎯 Current Features

### Context Menu (Right-click/Two-finger tap)
- When unlocked (Tools → Unlock): Add Component
- Always: Remove (for closable tabs)

### Editing (Global Unlock)
- Use Tools → Unlock to enable editing capabilities
- Drag to reposition components
- Resize from corners
- Click ✕ to remove components
- Changes auto-save to localStorage
- Components can be added via Tools → Add Component or tab context menu when unlocked

## ⚠️ Known Issues & Solutions

### ~~React Error #310 (Infinite Re-renders)~~ ✅ FIXED (2025-08-13)
- ~~Hook order violation in DynamicCanvas~~ → Fixed by moving useMemo outside conditional
- ~~Circular dependency in tab computation~~ → Fixed with memoized tab reference
- ~~useEffect infinite loop~~ → Fixed dependency array to use primitives
- **Session**: `241e8dc3-89fd-451f-9bde-ecea7a311930`
- **Details**: See `/journal/2025-08-13/react-error-310-infinite-renders.md`

### ~~Component Modal Issues~~ ✅ FIXED (2025-01-09)
- ~~Modal not visible when clicking Add Component~~ → Fixed AnimatePresence in v20250809-143545
- ~~Components not loading in modal~~ → Fixed component inventory initialization

### ~~Component Persistence Issues~~ ✅ FIXED (2025-01-08)
- ~~Components disappearing after add~~ → Fixed in v20250808-171205
- ~~Edit mode exiting unexpectedly~~ → Fixed with explicit state preservation
- ~~Portfolio Manager crashes~~ → Fixed with null/undefined checks

### TypeScript Build Errors
- Many type errors exist but don't block functionality
- Use `npx vite build` to bypass TypeScript checking
- Fix types incrementally, don't let them block deployment

### Port 3500 Conflicts
```bash
# Check what's using port 3500
lsof -i :3500
# Kill if needed
kill $(lsof -t -i :3500)
```

### Azure Deployment Not Updating
- Always use versioned tags
- Check revision status: `az containerapp revision list`
- Force new revision if needed
- Clear browser cache (Ctrl+Shift+R)

## 📝 Development Guidelines

### Daily Workflow
1. Check existing journal entries
2. Create new entry: `/journal/YYYY-MM-DD/feature.md`
3. Document approach before coding
4. Implement following existing patterns
5. Test locally
6. Deploy with version tag
7. Update journal with results

### Adding New Components
1. Add to `ComponentInventory.ts`
2. Define size constraints
3. Create component in appropriate directory
4. Register in component registry
5. Document in journal

### Modifying Grid Behavior
- Edit `DynamicCanvas.tsx`
- Preserve minW/minH/maxW/maxH in data-grid
- Test drag and resize thoroughly
- Document changes

### Theme Changes
- Update `ThemeContext.tsx`
- Use CSS variables for consistency
- Test both light and dark modes

## 🔍 Debugging

```javascript
// Check component inventory
console.log(componentInventory.getAllComponents())

// Check current layout
const layout = localStorage.getItem('tabLayouts')
console.log(JSON.parse(layout))

// Monitor grid events
document.addEventListener('mousedown', (e) => {
  if (e.target.closest('.react-grid-item')) {
    console.log('Grid item interaction', e)
  }
})
```

## 📊 Performance Considerations

- React Grid Layout can be heavy with many components
- Use React.memo for expensive components
- Lazy load components when possible
- Keep bundle size under 5MB

## 📋 Journal Requirements

Every session MUST maintain journal entries:
```markdown
# YYYY-MM-DD: [Feature/Fix Name]

## Problem
[Clear description of issue]

## Solution
[Approach taken]

## Changes
- File: line numbers
- What was changed and why

## Testing
[How it was tested]

## Deployment
- Version: v[timestamp]
- Revision: [azure revision]
- Status: [active/failed]

## Lessons
[What was learned]
```

## 🚫 DO NOT

- Create files in root directory
- Use `:latest` tag for Docker images
- Deploy without building first
- Mix production and development code
- Create duplicate component implementations
- Hardcode sensitive data
- Ignore existing patterns
- Skip journal updates
- Work outside Main_Frontend for frontend tasks

## ✅ ALWAYS

- Work from Main_Frontend directory
- Use versioned Docker tags
- Check existing code before creating new
- Test locally before deploying
- Update journal with every change
- Follow 70% thinking, 30% coding rule
- Show errors transparently
- Keep codebase clean and organized
- Document decisions and rationale

## 📞 Emergency Commands

```bash
# Restart failed container app
az containerapp revision restart \
  --name gzc-intel-application-ac \
  --resource-group gzc-kubernetes-rg \
  --revision [REVISION_NAME]

# Check container logs
az containerapp logs show \
  --name gzc-intel-application-ac \
  --resource-group gzc-kubernetes-rg

# Rollback to previous revision
az containerapp revision set-mode \
  --name gzc-intel-application-ac \
  --resource-group gzc-kubernetes-rg \
  --mode single --revision [PREVIOUS_REVISION]

# Check deployment status
az containerapp revision list \
  --name gzc-intel-application-ac \
  --resource-group gzc-kubernetes-rg \
  --query "[0:3].{name:name, active:properties.active, created:properties.createdTime}" \
  -o table
```

## 🎯 Focus Areas

1. **Codebase Integrity**: Maintain clean, organized code
2. **Documentation**: Keep journal and CLAUDE.md current
3. **Deployment Hygiene**: Version everything, no cache pollution
4. **Pattern Consistency**: Follow established patterns
5. **Transparency**: Show all errors and blockers

## 🔄 Recent Critical Fixes

### Latest Session: 2025-08-14 - Safari & Performance Fixes ✅
**Version: v20250814-042941**

#### 🍎 Safari Compatibility Fix (v20250814-041444)
**Problem**: Safari was crashing due to aggressive popup blocking of MSAL authentication
**Solution**: Browser-specific authentication strategy
- **Safari**: Uses `loginRedirect()` and `acquireTokenRedirect()`
- **Chrome**: Continues using `loginPopup()` and `acquireTokenPopup()`
- **Files Modified**: `useAuth.ts`, `UserContext.tsx`, `databaseService.ts`, `UnifiedProvider.tsx`
- **Result**: Safari users get smooth redirect authentication, no more crashes

#### ⚡ Performance Optimization Fix (v20250814-042941)
**Problem**: Component flashing/flickering during panel toggle
**Solution**: Debounced rendering with React optimizations
- **Debounced Panel Toggle**: Single update after 400ms instead of 6 rapid updates
- **React.memo**: Added to `ResponsiveVolatilityAnalysis` and `ComponentRenderer`
- **Stable Keys**: Simplified grid keys to prevent unnecessary re-renders
- **Files Modified**: `DynamicCanvas.tsx`, `ResponsiveVolatilityAnalysis.tsx`, `ComponentRenderer.tsx`
- **Result**: Smooth panel animations, no flickering, better performance

#### 🔒 Memory Persistence Reliability
**Problem**: Inconsistent component persistence between Chrome and Safari
**Solution**: Enhanced fallback chain and cross-browser user ID consistency
- **Cosmos DB First**: Primary persistence with retry logic
- **PostgreSQL Fallback**: Legacy support for backward compatibility
- **localStorage Fallback**: Multiple key search strategy
- **Cross-browser**: Consistent user ID detection via MSAL accounts
- **Result**: Components persist reliably across sessions and browsers

### Previous Session: 241e8dc3-89fd-451f-9bde-ecea7a311930 (2025-08-13)
**React Error #310 - Infinite Re-renders**
- Fixed hook order violation (useMemo inside conditional)
- Memoized tab computation to prevent reference changes
- Stabilized useEffect dependencies
- Components now load properly without infinite loops

### Key Technical Improvements
1. **Safari Authentication**: Changed from popup to redirect flow
2. **Dynamic Version Display**: Auto-generated based on deployment date
3. **Drag/Drop Always Enabled**: Components draggable in all modes
4. **Toast Positioning**: Fixed to display above footer
5. **Performance**: Added CSS transforms, GPU acceleration

---
Last Updated: 2025-08-13
Maintained by: Claude Code
Primary Repository: /Users/mikaeleage/GZC Intel Application AC/Main_Frontend
Purpose: Ensure consistent, high-quality development with complete documentation
