# 2025-01-08: Grid Component Resize Fix

## Problem
Portfolio component collapsed to nothing when resizing in edit mode, showing red border (invalid size).

## Root Cause
Grid layout constraints (minW, minH, maxW, maxH) were defined in ComponentInventory but not passed to React Grid Layout in data-grid attributes.

## Solution
Updated `DynamicCanvas.tsx` to include constraints in data-grid attributes:

```typescript
// Line 362-385
{components.map(instance => {
  const meta = componentInventory.getComponent(instance.componentId)
  const layoutItem = layouts.lg?.find(l => l.i === instance.id)
  return (
    <div 
      key={instance.id} 
      data-grid={{
        ...layoutItem,
        minW: meta?.minSize?.w || 2,
        minH: meta?.minSize?.h || 2,
        maxW: meta?.maxSize?.w || 12,
        maxH: meta?.maxSize?.h || 20
      }}
      // ... rest
    >
```

## Deployment Issues Encountered

1. **Wrong Container App**: Was deploying to `gzc-intel-app` instead of `gzc-intel-application-ac`
2. **Docker Cache**: Build used cached layers with old code
3. **Missing Database**: PostgreSQL `gzc_intel` database didn't exist
4. **Revision Stuck**: New revision stuck in "Activating" state

## Lessons Learned
- Always verify correct container app name
- Use `docker build --no-cache` when fixing issues
- Check container logs when deployment fails
- Browser cache can hide successful deployments

## Final Status
✅ Deployed to correct app: https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io
✅ Portfolio maintains minimum 8x6 grid units when resizing