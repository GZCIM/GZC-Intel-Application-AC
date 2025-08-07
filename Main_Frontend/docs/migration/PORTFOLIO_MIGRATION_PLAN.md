# Portfolio Migration Plan - Port 3200 to Port 3500

## Overview

This document outlines the plan to migrate the portfolio component from port 3200's admin tab and the analytics components to port 3500, making them operate like the components in port 3000.

## Components to Migrate

### 1. GZC Portfolio Component (Admin Tab)
**Source:** `/gzc-production-platform-vite/src/components/GZCPortfolioComponent.tsx`

**Features:**
- Dual view modes: Trades and Positions
- Fund filtering (GCF, GMF, All)
- Active/Closed status toggle
- Real-time data fetching
- Summary metrics cards
- Detailed data tables

**Dependencies:**
- API endpoints: `/api/fx-forward-trades` and `/api/fx-positions-aggregated`
- Framer Motion for animations
- Theme system

### 2. Analytics Components
**Source:** `/gzc-production-platform-vite/src/components/analytics/`

**Components:**
- AnalyticsDashboardExample.tsx - Main dashboard
- CompoundAnalyticsPanel.tsx - Reusable panels
- FilterAwareAnalyticsContainer.tsx - Filter container
- FilterBar.tsx - Filter controls
- VirtualizedPriceList.tsx - Performance optimized lists
- SharedFilterContext.tsx - Filter state management

**Features:**
- Real-time market data simulation
- Market metrics display
- Order book visualization
- Virtualized price feeds
- Shared filter context

## Migration Steps

### Phase 1: Prepare Infrastructure

1. **Remove Current Simple Portfolio**
   - Remove `/src/components/portfolio/` directory
   - Remove portfolio entry from ComponentInventory
   - Clean up unused imports

2. **Create New Portfolio Structure**
   ```
   src/components/
   ├── gzc-portfolio/
   │   ├── GZCPortfolioComponent.tsx
   │   ├── types.ts
   │   └── api.ts
   └── gzc-analytics/
       ├── AnalyticsDashboard.tsx
       ├── components/
       └── contexts/
   ```

3. **Set Up Mock API Layer**
   - Create mock data services for FX trades and positions
   - Simulate real-time WebSocket updates
   - Add data generators for testing

### Phase 2: Port GZC Portfolio Component

1. **Adapt Component**
   - Replace theme imports with GZC Intel theme
   - Use existing UserContext instead of separate auth
   - Integrate with component inventory system
   - Add to component registry

2. **Handle API Integration**
   ```typescript
   // Create mock API service
   class PortfolioAPIService {
     async fetchTrades(fundId?: string, activeStatus?: string) {
       // Return mock FX forward trades
     }
     
     async fetchPositions(fundId?: string, activeStatus?: string) {
       // Return mock FX positions
     }
   }
   ```

3. **Make it Canvas-Compatible**
   - Add proper sizing props
   - Support widget mode
   - Handle container constraints
   - Add configuration options

### Phase 3: Port Analytics Components

1. **Core Analytics Dashboard**
   - Port AnalyticsDashboardExample as main component
   - Adapt grid layout for Dynamic Canvas
   - Replace theme references

2. **Sub-Components**
   - Port virtualized price list
   - Port filter components
   - Port analytics panels
   - Maintain shared context pattern

3. **Integration**
   - Register all components in inventory
   - Add to component renderer mapping
   - Support drag-and-drop from portal

### Phase 4: Make Components Operate Like Port 3000

1. **Dynamic Canvas Integration**
   - Components must be resizable
   - Support save/load of positions
   - Handle edit/view modes
   - Work with grid layout

2. **Component Behavior**
   - Lazy loading with Suspense
   - Error boundaries
   - Loading states
   - Proper cleanup on unmount

3. **State Management**
   - Use ViewMemory for persistence
   - Integrate with existing contexts
   - Support component communication

### Phase 5: Cleanup

1. **Remove Unnecessary Components**
   ```typescript
   // Components to remove from inventory:
   - 'simple-chart'
   - 'price-ticker'
   - Old portfolio components
   ```

2. **Update Registry**
   - Clean component registry
   - Update component mappings
   - Remove deprecated entries

## Implementation Order

1. **Week 1:**
   - Set up infrastructure
   - Port GZCPortfolioComponent
   - Create mock API layer

2. **Week 2:**
   - Port analytics components
   - Integrate with Dynamic Canvas
   - Test drag-and-drop functionality

3. **Week 3:**
   - Ensure port 3000-like operation
   - Clean up old components
   - Documentation and testing

## Success Criteria

- [ ] GZC Portfolio loads in Dynamic Canvas
- [ ] Analytics components are draggable
- [ ] Mock data updates in real-time
- [ ] Components resize properly
- [ ] State persists across sessions
- [ ] Old components removed
- [ ] No console errors
- [ ] Performance is acceptable

## Technical Considerations

1. **API Mocking**
   - Use MSW or custom mock services
   - Simulate WebSocket connections
   - Generate realistic FX data

2. **Performance**
   - Virtualize large lists
   - Use React.memo where appropriate
   - Implement proper cleanup

3. **Styling**
   - Use existing theme system
   - Maintain consistent look
   - Support dark/light modes

4. **Error Handling**
   - Graceful fallbacks
   - User-friendly error messages
   - Retry mechanisms

## Next Steps

1. Create gzc-portfolio directory
2. Copy and adapt GZCPortfolioComponent
3. Set up mock API service
4. Test in Dynamic Canvas
5. Continue with analytics components