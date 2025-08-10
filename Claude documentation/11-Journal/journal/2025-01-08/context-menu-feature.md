# 2025-01-08: Context Menu for Component Management

## Feature Request
User requested context menu (right-click/two-finger tap on Mac) to toggle edit mode and add components.

## Implementation

### Context Menu Handler
Added to `DynamicCanvas.tsx`:
- Right-click or two-finger tap opens context menu
- When not in edit mode: Enters edit mode
- When in edit mode: Opens component portal to add components

### Code Changes
```typescript
// DynamicCanvas.tsx - Line 248-259
const handleContextMenu = (e: React.MouseEvent) => {
  e.preventDefault() // Always prevent default browser context menu
  
  if (!isEditMode) {
    // If not in edit mode, enter edit mode  
    updateTab(tabId, { editMode: true })
  } else {
    // If already in edit mode, show component portal
    setShowComponentPortal(true)
  }
}
```

### Edit/Save Button
- Positioned at top-right of canvas (not in header)
- Small circular button with icon only
- Changes from edit icon to checkmark when in edit mode

## Deployment
✅ Built Docker image with --no-cache
✅ Pushed to Azure Container Registry
✅ Updated Azure Container App: gzc-intel-application-ac

## Key Learning
**CRITICAL**: Always keep local code synchronized with Azure deployments
- Build and deploy immediately after changes
- Use correct container app name: `gzc-intel-application-ac`