# Future Tasks - GZC Intel App

## Date: 2025-07-09

## 1. Move Tab Memory to Redis (Azure)
**Priority:** High  
**Status:** Pending  
**Description:** Migrate tab layout storage from browser localStorage to Redis in Azure for cross-browser synchronization

### Requirements:
- Store user tab layouts in Redis instead of localStorage
- Implement Redis connection with Azure Redis Cache
- Create API endpoints for tab CRUD operations
- Maintain backwards compatibility during migration
- Add fallback to localStorage if Redis is unavailable

### Benefits:
- Same tab layout across all browsers (Chrome, Safari, Edge, etc.)
- Centralized user preferences
- Better scalability for enterprise use
- Ability to share layouts between users
- Backup and restore capabilities

### Implementation Notes:
- Current storage keys to migrate:
  - `gzc-intel-layouts-{userId}`
  - `gzc-intel-current-layout-{userId}`
  - `gzc-intel-active-layout-{userId}`
  - `dynamic-canvas-{tabId}`
- Consider using Redis JSON for structured data
- Implement caching strategy for performance
- Add real-time sync with Redis pub/sub

### Files to Modify:
- `/src/core/tabs/TabLayoutManager.tsx` - Replace localStorage with Redis calls
- `/src/hooks/useViewMemory.ts` - Add Redis support
- Create new `/src/services/RedisTabService.ts`
- Update `/src/services/StateManager.ts`

---

## Other Future Enhancements

### 2. WebSocket Integration for Real-time Data
- Replace mock APIs with real WebSocket connections
- Implement reconnection logic
- Add connection status indicators

### 3. Additional Analytics Components
- VirtualizedPriceList from port 3200
- FilterBar with shared context
- CompoundAnalyticsPanel

### 4. Performance Optimizations
- Implement virtual scrolling for large datasets
- Add lazy loading for component bundles
- Optimize re-renders with React.memo

### 5. Enhanced Security
- Add row-level security for portfolio data
- Implement audit logging
- Add data encryption at rest

---

## Notes
- Redis migration is top priority for better user experience
- Consider using Azure SignalR for real-time updates alongside Redis
- Maintain local storage as fallback for offline scenarios