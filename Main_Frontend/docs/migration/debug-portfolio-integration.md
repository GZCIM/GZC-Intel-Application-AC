# Portfolio Component Integration Debug Guide

## Quick Test Steps for Dynamic Tab:

1. **Create a new Dynamic tab**:
   - Click the `+` button in the header
   - Enter a name (e.g., "My Portfolio")
   - Select **"Dynamic"** (Full drag & drop components)

2. **Enter Edit Mode**:
   - Look for the **"Edit"** button (top-right of the tab content area)
   - Click it to enter edit mode (button changes to "Save")

3. **Add Component**:
   - In edit mode, look for **"➕ Add Component"** button (top-right)
   - Click it to open the Component Portal

4. **Find Portfolio**:
   - In the Component Portal, you should see "Portfolio Dashboard"
   - It should show:
     - Name: Portfolio Dashboard
     - Description: Comprehensive portfolio management with real-time P&L...
     - Category tag: financial

5. **Select Portfolio**:
   - Click on the Portfolio Dashboard card
   - The modal will close
   - Portfolio component will appear in the canvas

6. **Position and Size**:
   - Drag the Portfolio component to position it
   - Resize by dragging the edges/corners
   - Default size: 8x6 grid units

## Troubleshooting:

### If you don't see "Portfolio Dashboard" in the Component Portal:

1. **Check browser console** for errors
2. **Refresh the page** (Ctrl/Cmd + R)
3. **Check the InventoryDebugger** (bottom-right corner in dev mode)
   - Should show "portfolio" in the component list
   - Should show total components count

### Console Commands to Debug:

```javascript
// Check if portfolio is in inventory
componentInventory.getComponent('portfolio')

// List all components
componentInventory.searchComponents('')

// Check categories
componentInventory.getCategories()

// Force add portfolio (if missing)
componentInventory.addComponent({
  id: 'portfolio',
  name: 'Portfolio',
  displayName: 'Portfolio Dashboard',
  category: 'financial',
  subcategory: 'portfolio',
  description: 'Comprehensive portfolio management with real-time P&L, positions table, metrics, and charts',
  defaultSize: { w: 8, h: 6 },
  minSize: { w: 6, h: 4 },
  maxSize: { w: 12, h: 10 },
  tags: ['portfolio', 'trading', 'pnl', 'positions', 'financial', 'real-time', 'dashboard'],
  complexity: 'complex',
  quality: 'enhanced',
  source: 'internal'
})
```

## Expected Behavior:

1. Portfolio appears as a resizable widget
2. Shows mock trading data (in mock mode)
3. Has 3 view modes: Table, Grid, Chart
4. Updates prices every second
5. Filters work (search, side, profitability)
6. Right-click on positions shows context menu

## Current Portfolio Features:

- ✅ Real-time price updates (mock data)
- ✅ Portfolio metrics dashboard
- ✅ Sortable/filterable position table
- ✅ P&L calculations (unrealized, realized, total)
- ✅ Multiple view modes
- ✅ Theme integration
- ✅ Responsive sizing