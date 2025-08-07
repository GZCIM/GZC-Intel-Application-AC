# GZC Intel App Maintenance Notes

## Date: 2025-07-09
## Port: 3500
## Status: Fully Operational with GZC Components

## 🚀 Quick Start After Restart

```bash
cd "/Users/mikaeleage/Projects Container/GZC Intel App/gzc-intel"
npm run dev
# Server runs on http://localhost:3500
```

## 📍 Current State

### What's Working
1. **GZC Portfolio Component** (from port 3200 admin tab)
   - Location: `/src/components/gzc-portfolio/`
   - Features: FX trades, positions, fund filtering
   - Mock API provides real-time updates

2. **GZC Analytics Dashboard** (from port 3200 analytics tab)
   - Location: `/src/components/gzc-analytics/`
   - Features: Live prices, order book, performance metrics
   - Real-time data simulation active

3. **Dynamic Canvas System**
   - Edit mode toggle works
   - Components can be added, dragged, resized
   - Positions auto-save to localStorage
   - No more stack overflow errors

### What We Fixed Today
1. ✅ Analytics component loading error - Fixed singleton pattern issue
2. ✅ "Maximum call stack exceeded" - Removed duplicate TabEditButton
3. ✅ Component registration issues - Verified and fixed
4. ✅ Cleaned inventory - Removed old components, kept only GZC

### What's Removed
- ❌ Old portfolio component
- ❌ Simple chart
- ❌ Price ticker
- ❌ Other placeholder components

## 🗂️ File Structure

```
src/
├── components/
│   ├── gzc-portfolio/          # Port 3200 Portfolio
│   │   ├── GZCPortfolioComponent.tsx
│   │   ├── types.ts
│   │   └── api.ts              # Mock FX data service
│   ├── gzc-analytics/          # Port 3200 Analytics
│   │   ├── AnalyticsDashboard.tsx
│   │   ├── types.ts
│   │   ├── contexts/
│   │   │   └── SharedFilterContext.tsx
│   │   └── hooks/
│   │       └── useRealtimeMetrics.ts
│   └── canvas/
│       └── ComponentRenderer.tsx  # Maps component IDs to imports
└── core/
    └── components/
        └── ComponentInventory.ts  # Component registry

```

## 🔧 Key Files Modified

1. **ComponentInventory.ts**
   - Removed all old components
   - Added gzc-portfolio and gzc-analytics only

2. **ComponentRenderer.tsx**
   - Maps 'gzc-portfolio' → GZCPortfolioComponent
   - Maps 'gzc-analytics' → AnalyticsDashboard

3. **TabEditButton.tsx**
   - Fixed hover state to use React state instead of direct DOM

4. **DynamicCanvas.tsx**
   - Removed duplicate TabEditButton render

## 💾 Data Storage (Current)

### Browser LocalStorage
- `gzc-intel-layouts-{userId}` - User's saved layouts
- `gzc-intel-current-layout-{userId}` - Active tab configuration
- `dynamic-canvas-{tabId}` - Component positions

**Note:** Different browsers = different saved tabs!

### Future: Redis on Azure
- Will sync across all browsers
- See FUTURE_TASKS.md for implementation plan

## 🧪 Testing After Restart

### 1. Basic Functionality Test
```javascript
// Run in browser console
testGZCPortfolio(); // Tests portfolio registration
testFunctionality(); // Tests edit mode and components
```

### 2. Manual Test Steps
1. Go to http://localhost:3500
2. Click "Edit" on Analytics tab
3. Click "Add Component"
4. Add "GZC Portfolio" and "GZC Analytics"
5. Drag and resize components
6. Click "Save" to exit edit mode
7. Refresh page - positions should persist

### 3. Export/Import Tabs Between Browsers
```javascript
// In Chrome console
exportTabLayout(); // Downloads JSON file

// In Safari console
importTabLayout(`paste-json-contents`);
// Then refresh page
```

## ⚠️ Known Issues

1. **Tab Storage is Browser-Specific**
   - Chrome and Safari show different tabs
   - Use export/import utility for now
   - Will be fixed with Redis migration

2. **Mock Data Only**
   - Portfolio uses mock FX trades
   - Analytics uses simulated prices
   - Ready for real API integration

## 📝 Important Notes

### Component IDs
- Portfolio: `gzc-portfolio` (NOT 'portfolio')
- Analytics: `gzc-analytics`

### Mock Data Timing
- Portfolio updates: Every 3-5 seconds
- Analytics prices: Every 1 second

### Theme Integration
- Both components use `useTheme()` hook
- Automatically adapt to light/dark mode

## 🚨 If Something Breaks

### Server Won't Start
```bash
# Check if port 3500 is in use
lsof -i :3500
# Kill process if needed
kill -9 [PID]
```

### Components Don't Load
1. Check browser console for errors
2. Verify component is in ComponentRenderer.tsx
3. Check if component is in ComponentInventory.ts
4. Clear Vite cache: `rm -rf node_modules/.vite`

### Edit Button Not Working
- Make sure you're on Analytics tab (it has closable: true)
- Check for JavaScript errors in console

## 📚 Documentation Files

1. **PORTFOLIO_MIGRATION_PLAN.md** - Original migration strategy
2. **PORTFOLIO_MIGRATION_SUMMARY.md** - What we accomplished
3. **FINAL_MIGRATION_SUMMARY.md** - Complete status
4. **FUNCTIONALITY_REPORT.md** - Testing results
5. **REDUNDANCY_ANALYSIS.md** - Cleanup documentation
6. **FUTURE_TASKS.md** - Redis migration plan
7. **MAINTENANCE_NOTES.md** - This file

## 🎯 Next Session Starting Point

When you return:
1. Start dev server: `npm run dev`
2. Test that GZC components still work
3. Check FUTURE_TASKS.md for Redis migration
4. Consider adding more analytics components if needed

## 🔑 Key Commands

```bash
# Start server
npm run dev

# Run tests  
npm test

# Check types
npm run typecheck

# Build for production
npm run build
```

## 💡 Final Tips

- Always use Edit mode to add components
- Components auto-save positions
- Mock data runs continuously
- Export tabs before major changes
- Check dev.log for HMR updates

---

**System is ready for restart. All work is saved and documented.**