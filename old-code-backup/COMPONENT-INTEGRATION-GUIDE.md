# Component Integration Guide

## Overview
This guide documents the complete process for integrating standalone components (like Bloomberg Volatility) into the GZC Intel Application.

## Architecture Understanding

### 1. Component System Structure
The GZC Intel App uses a multi-layer component system:

```
ComponentInventory (UI Discovery)
    ↓
enhancedComponentRegistry (Component Loading)
    ↓
Actual Component Files (React Components)
```

### 2. Key Files
- **ComponentInventory.ts**: `/src/core/components/ComponentInventory.ts`
  - Manages component metadata for UI discovery
  - Categories, tags, descriptions, sizing
  - Searchable inventory for users

- **enhancedComponentRegistry.ts**: `/src/core/tabs/enhancedComponentRegistry.ts`
  - Maps component IDs to actual file loaders
  - Handles dynamic imports
  - Must match ComponentInventory IDs

## Integration Process

### Step 1: Analyze Source Component
```bash
# Example: Bloomberg Volatility App
/bloomberg-volatility-component/
  /src/
    /components/
      VolatilityAnalysisTab.tsx    # Main component
      PlotlyVolatilitySurface.tsx   # Sub-components
      VolatilitySurfaceTable.tsx
      DataQualityIndicator.tsx
    /api/
      bloomberg.ts                  # API client
    /contexts/
      ThemeContext.tsx             # Shared contexts
```

### Step 2: Copy Component Files
```bash
# Create component directory in main app
mkdir -p gzc-intel-frontend/src/components/[component-name]

# Copy main component and dependencies
cp source-app/src/components/ComponentTab.tsx gzc-intel-frontend/src/components/[component-name]/

# Copy required sub-components
cp source-app/src/components/SubComponent.tsx gzc-intel-frontend/src/components/[component-name]/
```

### Step 3: Copy Dependencies
```bash
# API clients
cp -r source-app/src/api/* gzc-intel-frontend/src/api/

# Utilities
cp source-app/src/utils/needed-utils.ts gzc-intel-frontend/src/utils/

# Check package.json for npm dependencies
# Example: plotly.js, d3, etc.
npm install missing-package
```

### Step 4: Fix Import Paths
Update all relative imports in copied files:
```typescript
// Old (in standalone app)
import { useTheme } from '../contexts/ThemeContext'

// New (in main app)
import { useTheme } from '../../contexts/ThemeContext'
```

### Step 5: Make Component Default Export
```typescript
// Change from named export
export function ComponentName() { ... }

// To default export
export default function ComponentName() { ... }
```

### Step 6: Add to Component Inventory
Edit `/src/core/components/ComponentInventory.ts`:

```typescript
// 1. Add category if needed
this.addCategory({
  id: 'bloomberg',
  name: 'Bloomberg',
  icon: 'activity',
  description: 'Bloomberg Terminal data and analytics',
  color: '#FF6B00',
  subcategories: [
    { id: 'volatility', name: 'Volatility Analytics', description: 'FX options volatility surfaces', tags: ['volatility', 'options'] }
  ]
})

// 2. Add component
this.addComponent({
  id: 'bloomberg-volatility',  // MUST be unique, lowercase with hyphens
  name: 'BloombergVolatility', // Component name
  displayName: 'Bloomberg Volatility Surface',
  category: 'bloomberg',
  subcategory: 'volatility',
  description: 'Real-time FX options volatility surfaces with 3D visualization',
  defaultSize: { w: 10, h: 8 },
  minSize: { w: 8, h: 6 },
  tags: ['bloomberg', 'volatility', 'fx', 'options', 'surface', '3d'],
  complexity: 'complex',
  quality: 'production',
  source: 'internal'
})
```

### Step 7: Add to Enhanced Registry
Edit `/src/core/tabs/enhancedComponentRegistry.ts`:

```typescript
// ID MUST match ComponentInventory id
'bloomberg-volatility': {
  loader: () => import('../../components/volatility/VolatilityAnalysisTab'),
  metadata: {
    id: 'bloomberg-volatility',  // MUST match inventory
    displayName: 'Bloomberg Volatility Surface',
    category: 'analytics',
    gridConfig: {
      defaultWidgets: [
        { viewId: 'surface3d', title: 'Volatility Surface 3D', icon: 'trending-up' },
        { viewId: 'surfaceTable', title: 'Volatility Grid', icon: 'grid' }
      ]
    }
  }
}
```

### Step 8: Test Integration
1. Restart dev server: `npm run dev`
2. Open app at http://localhost:3500
3. Check component appears in:
   - Component inventory/library
   - Search results
   - Correct category

### Step 9: Configure API Endpoints
Update API URLs to use environment variables:
```typescript
const API_URL = import.meta.env.DEV 
  ? 'http://localhost:8000'  // Local gateway
  : '/api'  // Production proxy
```

## Common Issues & Solutions

### 1. Component Not Appearing
- Check ID matches between ComponentInventory and enhancedComponentRegistry
- Verify component is default export
- Check browser console for import errors

### 2. Import Errors
- Fix all relative import paths
- Ensure all dependencies are installed
- Check for circular dependencies

### 3. API Connection Issues
- Verify backend is running
- Check CORS configuration
- Update API endpoints

### 4. Styling Issues
- Import required CSS files
- Check theme context compatibility
- Verify CSS module imports

## Automated Integration Script (Future)

```bash
#!/bin/bash
# component-integrate.sh

COMPONENT_NAME=$1
SOURCE_PATH=$2
TARGET_PATH="./gzc-intel-frontend/src/components/$COMPONENT_NAME"

# 1. Create directory
mkdir -p $TARGET_PATH

# 2. Copy files
cp -r $SOURCE_PATH/* $TARGET_PATH/

# 3. Fix imports (using sed or similar)
find $TARGET_PATH -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/\.\.\/contexts/\.\.\/\.\.\/contexts/g'

# 4. Generate inventory entry
echo "Add to ComponentInventory.ts:"
echo "id: '$COMPONENT_NAME'"
echo "name: '${COMPONENT_NAME^}'"
# ... etc
```

## Best Practices

1. **Consistent Naming**: Use lowercase-hyphenated IDs
2. **Complete Dependencies**: Copy all required files
3. **Test Thoroughly**: Check all features work
4. **Document APIs**: Note any backend requirements
5. **Version Control**: Commit after each successful integration

## Example: Bloomberg Volatility Integration

1. **Source**: `/bloomberg-volatility-component/gzc-volatility-surface/`
2. **Target**: `/gzc-intel-frontend/src/components/volatility/`
3. **Files Copied**:
   - VolatilityAnalysisTab.tsx
   - PlotlyVolatilitySurface.tsx
   - VolatilitySurfaceTable.tsx
   - DataQualityIndicator.tsx
   - ErrorRetryBanner.tsx
4. **Dependencies Added**:
   - plotly.js
   - react-plotly.js
   - d3
5. **API Integration**:
   - Uses bloomberg gateway on port 8000
   - Connects to Bloomberg VM endpoint

This process ensures consistent, reliable component integration!