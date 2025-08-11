# Authentication & Persistence Flow Analysis

## Complete 10-Step Flow: Login → Database → Retrieval

### Step 1: MSAL Instance Initialization
**Location**: `Main_Frontend/src/main.tsx:71-98`
**Technology**: Microsoft Authentication Library (MSAL) v3.x + React

```typescript
// CRITICAL: MSAL must initialize BEFORE React renders
await msalInstance.initialize();
const response = await msalInstance.handleRedirectPromise();
const accounts = msalInstance.getAllAccounts();
```

**Key Issue**: Authentication state must restore from localStorage before React components load to prevent race conditions.

### Step 2: Azure AD Authentication Flow
**Location**: `Main_Frontend/src/contexts/UserContext.tsx:129-138`
**Technology**: Azure AD B2C + MSAL React Provider

```typescript
await instance.loginPopup({
    scopes: [`api://${import.meta.env.VITE_CLIENT_ID}/.default`]
});
```

**Azure Configuration**:
- Tenant ID: `8274c97d-de9d-4328-98cf-2d4ee94bf104`
- Client ID: `a873f2d7-2ab9-4d59-a54c-90859226bf2e`
- Cache Location: localStorage (persistent across browser sessions)

### Step 3: JWT Token Acquisition & Validation
**Location**: `Main_Frontend/src/services/databaseService.ts:44-53`
**Technology**: MSAL Silent Token Acquisition + Azure AD JWT

```typescript
const response = await msalInstance.acquireTokenSilent({
    ...loginRequest,
    account: accounts[0]
});
// Authorization: Bearer <JWT_TOKEN>
```

**Backend Validation**: `FSS_Socket/backend/app/controllers/preferences_controller.py:65-113`
```python
user_info = azure_validator.validate_token(token)
g.user_id = user_info['user_id']
g.user_email = user_info['email']
```

### Step 4: User Context Synchronization
**Location**: `Main_Frontend/src/contexts/UserContext.tsx:43-93`
**Technology**: React Context + localStorage persistence

```typescript
const convertedUser = convertMsalAccountToUser(msalAccount);
setUser(convertedUser);
localStorage.setItem("gzc-intel-user", JSON.stringify(convertedUser));
```

**Critical Race Condition Fix**: 100ms delay to allow MSAL cache restoration before localStorage fallback.

### Step 5: Database Connection Establishment
**Location**: `FSS_Socket/backend/app/controllers/preferences_controller.py:31-37`
**Technology**: PostgreSQL + SQLAlchemy + Azure Database for PostgreSQL

```python
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
# Host: gzcdevserver.postgres.database.azure.com
# Database: gzc_intel
# Port: 5432
```

**Database Schema**:
- `user_preferences` (primary table)
- `tab_configurations` (foreign key to user_preferences)
- `component_layouts` (foreign key to tab_configurations)

### Step 6: User Record Creation/Retrieval
**Location**: `FSS_Socket/backend/app/services/preferences_service.py`
**Technology**: SQLAlchemy ORM + Redis Caching

```python
# If user doesn't exist, create with defaults
service.create_or_update_preferences(
    g.user_id,     # From JWT: '415b084c-592c-401b-a349-fcc97c64522d'
    g.user_email,  # From JWT: user email
    default_preferences
)
```

**API Endpoints**:
- `GET /api/preferences/user` - Retrieve user preferences
- `POST/PUT /api/preferences/user` - Create/update user preferences

### Step 7: Tab Configuration Persistence
**Location**: `Main_Frontend/src/core/tabs/TabLayoutManager.tsx:152`
**API**: `FSS_Socket/backend/app/controllers/preferences_controller.py:217-234`

```typescript
// Frontend: Save tab to database
const saved_tab = await databaseService.saveTab(userId, tabData);

// Backend: Persist to PostgreSQL
saved_tab = service.save_tab_configuration(g.user_id, tab_data)
```

**Current Issue**: TabLayoutManager falls back to DEFAULT_LAYOUT when `!isAuthenticated`, preventing database persistence.

### Step 8: Component Layout Storage
**Location**: `Main_Frontend/src/services/databaseService.ts:169-185`
**API**: `FSS_Socket/backend/app/controllers/preferences_controller.py:279-302`

```typescript
await databaseService.saveComponentLayouts(userId, tabId, layouts);
```

**Bulk Storage Pattern**:
```python
POST /api/preferences/layouts/bulk
{
    "tab_id": "uuid",
    "layouts": [component_layout_objects]
}
```

### Step 9: Memory State Retrieval on Page Load
**Location**: `Main_Frontend/src/contexts/UserContext.tsx:100-127`
**Technology**: MSAL Cache + localStorage Fallback + PostgreSQL

```typescript
// Primary: MSAL cached authentication
const accounts = msalInstance.getAllAccounts();

// Fallback: localStorage user data
const storedUser = localStorage.getItem("gzc-intel-user");

// Database: User preferences via authenticated API
const preferences = await databaseService.getUserPreferences(userId);
```

### Step 10: Tab & Layout Restoration
**Location**: `Main_Frontend/src/core/tabs/TabLayoutManager.tsx`
**API**: `GET /api/preferences/tabs`

**Current Implementation Flow**:
1. Check `isAuthenticated` from UserContext
2. If authenticated: Load tabs from database via `getUserTabs()`
3. If not authenticated: Use `DEFAULT_LAYOUT` (❌ **This is the persistence failure**)

## Root Cause Analysis: Why Persistence Fails

### Authentication State Loss on Refresh

**Problem**: MSAL `isAuthenticated` returns false immediately after page refresh, even though:
- MSAL has cached accounts in localStorage
- JWT tokens are still valid
- Backend API calls work with cached tokens

**Evidence from Logs**:
```
🔐 MSAL initialized with 0 accounts
TabLayoutManager: User not authenticated, using default layout
```

**Technical Root Cause**: 
1. MSAL takes time to restore authentication state from cache
2. React components render before MSAL finishes initialization
3. `useIsAuthenticated()` hook returns false during restoration
4. TabLayoutManager immediately falls back to default layout
5. User memory never loads from database

### Implementation Fixes Applied (But Still Not Working)

1. **MSAL Pre-initialization** (`main.tsx:71-98`):
   - Initialize MSAL before React renders
   - Handle redirect promises
   - Set active account from cache

2. **Database Service Token Management** (`databaseService.ts:25-81`):
   - Use shared MSAL instance from window object
   - Fixed separate instance creation bug
   - Added fallback authentication attempts

3. **UserContext Race Condition** (`UserContext.tsx:100-127`):
   - Added 100ms delay for MSAL cache restoration
   - Better fallback logic for stored user data

## Technology Stack Summary

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend Auth** | MSAL React v3.x | Azure AD authentication |
| **Token Storage** | localStorage | Persistent auth cache |
| **User Context** | React Context | App-wide user state |
| **Backend Auth** | JWT Validation | Azure AD token verification |
| **Database** | PostgreSQL 14+ | User preferences persistence |
| **ORM** | SQLAlchemy | Database object mapping |
| **Caching** | Redis | Performance optimization |
| **API** | Flask REST | User preferences endpoints |
| **Deployment** | Azure Container Apps | Cloud hosting |

## Current Status: Still Broken After v20250810-181928

**Deployed Fixes**:
- ✅ MSAL initialization sequence
- ✅ Shared MSAL instance usage
- ✅ Database service authentication
- ✅ UserContext race condition handling

**Remaining Issue**:
- ❌ `isAuthenticated` still false on page refresh
- ❌ TabLayoutManager still uses default layout
- ❌ User memory never loads from database

**Next Required Fix**:
The TabLayoutManager needs to wait for MSAL authentication state to stabilize before falling back to default layout, or use the cached user data directly instead of relying on `isAuthenticated` hook.