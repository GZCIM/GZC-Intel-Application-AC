# GZC Intel App - System Status & Architecture

## 🚀 Current Status: OPERATIONAL

**Server**: Running on http://localhost:3500/  
**Memory Allocation**: 8GB (8192MB)  
**Last Updated**: January 6, 2025

## 📊 System Architecture Overview

### Core Components

1. **Tab System** ✅
   - Dynamic tabs with drag-and-drop (auto-save)
   - Static tabs with fixed layouts (manual save)
   - User-created tabs persist across sessions
   - Edit/Save mode with visual indicators

2. **Component System** ✅
   - Component Inventory with categorization
   - Professional Registry with validation
   - Real-time component rendering
   - Props persistence per instance

3. **Memory Persistence** ✅
   - StateManager handles all persistence
   - Auto-save on changes (1s debounce)
   - Periodic saves every 30 seconds
   - Full state backup system
   - Export/Import functionality

4. **Port 3200 Integration** ✅
   - Import Service for fetching components
   - Export Service for sharing components
   - Component Portal UI (accessible in edit mode)
   - Contract validation (70% minimum score)

5. **Theme System** ✅
   - Professional, Institutional, Enterprise themes
   - Real-time theme switching
   - Complete token system
   - Persists across sessions

### Component Flow

```
User Creates Tab → TabLayoutManager → StateManager → localStorage
         ↓                                    ↓
    Select Type                          Auto-persist
    (Dynamic/Static)                          ↓
         ↓                              Component State
    Add Components                            ↓
    (Local/Import)                      ViewMemory
         ↓                                    ↓
    Configure/Arrange                   Full Backup
         ↓
    Auto/Manual Save
```

### Available Components

**Local Components**:
- PriceTicker (enhanced) - Real-time price updates
- SimpleChart (basic) - Bar chart visualization

**Importable from Port 3200**:
- AdvancedChart - Professional trading chart
- PortfolioGrid - Real-time portfolio holdings
- OrderBook - Live order book visualization
- CandlestickChart - Advanced candlestick chart
- MarketDepth - Market depth analysis

### Memory Layout

```javascript
localStorage: {
  'gzc-intel-layouts': [],          // All tab layouts
  'gzc-intel-active-layout': 'id',  // Current layout
  'dynamic-canvas-{id}': {},        // Dynamic tab states
  'static-canvas-{id}': {},         // Static tab states
  'gzc-intel-complete-state': {},   // Full backup
  'gzc-platform-view-memory': {},   // Component states
  'gzc-platform-theme': {}          // Theme settings
}
```

### Console Commands

```javascript
// Tab Management
addTab()                    // Create new tab with UI
quickTab.dynamic()         // Quick dynamic tab
quickTab.static()          // Quick static tab

// Memory Inspection
memoryInspector.checkAll() // View all memory
memoryInspector.getSize()  // Check storage size
memoryInspector.clear()    // Clear all data

// State Management
stateManager.saveState()   // Manual save
stateManager.exportState() // Export to file
stateManager.getStateSize() // Check size in bytes
```

### Key Features

1. **Auto-Save**: Dynamic tabs save automatically on layout changes
2. **Manual Save**: Static tabs show unsaved indicator and require save
3. **Component Portal**: Access via "Add Component" button in edit mode
4. **Import from 3200**: Real-time import with validation
5. **Drag & Drop**: Full support in dynamic tabs
6. **Slot System**: Fixed layouts in static tabs with drag to rearrange
7. **Theme Integration**: All components respect current theme
8. **Error Handling**: Comprehensive error boundaries
9. **Performance**: Lazy loading with Suspense
10. **Persistence**: Complete state restoration on reload

### Development Tools

- **Event Monitor**: `eventMonitor.getReport()`
- **Memory Inspector**: Full memory debugging
- **Chrome DevTools**: Port 9222 for debugging
- **Vite HMR**: Fast hot reload
- **TypeScript**: Strict mode enabled

### Known Limitations

1. Component state not fully exposed in UI (needs config modal)
2. No visual component property editor yet
3. Import from 3200 uses mock data (real API pending)
4. Export to 3200 logs to console (file system pending)

### Next Steps

1. Component configuration UI
2. Visual property editor
3. Real port 3200 API integration
4. Component marketplace UI
5. Advanced layout templates