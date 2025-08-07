# Portfolio Component Analysis - Port 3200 to Port 3500

## Overview
The Portfolio component from project 3200 is a comprehensive trading portfolio management system with real-time data streaming, filtering, and P&L tracking.

## Core Dependencies (From 3200)
1. **@gzc/ui Package**
   - `DataTable` - Advanced data grid component
   - `ContextMenu` - Right-click context menus
   - `Card`, `CardContent` - UI containers
   - `useQuoteContext` - Real-time quote management
   - `useAuthContext` - MSAL authentication
   - `useDateContext` - Date management
   - `QuoteInput`, `QuoteMessage` - Quote data types

2. **@azure/msal-react**
   - Authentication and token acquisition
   - OAuth token management

3. **@tanstack/react-table**
   - Table rendering and data management

4. **WebSocket Integration**
   - Real-time quote streaming
   - Multiple stream types (esp, rfs, exec)

5. **API Integration**
   - REST API for portfolio data
   - Alova HTTP client

## Component Structure

### Main Components
1. **Portfolio.tsx** - Main orchestrator
   - Manages filters state
   - Handles WebSocket quote streaming
   - Integrates auth context

2. **PortfolioMetrics.tsx** - Summary metrics display
   - Total exposure
   - Net P&L
   - Open trades count
   - Connection status

3. **PortfolioFilters.tsx** - Filter interface
   - Symbol filter
   - Fund ID filter
   - Trader filter
   - Position filter

4. **PortfolioTable.tsx** - Main data grid
   - Portfolio positions display
   - Real-time price updates
   - P&L calculations (YTD, MTD, DTD)
   - Right-click context menu
   - EOD history integration

5. **BlotterTable.tsx** - Trade blotter (not analyzed yet)

## Data Flow
1. **Authentication**: MSAL token acquisition
2. **Data Fetching**: REST API calls with auth tokens
3. **Real-time Updates**: WebSocket streams for live quotes
4. **P&L Calculation**: Combines historical EOD data with live quotes

## What Needs to be Done for Port 3500

### 1. Remove External Dependencies
- Replace @gzc/ui components with our own
- Remove MSAL authentication (use our UserContext)
- Replace Alova with native fetch or axios
- Build our own WebSocket management

### 2. Create Replacement Components

#### DataTable Component
```typescript
// Need to create a professional data grid with:
- Column definitions
- Sorting
- Filtering
- Cell rendering
- Right-click support
- Theme integration
```

#### Context Menu System
```typescript
// Right-click menu with:
- Positioning logic
- Submenu support
- Click outside to close
- Theme-aware styling
```

#### Quote Management System
```typescript
// Real-time quote handling:
- Quote context/provider
- WebSocket connection management
- Quote message types
- Price update distribution
```

### 3. Adapt Data Types
```typescript
// Portfolio types are already clean
export interface PortfolioItem {
  Id: number
  TradeID: number
  TradeDate: string
  Symbol: string
  Side: string
  OrderQty: number
  Price: number
  // ... etc
}

// Need to create quote types
export interface QuoteMessage {
  symbol: string
  bid: number
  ask: number
  timestamp: number
}
```

### 4. Mock Services (For Development)
- Mock WebSocket server for quotes
- Mock portfolio data API
- Mock EOD history data

### 5. Integration Points
- Add to ComponentInventory
- Create widget wrapper for drag-drop
- Theme integration
- Tab system integration

## Implementation Strategy

### Phase 1: Core Components (No External Deps)
1. Create DataTable component
2. Create ContextMenu component  
3. Create basic Portfolio layout
4. Mock data integration

### Phase 2: Real-time Features
1. WebSocket management
2. Quote context system
3. Live price updates
4. P&L calculations

### Phase 3: Full Integration
1. API connections
2. User-specific data
3. Tab persistence
4. Component registry

## Estimated Components to Build
1. `DataTable.tsx` - ~300 lines
2. `ContextMenu.tsx` - ~150 lines
3. `QuoteContext.tsx` - ~200 lines
4. `WebSocketManager.tsx` - ~150 lines
5. `Portfolio.tsx` (adapted) - ~100 lines
6. `PortfolioTable.tsx` (adapted) - ~250 lines
7. `PortfolioMetrics.tsx` (adapted) - ~80 lines
8. `PortfolioFilters.tsx` (adapted) - ~100 lines

## Key Decisions Needed
1. **Authentication**: How to handle API auth without MSAL?
2. **WebSocket**: Build our own or use existing library?
3. **Data Grid**: Build from scratch or use lightweight library?
4. **State Management**: Context only or add Redux?
5. **Mock vs Real**: Start with mocks or real APIs?

## Benefits of Recreation
- Full control over functionality
- No external dependency conflicts
- Consistent with our theme system
- Integrated with our tab/user system
- Better performance optimization
- Cleaner, more maintainable code