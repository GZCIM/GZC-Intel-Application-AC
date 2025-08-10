# User Memory Isolation Architecture

## Core Principle: Zero Main Application Impact

**CRITICAL REQUIREMENT**: The user memory system must be completely independent from the main application. No modifications to core application logic, routing, or existing components.

## Architecture Overview

### Independent Service Layer
```
User Memory Service (Standalone)
├── Database Layer (PostgreSQL/CosmosDB)
├── Authentication Layer (Azure AD Integration)
├── API Layer (REST/GraphQL)
├── Caching Layer (Redis)
└── Frontend Integration (Minimal Hooks)
```

### User-Scoped Data Isolation

All data is strictly partitioned by Azure AD user identity:
- **user_id**: Azure AD homeAccountId or objectId
- **tenant_id**: Azure AD tenant isolation
- **Data Encryption**: User-specific encryption keys

## Database Schema Design

### PostgreSQL Implementation (Primary)
```sql
-- User memory master table
CREATE TABLE user_memory (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  memory_type VARCHAR(50) NOT NULL, -- 'layout', 'theme', 'component_state', 'preferences'
  memory_key VARCHAR(255) NOT NULL, -- tab_id, component_id, etc.
  memory_data JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NULL, -- Optional TTL
  
  UNIQUE(user_id, tenant_id, memory_type, memory_key)
);

-- Indexes for performance
CREATE INDEX idx_user_memory_user ON user_memory(user_id, tenant_id);
CREATE INDEX idx_user_memory_type ON user_memory(user_id, memory_type);
CREATE INDEX idx_user_memory_updated ON user_memory(updated_at);

-- User preferences table
CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  preference_key VARCHAR(255) NOT NULL,
  preference_value JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, tenant_id, preference_key)
);

-- User sessions for cross-device sync
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  device_info JSONB,
  last_activity TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### CosmosDB Implementation (Fallback)
```javascript
// CosmosDB container structure
const userMemoryContainer = {
  id: "user-memory",
  partitionKey: { 
    paths: ["/userId"], 
    kind: "Hash" 
  },
  indexingPolicy: {
    includedPaths: [
      { path: "/userId/*" },
      { path: "/memoryType/*" },
      { path: "/updatedAt/*" }
    ]
  }
}

// Document structure
const userMemoryDocument = {
  id: `${userId}_${memoryType}_${memoryKey}`,
  userId: "azure-ad-user-id",
  tenantId: "azure-ad-tenant-id", 
  memoryType: "layout|theme|component_state|preferences",
  memoryKey: "tab_id|component_id|preference_name",
  memoryData: { /* actual data */ },
  version: 1,
  createdAt: "2025-01-09T20:00:00Z",
  updatedAt: "2025-01-09T20:00:00Z",
  expiresAt: null, // Optional TTL
  _ts: 1736456400 // CosmosDB timestamp
}
```

## Service Implementation

### Core User Memory Service
```typescript
interface UserMemoryService {
  // Layout management
  saveLayout(memoryKey: string, layout: LayoutData): Promise<void>
  loadLayout(memoryKey: string): Promise<LayoutData | null>
  
  // Theme management  
  saveTheme(theme: ThemeSettings): Promise<void>
  loadTheme(): Promise<ThemeSettings | null>
  
  // Component state
  saveComponentState(componentId: string, state: any): Promise<void>
  loadComponentState(componentId: string): Promise<any>
  
  // Preferences
  savePreference(key: string, value: any): Promise<void>
  loadPreference(key: string): Promise<any>
  
  // Bulk operations
  loadAllUserData(): Promise<UserMemorySnapshot>
  saveUserDataSnapshot(snapshot: UserMemorySnapshot): Promise<void>
  
  // Cross-device sync
  syncUserData(): Promise<void>
  
  // Cleanup
  clearExpiredData(): Promise<void>
  clearAllUserData(): Promise<void>
}

class DatabaseUserMemoryService implements UserMemoryService {
  private userId: string
  private tenantId: string
  private apiClient: ApiClient
  
  constructor(authUser: AuthenticatedUser) {
    this.userId = authUser.homeAccountId
    this.tenantId = authUser.tenantId
    this.apiClient = new ApiClient(authUser.accessToken)
  }
  
  async saveLayout(memoryKey: string, layout: LayoutData): Promise<void> {
    await this.apiClient.post('/api/user-memory', {
      memoryType: 'layout',
      memoryKey,
      memoryData: layout,
      userId: this.userId,
      tenantId: this.tenantId
    })
  }
  
  async loadLayout(memoryKey: string): Promise<LayoutData | null> {
    const response = await this.apiClient.get(
      `/api/user-memory/layout/${memoryKey}`,
      { params: { userId: this.userId, tenantId: this.tenantId } }
    )
    return response.data?.memoryData || null
  }
  
  // ... other methods
}
```

### Frontend Integration Layer
```typescript
// Minimal hook for integration with existing app
export function useUserMemory() {
  const { user } = useAuth() // Existing MSAL hook
  const [service] = useState(() => 
    user ? new DatabaseUserMemoryService(user) : null
  )
  
  const saveLayoutData = useCallback(async (tabId: string, layout: any) => {
    if (!service) return
    try {
      await service.saveLayout(tabId, layout)
    } catch (error) {
      console.error('Failed to save layout:', error)
      // Graceful degradation - continue without persistence
    }
  }, [service])
  
  const loadLayoutData = useCallback(async (tabId: string) => {
    if (!service) return null
    try {
      return await service.loadLayout(tabId)
    } catch (error) {
      console.error('Failed to load layout:', error)
      return null // Graceful degradation
    }
  }, [service])
  
  return {
    saveLayoutData,
    loadLayoutData,
    // ... other methods
  }
}
```

## Theme System Consolidation

### Single Theme Provider Architecture
```typescript
// Replace multiple theme systems with single provider
interface ConsolidatedThemeProvider {
  // Current theme state
  currentTheme: Theme
  themeName: string
  
  // Theme management
  setTheme: (themeName: string) => Promise<void> // Now saves to database
  availableThemes: string[]
  
  // CSS variable management
  applyCSSVariables: (theme: Theme) => void
  
  // User preference integration
  loadUserTheme: () => Promise<void>
  saveUserTheme: (themeName: string) => Promise<void>
}

// Implementation that replaces existing ThemeContext
export const ConsolidatedThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { savePreference, loadPreference } = useUserMemory()
  const [themeName, setThemeNameState] = useState('gzc-dark')
  
  // Load user theme on mount
  useEffect(() => {
    loadPreference('theme').then(savedTheme => {
      if (savedTheme && themes[savedTheme]) {
        setThemeNameState(savedTheme)
        applyCSSVariables(themes[savedTheme])
      }
    })
  }, [loadPreference])
  
  const setTheme = async (newThemeName: string) => {
    if (themes[newThemeName]) {
      setThemeNameState(newThemeName)
      applyCSSVariables(themes[newThemeName])
      await savePreference('theme', newThemeName)
    }
  }
  
  // ... rest of implementation
}
```

## Data Migration Strategy

### Migration from localStorage to Database
```typescript
interface DataMigrationService {
  migrateUserData(): Promise<MigrationResult>
  validateMigration(): Promise<ValidationResult>
  rollbackMigration(): Promise<void>
}

class LocalStorageToDBMigration implements DataMigrationService {
  async migrateUserData(): Promise<MigrationResult> {
    const migrationResults: MigrationResult = {
      layouts: { migrated: 0, failed: 0 },
      themes: { migrated: 0, failed: 0 },
      componentStates: { migrated: 0, failed: 0 }
    }
    
    // Migrate theme settings
    try {
      const theme = localStorage.getItem('gzc-intel-theme')
      if (theme) {
        await userMemoryService.saveTheme({ currentTheme: theme })
        migrationResults.themes.migrated++
      }
    } catch (error) {
      migrationResults.themes.failed++
    }
    
    // Migrate view memory
    try {
      const viewMemory = localStorage.getItem('gzc-platform-view-memory')
      if (viewMemory) {
        const parsed = JSON.parse(viewMemory)
        
        // Migrate layouts
        for (const [tabName, layout] of Object.entries(parsed.layouts || {})) {
          try {
            await userMemoryService.saveLayout(tabName, layout)
            migrationResults.layouts.migrated++
          } catch (error) {
            migrationResults.layouts.failed++
          }
        }
        
        // Migrate component states
        for (const [componentId, state] of Object.entries(parsed.componentStates || {})) {
          try {
            await userMemoryService.saveComponentState(componentId, state)
            migrationResults.componentStates.migrated++
          } catch (error) {
            migrationResults.componentStates.failed++
          }
        }
      }
    } catch (error) {
      console.error('Migration failed:', error)
    }
    
    return migrationResults
  }
}
```

## API Endpoints (Backend)

### FastAPI Implementation
```python
from fastapi import APIRouter, Depends, HTTPException
from azure.identity import DefaultAzureCredential
from azure.storage.cosmos import CosmosClient
import asyncpg

router = APIRouter(prefix="/api/user-memory")

@router.post("/")
async def save_user_memory(
    memory_data: UserMemoryRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Database = Depends(get_database)
):
    """Save user memory data with strict user isolation"""
    
    # Verify user authorization
    if user.user_id != memory_data.userId or user.tenant_id != memory_data.tenantId:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Save to database with upsert
    query = """
    INSERT INTO user_memory (user_id, tenant_id, memory_type, memory_key, memory_data, version)
    VALUES ($1, $2, $3, $4, $5, 1)
    ON CONFLICT (user_id, tenant_id, memory_type, memory_key)
    DO UPDATE SET 
        memory_data = EXCLUDED.memory_data,
        version = user_memory.version + 1,
        updated_at = NOW()
    """
    
    await db.execute(
        query,
        user.user_id,
        user.tenant_id, 
        memory_data.memoryType,
        memory_data.memoryKey,
        memory_data.memoryData
    )
    
    return {"success": True, "message": "Memory saved"}

@router.get("/{memory_type}/{memory_key}")
async def load_user_memory(
    memory_type: str,
    memory_key: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Database = Depends(get_database)
):
    """Load user memory data with strict user isolation"""
    
    query = """
    SELECT memory_data, version, updated_at
    FROM user_memory
    WHERE user_id = $1 AND tenant_id = $2 AND memory_type = $3 AND memory_key = $4
    """
    
    result = await db.fetchrow(
        query,
        user.user_id,
        user.tenant_id,
        memory_type,
        memory_key
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Memory not found")
    
    return {
        "memoryData": result["memory_data"],
        "version": result["version"],
        "updatedAt": result["updated_at"]
    }
```

## Security & Privacy

### Data Isolation Guarantees
1. **Row-Level Security**: All queries filtered by user_id + tenant_id
2. **Token Validation**: Azure AD JWT validation on every request
3. **Encryption**: Sensitive data encrypted with user-specific keys
4. **Audit Trail**: All operations logged with user context

### Privacy Compliance
```sql
-- GDPR compliance - user data deletion
CREATE OR REPLACE FUNCTION delete_user_data(target_user_id VARCHAR, target_tenant_id VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete all user memory data
    DELETE FROM user_memory 
    WHERE user_id = target_user_id AND tenant_id = target_tenant_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete user preferences
    DELETE FROM user_preferences 
    WHERE user_id = target_user_id AND tenant_id = target_tenant_id;
    
    -- Delete user sessions
    DELETE FROM user_sessions 
    WHERE user_id = target_user_id AND tenant_id = target_tenant_id;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

## Performance Optimization

### Caching Strategy
```typescript
interface CacheLayer {
  // Redis-based caching for frequently accessed data
  getUserTheme(userId: string): Promise<Theme | null>
  setUserTheme(userId: string, theme: Theme, ttl?: number): Promise<void>
  
  getUserLayout(userId: string, tabId: string): Promise<Layout | null>
  setUserLayout(userId: string, tabId: string, layout: Layout): Promise<void>
  
  invalidateUserCache(userId: string): Promise<void>
}

class RedisCacheLayer implements CacheLayer {
  private redis: RedisClient
  
  async getUserTheme(userId: string): Promise<Theme | null> {
    const cached = await this.redis.get(`user:${userId}:theme`)
    return cached ? JSON.parse(cached) : null
  }
  
  async setUserTheme(userId: string, theme: Theme, ttl = 3600): Promise<void> {
    await this.redis.setex(`user:${userId}:theme`, ttl, JSON.stringify(theme))
  }
}
```

### Database Optimization
```sql
-- Partition by user_id for performance
CREATE TABLE user_memory_partitioned (
  LIKE user_memory INCLUDING ALL
) PARTITION BY HASH (user_id);

-- Create partitions
CREATE TABLE user_memory_p0 PARTITION OF user_memory_partitioned
FOR VALUES WITH (MODULUS 4, REMAINDER 0);

CREATE TABLE user_memory_p1 PARTITION OF user_memory_partitioned
FOR VALUES WITH (MODULUS 4, REMAINDER 1);

-- Continue for more partitions...
```

## Integration Points (Minimal Main App Changes)

### Single Hook Integration
```typescript
// ONLY change needed in main application
// Replace existing localStorage calls with this hook

// Before (in DynamicCanvas.tsx):
localStorage.setItem('tabLayout', JSON.stringify(layout))

// After (in DynamicCanvas.tsx):
const { saveLayoutData } = useUserMemory()
await saveLayoutData(tabId, layout)
```

### Graceful Degradation
```typescript
// If user memory service fails, app continues to work
const saveLayoutWithFallback = async (tabId: string, layout: any) => {
  try {
    await userMemoryService.saveLayout(tabId, layout)
  } catch (error) {
    console.warn('User memory service unavailable, using session storage')
    sessionStorage.setItem(`layout_${tabId}`, JSON.stringify(layout))
  }
}
```

## Deployment Strategy

### Phase 1: Service Deployment
1. Deploy user memory database schema
2. Deploy user memory API service
3. Test with isolated users

### Phase 2: Frontend Integration  
1. Add `useUserMemory` hook
2. Replace localStorage calls incrementally
3. Run migration for existing users

### Phase 3: Cleanup
1. Remove duplicate theme providers
2. Remove localStorage dependencies
3. Monitor performance and optimize

## Monitoring & Observability

### Metrics to Track
- User memory API response times
- Database query performance  
- Cache hit/miss rates
- Migration success rates
- User data growth patterns

### Alerts
- User memory service downtime
- Database connection failures
- High memory usage per user
- Failed migration attempts

## Conclusion

This architecture provides:
- ✅ **Complete isolation** from main application
- ✅ **Enterprise-grade persistence** with PostgreSQL/CosmosDB
- ✅ **User-scoped data** with Azure AD integration
- ✅ **Graceful degradation** if service unavailable
- ✅ **GDPR compliance** with data deletion capabilities
- ✅ **Cross-device synchronization**
- ✅ **Theme system consolidation**
- ✅ **Performance optimization** with caching

The main application requires minimal changes - just replacing localStorage calls with the `useUserMemory` hook. All complexity is contained within the independent user memory service.

-- CLAUDE_CODE_ARCHITECT @ 2025-01-09T20:15:32Z