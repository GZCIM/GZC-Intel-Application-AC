# User Memory Architecture - GZC Intel Application

## Overview
This document describes the complete user memory and persistence architecture implemented in the GZC Intel Application. The system provides user-specific workspace persistence using Azure AD authentication and PostgreSQL storage.

## Architecture Diagram

```
┌─────────────────────┐
│   React Frontend    │
│  (MSAL + TypeScript)│
└──────────┬──────────┘
           │ Bearer Token
           ▼
┌─────────────────────┐
│   Main_Gateway      │
│  (FastAPI + Azure)  │
└──────────┬──────────┘
           │ User ID
           ▼
┌─────────────────────┐
│    PostgreSQL       │
│  (Azure Database)   │
└─────────────────────┘
```

## Components

### 1. Frontend Authentication (MSAL)
**Location**: `/src/hooks/useAuth.ts`, `/src/config/authConfig.ts`

- Uses Azure AD for authentication
- Acquires tokens via MSAL (Microsoft Authentication Library)
- Manages user sessions
- Provides token for API calls

### 2. Database Service
**Location**: `/src/services/databaseService.ts`

```typescript
class DatabaseService {
  // Acquires Azure AD token
  private async getAuthHeaders(): Promise<HeadersInit>
  
  // User preference operations
  async getUserPreferences(userId: string): Promise<UserPreferences>
  async saveUserPreferences(userId: string, preferences: Partial<UserPreferences>)
  
  // Tab management
  async getUserTabs(userId: string): Promise<any[]>
  async saveTab(userId: string, tab: any): Promise<any>
  async deleteTab(userId: string, tabId: string): Promise<boolean>
  
  // Component layouts
  async saveComponentLayouts(userId: string, tabId: string, layouts: any[])
}
```

### 3. Tab Layout Manager
**Location**: `/src/core/tabs/TabLayoutManager.tsx`

- Manages user tabs and layouts
- Persists to PostgreSQL when authenticated
- Falls back to defaults when not authenticated
- Handles component persistence within tabs

Key Features:
- User-specific tab configurations
- Dynamic component placement
- Edit mode for customization
- Real-time persistence

### 4. Backend API (Main_Gateway)
**Location**: `/Main_Gateway/backend/`

#### Authentication Middleware
**File**: `app/auth/azure_auth.py`
- Validates Azure AD JWT tokens
- Extracts user claims
- Enforces authentication on endpoints

#### Preferences Controller
**File**: `app/controllers/preferences_controller.py`
- Handles user preferences CRUD
- Manages tab configurations
- Stores component layouts

## Database Schema

### Tables

#### 1. user_preferences
```sql
CREATE TABLE user_preferences (
    user_id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    theme VARCHAR(50),
    language VARCHAR(10),
    timezone VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### 2. tab_configurations
```sql
CREATE TABLE tab_configurations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES user_preferences(user_id),
    tab_id VARCHAR(255) UNIQUE,
    title VARCHAR(255),
    icon VARCHAR(50),
    order_index INTEGER,
    is_active BOOLEAN,
    is_pinned BOOLEAN,
    tab_type VARCHAR(50),
    component_ids JSONB,  -- Stores component configurations
    layout_config JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### 3. component_layouts
```sql
CREATE TABLE component_layouts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES user_preferences(user_id),
    tab_id VARCHAR(255),
    component_id VARCHAR(255),
    component_type VARCHAR(100),
    position_x INTEGER,
    position_y INTEGER,
    width INTEGER,
    height INTEGER,
    z_index INTEGER,
    config JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## Authentication Flow

1. **User Login**
   - User clicks login → MSAL popup/redirect
   - Azure AD validates credentials
   - Returns JWT token with user claims

2. **Token Management**
   - MSAL stores tokens in session storage
   - Auto-refresh before expiry
   - Silent token acquisition for API calls

3. **API Requests**
   ```javascript
   // Frontend acquires token
   const token = await msalInstance.acquireTokenSilent({
     scopes: ['User.Read'],
     account: accounts[0]
   });
   
   // Sends with request
   fetch('/api/preferences/tabs', {
     headers: {
       'Authorization': `Bearer ${token.accessToken}`
     }
   });
   ```

4. **Backend Validation**
   ```python
   @router.get("/tabs")
   async def get_user_tabs(
       user_id: str = Depends(get_current_user)
   ):
       # user_id extracted from validated token
       # Query filtered by user_id
   ```

## Security Features

### Token Validation
- Validates against Azure AD JWKS
- Checks signature, expiry, audience
- Extracts user ID from claims

### User Isolation
- All queries filtered by user_id
- No cross-user data access
- User ID from token, not request

### Secure Storage
- PostgreSQL with SSL
- No sensitive data in localStorage
- Tokens in sessionStorage only

## Component Persistence

### Save Flow
1. User adds component to tab
2. TabLayoutManager updates state
3. Calls `databaseService.saveTab()`
4. Backend validates token
5. Stores in PostgreSQL with user_id

### Load Flow
1. User logs in
2. TabLayoutManager detects auth
3. Calls `databaseService.getUserTabs()`
4. Backend validates token
5. Returns user's tabs and components
6. UI reconstructs workspace

## Error Handling

### Frontend
- Graceful fallback to defaults
- Interactive auth on token failure
- Console warnings for debug

### Backend
- 401 for invalid/missing tokens
- 403 for unauthorized access
- 500 with details for server errors

## Environment Configuration

### Frontend (.env)
```env
VITE_CLIENT_ID=a873f2d7-2ab9-4d59-a54c-90859226bf2e
VITE_TENANT_ID=8274c97d-de9d-4328-98cf-2d4ee94bf104
VITE_BACKEND_URL=http://localhost:5300
```

### Backend (.env)
```env
AZURE_AD_TENANT_ID=8274c97d-de9d-4328-98cf-2d4ee94bf104
AZURE_AD_CLIENT_ID=a873f2d7-2ab9-4d59-a54c-90859226bf2e
POSTGRES_HOST=gzcdevserver.postgres.database.azure.com
POSTGRES_DB=gzc_intel
```

## Testing

### Manual Testing
1. Open browser console
2. Check authentication:
   ```javascript
   const accounts = window.msalInstance?.getAllAccounts()
   console.log('User:', accounts?.[0]?.username)
   ```

3. Test API with token:
   ```javascript
   const token = await window.msalInstance.acquireTokenSilent({
     scopes: ['User.Read'],
     account: accounts[0]
   });
   
   fetch('http://localhost:5300/api/preferences/tabs', {
     headers: { 'Authorization': `Bearer ${token.accessToken}` }
   }).then(r => r.json()).then(console.log)
   ```

## Deployment Considerations

1. **Azure AD App Registration**
   - Redirect URIs configured
   - API permissions granted
   - Client secret secured

2. **PostgreSQL**
   - Connection pooling enabled
   - SSL required
   - Backup configured

3. **Environment Variables**
   - Different per environment
   - Secrets in Key Vault
   - No hardcoded values

## Troubleshooting

### Common Issues

1. **"Not authenticated" error**
   - Check token expiry
   - Verify Azure AD config
   - Check CORS settings

2. **Tabs not loading**
   - Verify database connection
   - Check user_id extraction
   - Review PostgreSQL logs

3. **Components not persisting**
   - Check component_ids format
   - Verify JSON serialization
   - Check database constraints

## Future Enhancements

1. **Offline Support**
   - IndexedDB for offline storage
   - Sync when reconnected

2. **Real-time Collaboration**
   - WebSocket for live updates
   - Shared workspaces

3. **Advanced Features**
   - Tab templates
   - Component marketplace
   - Custom widgets

---

Last Updated: 2025-01-09
Version: 1.0.0
Author: GZC Engineering Team