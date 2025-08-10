# State Persistence Architecture Design

## Core Problem Analysis

The current implementation suffers from three critical issues:

1. **State Fragmentation**: Multiple sources of truth (component state, tab state, localStorage)
2. **Event Handling**: onLayoutChange fires continuously during drag/resize causing re-renders
3. **Persistence Timing**: State saves happen during drag operations instead of on completion

## Proposed Architecture

### 1. Single Source of Truth Pattern

```typescript
// New centralized state interface
interface LayoutState {
  tabId: string
  components: ComponentInstance[]
  layouts: { lg: ReactGridLayout.Layout[] }
  metadata: {
    version: string
    lastModified: number
    isDirty: boolean
  }
}

// Component instance with full state
interface ComponentInstance {
  id: string
  type: ComponentType
  name: string
  config: ComponentConfig
  gridLayout: ReactGridLayout.Layout
  state: any // Component-specific state
}
```

### 2. State Manager Implementation

```typescript
// Core state manager class
class LayoutStateManager {
  private state: LayoutState
  private listeners: Set<StateListener>
  private saveTimeout: NodeJS.Timeout | null = null
  
  // Event handlers that DON'T trigger re-renders during drag
  onDragStart = (layout: Layout[], oldItem: Layout, newItem: Layout) => {
    // Visual feedback only - no state changes
    this.setDragIndicator(newItem.i, true)
  }
  
  onDrag = (layout: Layout[], oldItem: Layout, newItem: Layout) => {
    // Continue visual updates only
    // NO setState calls during drag
  }
  
  onDragStop = (layout: Layout[], oldItem: Layout, newItem: Layout) => {
    // Single atomic state update AFTER drag completes
    this.updateComponentLayout(newItem.i, newItem)
    this.setDragIndicator(newItem.i, false)
    this.debouncedSave()
  }
  
  private updateComponentLayout(componentId: string, layout: Layout) {
    const newState = {
      ...this.state,
      components: this.state.components.map(comp =>
        comp.id === componentId 
          ? { ...comp, gridLayout: layout }
          : comp
      ),
      metadata: {
        ...this.state.metadata,
        lastModified: Date.now(),
        isDirty: true
      }
    }
    this.setState(newState)
  }
  
  private debouncedSave = debounce(() => {
    if (this.state.metadata.isDirty) {
      this.persistenceService.save(this.state.tabId, this.state)
    }
  }, 500)
}
```

### 3. Persistence Service Layer

```typescript
interface PersistenceService {
  save(tabId: string, state: LayoutState): Promise<void>
  load(tabId: string): Promise<LayoutState | null>
  delete(tabId: string): Promise<void>
  backup(tabId: string, state: LayoutState): Promise<void>
}

// Primary: PostgreSQL persistence via Main_Gateway
class PostgreSQLPersistence implements PersistenceService {
  private baseUrl = 'http://localhost:5300/api'
  
  async save(tabId: string, state: LayoutState): Promise<void> {
    const token = await this.getAccessToken()
    const response = await fetch(`${this.baseUrl}/preferences/tab-layouts`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        tab_id: tabId,
        layout_data: state,
        version: state.metadata.version,
        last_modified: new Date().toISOString()
      })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to save layout: ${response.statusText}`)
    }
  }
  
  async load(tabId: string): Promise<LayoutState | null> {
    const token = await this.getAccessToken()
    const response = await fetch(`${this.baseUrl}/preferences/tab-layouts/${tabId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Failed to load layout: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.layout_data
  }
  
  async delete(tabId: string): Promise<void> {
    const token = await this.getAccessToken()
    await fetch(`${this.baseUrl}/preferences/tab-layouts/${tabId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
  }
  
  async backup(tabId: string, state: LayoutState): Promise<void> {
    // Create backup entry in PostgreSQL
    const token = await this.getAccessToken()
    await fetch(`${this.baseUrl}/preferences/tab-layouts-backup`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        tab_id: tabId,
        layout_data: state,
        backup_timestamp: new Date().toISOString()
      })
    })
  }
  
  private async getAccessToken(): Promise<string> {
    // Use existing MSAL integration
    const accounts = window.msalInstance?.getAllAccounts()
    if (!accounts?.length) throw new Error('User not authenticated')
    
    const tokenRequest = {
      scopes: ['User.Read'],
      account: accounts[0]
    }
    
    const response = await window.msalInstance.acquireTokenSilent(tokenRequest)
    return response.accessToken
  }
}

// Fallback: CosmosDB persistence for high-scale scenarios
class CosmosDBPersistence implements PersistenceService {
  private baseUrl = 'http://localhost:5300/api'
  
  async save(tabId: string, state: LayoutState): Promise<void> {
    const token = await this.getAccessToken()
    const response = await fetch(`${this.baseUrl}/cosmos/layouts`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        id: `${tabId}_${Date.now()}`,
        tabId,
        layoutState: state,
        userId: await this.getUserId(),
        partitionKey: await this.getUserId(),
        _ts: Math.floor(Date.now() / 1000)
      })
    })
    
    if (!response.ok) {
      throw new Error(`CosmosDB save failed: ${response.statusText}`)
    }
  }
  
  async load(tabId: string): Promise<LayoutState | null> {
    const token = await this.getAccessToken()
    const userId = await this.getUserId()
    
    const response = await fetch(
      `${this.baseUrl}/cosmos/layouts/query?tabId=${tabId}&userId=${userId}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    )
    
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`CosmosDB load failed: ${response.statusText}`)
    }
    
    const results = await response.json()
    return results.length > 0 ? results[0].layoutState : null
  }
  
  async delete(tabId: string): Promise<void> {
    const token = await this.getAccessToken()
    const userId = await this.getUserId()
    
    await fetch(`${this.baseUrl}/cosmos/layouts/${tabId}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'X-Partition-Key': userId
      }
    })
  }
  
  async backup(tabId: string, state: LayoutState): Promise<void> {
    // CosmosDB automatically maintains version history
    await this.save(`${tabId}_backup_${Date.now()}`, state)
  }
  
  private async getAccessToken(): Promise<string> {
    const accounts = window.msalInstance?.getAllAccounts()
    if (!accounts?.length) throw new Error('User not authenticated')
    
    const response = await window.msalInstance.acquireTokenSilent({
      scopes: ['User.Read'],
      account: accounts[0]
    })
    return response.accessToken
  }
  
  private async getUserId(): Promise<string> {
    const accounts = window.msalInstance?.getAllAccounts()
    return accounts?.[0]?.homeAccountId || 'anonymous'
  }
}
```

### 4. Component Integration

```typescript
// Updated DynamicCanvas component
export function DynamicCanvas({ tabId }: { tabId: string }) {
  const stateManager = useLayoutStateManager(tabId)
  const { components, layouts, isDragging } = stateManager.getState()
  
  // Critical: These handlers don't cause re-renders during drag
  const handleLayoutChange = (layout: Layout[]) => {
    // Only update if not dragging (prevents disappearing components)
    if (!isDragging) {
      stateManager.syncLayoutChanges(layout)
    }
  }
  
  return (
    <ResponsiveGridLayout
      layouts={layouts}
      onLayoutChange={handleLayoutChange}
      onDragStart={stateManager.onDragStart}
      onDrag={stateManager.onDrag}
      onDragStop={stateManager.onDragStop}
      onResizeStart={stateManager.onResizeStart}
      onResize={stateManager.onResize}
      onResizeStop={stateManager.onResizeStop}
      isDraggable={!isDragging || editMode}
      isResizable={!isDragging || editMode}
    >
      {components.map(component => (
        <div key={component.id} data-grid={component.gridLayout}>
          <ComponentRenderer 
            component={component}
            onStateChange={(newState) => 
              stateManager.updateComponentState(component.id, newState)
            }
          />
        </div>
      ))}
    </ResponsiveGridLayout>
  )
}
```

### 5. React Hook Integration

```typescript
// Custom hook for state management
function useLayoutStateManager(tabId: string) {
  const [state, setState] = useState<LayoutState>()
  const [manager] = useState(() => new LayoutStateManager(tabId, setState))
  
  useEffect(() => {
    manager.initialize()
    return () => manager.cleanup()
  }, [tabId])
  
  return manager
}

// Hook for component-level state
function useComponentState<T>(componentId: string, initialState: T) {
  const manager = useContext(LayoutStateContext)
  
  return {
    state: manager.getComponentState(componentId) as T,
    setState: (newState: T) => manager.updateComponentState(componentId, newState)
  }
}
```

## Implementation Strategy

### Phase 1: Core Infrastructure
1. Create `LayoutStateManager` class
2. Implement `PersistenceService` interface
3. Add `useLayoutStateManager` hook
4. Update `DynamicCanvas` to use new manager

### Phase 2: Event Handler Separation
1. Separate drag/resize handlers from layout change handlers
2. Implement debounced saving
3. Add visual feedback during drag operations
4. Test component persistence during drag/resize

### Phase 3: State Synchronization
1. Ensure single source of truth
2. Implement proper state updates
3. Add conflict resolution for concurrent updates
4. Test with multiple tabs/components

### Phase 4: Advanced Features
1. Add undo/redo functionality
2. Implement state versioning
3. Add collaborative editing support
4. Performance optimizations

## File Modifications Required

### New Files
```
src/
├── services/
│   ├── LayoutStateManager.ts        # Core state manager
│   ├── PersistenceService.ts        # Persistence abstraction
│   ├── PostgreSQLPersistence.ts     # PostgreSQL implementation (Primary)
│   └── CosmosDBPersistence.ts       # CosmosDB implementation (Fallback)
├── hooks/
│   ├── useLayoutStateManager.ts     # State manager hook
│   └── useComponentState.ts         # Component state hook
└── types/
    └── LayoutState.ts               # Type definitions
```

### Modified Files
```
src/
├── components/
│   └── canvas/
│       ├── DynamicCanvas.tsx        # Use new state manager
│       └── ComponentRenderer.tsx    # Component state integration
├── core/
│   └── tabs/
│       └── TabLayoutManager.tsx     # Tab state coordination
└── contexts/
    └── LayoutStateContext.tsx       # Context for state sharing
```

## Key Principles

1. **No State Changes During Drag**: Visual updates only during drag/resize
2. **Single Atomic Updates**: State changes happen once on drag/resize stop
3. **Debounced Persistence**: Save operations are debounced to prevent excessive database writes
4. **Type Safety**: Full TypeScript integration for all state operations
5. **Enterprise Persistence**: PostgreSQL primary, CosmosDB fallback, no localStorage dependency
6. **User-Scoped Data**: All layouts are user-specific via Azure AD authentication
7. **Graceful Degradation**: System works offline with temporary memory storage until reconnection

## Testing Strategy

### Unit Tests
- LayoutStateManager event handling
- PersistenceService implementations
- State synchronization logic

### Integration Tests
- Component persistence across drag/resize
- Tab switching with state preservation
- Multi-component interactions

### E2E Tests
```typescript
// Test component persistence
test('components persist during drag operations', async () => {
  await page.addComponent('Portfolio Manager')
  await page.dragComponent('Portfolio Manager', { x: 100, y: 100 })
  await expect(page.getComponent('Portfolio Manager')).toBeVisible()
  await page.resizeComponent('Portfolio Manager', { width: 400, height: 300 })
  await expect(page.getComponent('Portfolio Manager')).toBeVisible()
})
```

This architecture provides a solid foundation for resolving all current state management issues while maintaining the existing component structure and adding proper persistence capabilities.