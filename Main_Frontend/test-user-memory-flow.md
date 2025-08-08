# User Memory Test Flow

## Test Scenarios

### 1. Initial Load (Not Authenticated)
- ✅ App loads with default layout
- ✅ Login modal appears
- ✅ No database calls are made
- ✅ Default tabs are shown (Analytics, Documentation)

### 2. After Login
- User authenticates with Azure AD
- TabLayoutManager loads user's saved tabs from PostgreSQL
- Previously saved components are restored
- User sees their personalized workspace

### 3. Create New Tab
- User creates a new dynamic tab
- Tab is saved to PostgreSQL with user ID from token
- Tab persists in database

### 4. Add Components to Tab
- User adds Portfolio component to dynamic tab
- Component position and config saved to PostgreSQL
- Component persists with tab

### 5. Logout and Login Again
- User logs out
- User logs in again
- All tabs and components are restored from PostgreSQL
- User memory is intact

## Current Implementation Status

### ✅ Completed:
1. PostgreSQL integration for tabs and components
2. Azure AD authentication for all endpoints
3. User ID extraction from token claims
4. Auth state checks before database operations
5. Proper MSAL token acquisition in frontend

### 🔧 Architecture:
```
Frontend (React + MSAL)
    ↓ Bearer Token
Main_Gateway (FastAPI)
    ↓ Validated User ID
PostgreSQL Database
    ↓ User-specific data
```

### 📊 Data Flow:
1. User logs in → MSAL gets Azure AD token
2. Frontend sends token with API requests
3. Backend validates token, extracts user ID
4. Database queries filtered by user ID
5. User sees only their data

## Testing Commands

### Manual Test in Browser Console:
```javascript
// Check auth state
const accounts = window.msalInstance?.getAllAccounts()
console.log('Authenticated:', accounts?.length > 0)
console.log('User:', accounts?.[0]?.username)

// Check saved tabs (requires auth)
fetch('http://localhost:5300/api/preferences/tabs', {
  headers: {
    'Authorization': `Bearer ${await window.msalInstance.acquireTokenSilent({scopes:['User.Read']}).then(r => r.accessToken)}`
  }
}).then(r => r.json()).then(console.log)
```

## Known Issues & Solutions

### Issue: Components not persisting
**Solution**: Implemented in TabLayoutManager - saves component arrays to PostgreSQL

### Issue: Auth required for all operations
**Solution**: Added auth checks before database operations, graceful fallback to defaults

### Issue: User ID extraction
**Solution**: Backend extracts from token claims (sub, oid, email)

## Next Steps

1. Test with real Azure AD login
2. Verify multi-user isolation
3. Add component state persistence
4. Implement tab reordering persistence