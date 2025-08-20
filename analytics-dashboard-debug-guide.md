# Analytics Dashboard Debug Analysis

## Production Application Analysis
**URL:** https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io

## Debug Analysis Summary

Based on my code analysis, here's what you need to check to verify if the Analytics Dashboard configuration is being saved to Cosmos DB properly:

### 🔐 Authentication Status Check

1. **Open Browser Console** on the production URL
2. **Check MSAL Initialization:**
   ```javascript
   console.log('MSAL Instance:', !!window.msalInstance);
   console.log('MSAL Accounts:', window.msalInstance?.getAllAccounts());
   console.log('Active Account:', window.msalInstance?.getActiveAccount());
   ```

3. **Check sessionStorage for tokens:**
   ```javascript
   Object.keys(sessionStorage).filter(key => key.includes('msal')).forEach(key => {
       console.log('MSAL Token Key:', key, 'Size:', sessionStorage[key]?.length);
   });
   ```

**Expected Result:** You should see MSAL tokens in sessionStorage, not localStorage.

### 💾 Storage Analysis

1. **Check localStorage content:**
   ```javascript
   console.log('localStorage items:', Object.keys(localStorage).length);
   Object.keys(localStorage).forEach(key => {
       const value = localStorage[key];
       const size = new Blob([value]).size;
       if (size > 10000 || key.includes('gzc-intel-config')) {
           console.log('Storage item:', key, size + ' bytes');
       }
   });
   ```

2. **Check for user configuration fallbacks:**
   ```javascript
   const configKeys = Object.keys(localStorage).filter(k => k.includes('gzc-intel-config'));
   console.log('User config fallback keys:', configKeys);
   ```

**Expected Result:** Minimal localStorage usage, mostly empty or small fallback configs only.

### 🌌 Cosmos DB Save Status Check

1. **Open Network Tab** in browser DevTools
2. **Monitor API calls** while using the Analytics Dashboard:
   - Filter by: `cosmos`, `config`, `api`
   - Look for these endpoints:
     - `GET /api/cosmos/config` (loads configuration)
     - `POST /api/cosmos/config` (saves configuration)
     - `GET /api/cosmos/health` (health check)

3. **Manual health check:**
   ```javascript
   fetch('/api/cosmos/health')
       .then(r => r.json())
       .then(data => console.log('Cosmos Health:', data))
       .catch(e => console.error('Cosmos Health Failed:', e));
   ```

4. **Watch for save operations in console:**
   Look for these log messages:
   - `💾 Saving to Cosmos DB:` (indicates save attempt)
   - `✅ Configuration saved to Cosmos DB` (success)
   - `❌ Configuration not saved - ...` (failure)

### 📊 Analytics Dashboard Configuration Test

**Test Procedure:**
1. Navigate to the Analytics tab (should be default)
2. Monitor Network tab for API calls
3. Make any configuration change (the dashboard auto-saves)
4. Look for `POST /api/cosmos/config` call
5. Check response status (should be 200)
6. Refresh the page
7. Verify configuration persists after refresh

**Console monitoring:**
```javascript
// Check current configuration
fetch('/api/cosmos/config', {
    headers: { 'Authorization': 'Bearer ' + 'CHECK_SESSIONSTORAGE_FOR_TOKEN' }
}).then(r => r.json()).then(config => {
    console.log('Current saved config:', config);
    console.log('Analytics tab config:', config.tabs?.find(t => t.type === 'analytics'));
});
```

### 🚨 Error Patterns to Watch For

1. **401 Unauthorized:** Token expired or invalid
   - Check sessionStorage for MSAL tokens
   - Try refreshing the page to get new tokens

2. **403 Forbidden:** Insufficient permissions
   - Verify user has proper Azure AD permissions

3. **503 Service Unavailable:** Cosmos DB connection issues
   - Backend logs: "Cosmos DB not available - check NAT Gateway IP whitelisting"
   - Check if Container App outbound IPs are whitelisted in Cosmos DB firewall

4. **Network timeouts:** 
   - Check Azure Container App backend health
   - Verify Cosmos DB endpoint accessibility

### 📋 Configuration Save Format

The Analytics Dashboard configuration should be saved in this format:
```json
{
  "id": "user@domain.com",
  "userId": "user@domain.com", 
  "userEmail": "user@domain.com",
  "tabs": [
    {
      "id": "analytics",
      "name": "Analytics", 
      "type": "analytics",
      "icon": "BarChart3",
      "components": []
    }
  ],
  "layouts": [],
  "preferences": {
    "theme": "dark",
    "language": "en"
  },
  "componentStates": {},
  "timestamp": "2024-XX-XX...",
  "type": "user-config"
}
```

### 🎯 Key Verification Points

**Successful Save Indicators:**
- ✅ Network call: `POST /api/cosmos/config` returns 200
- ✅ Console log: "✅ Configuration saved to Cosmos DB"
- ✅ Toast notification: "✓ Configuration saved to cloud"
- ✅ Page refresh loads the same configuration

**Failed Save Indicators:**
- ❌ Network call returns 401, 403, or 503
- ❌ Console log: "❌ Configuration not saved - ..."
- ❌ Toast notification: "❌ Configuration not saved"
- ❌ Page refresh loses configuration (falls back to localStorage)

### 🔧 Backend Configuration Details

**Cosmos DB Setup:**
- **Endpoint:** `https://cosmos-research-analytics-prod.documents.azure.com:443/`
- **Database:** `gzc-intel-app-config`
- **Container:** `user-configurations`
- **Authentication:** DefaultAzureCredential (Managed Identity)
- **User ID:** Uses email from Azure AD token as document ID

**Critical Requirements:**
- Container App must have outbound IPs whitelisted in Cosmos DB firewall via NAT Gateway
- Managed Identity must have proper permissions on Cosmos DB
- MSAL tokens must be valid and in sessionStorage

### 📊 Performance Monitoring

**Dashboard will persist after refresh if:**
1. User is authenticated (tokens in sessionStorage)
2. Cosmos DB connection is working (health check passes)
3. Save operations return 200 status
4. No network errors in browser console

**Dashboard will NOT persist if:**
1. Cosmos DB is unavailable (503 errors)
2. Authentication fails (401/403 errors)
3. Network connectivity issues
4. Backend service is down

## Summary Report Template

After running these checks, report back with:

1. **Storage Analysis:**
   - localStorage item count and size
   - sessionStorage MSAL token presence
   - Any configuration fallback keys found

2. **Cosmos DB Save Status:**
   - Health check result (`/api/cosmos/health`)
   - Network call success/failure for saves
   - Console log messages during save operations

3. **Authentication Status:**
   - MSAL initialization status
   - Active account presence
   - Token availability in sessionStorage

4. **Persistence Verification:**
   - Configuration survives page refresh: YES/NO
   - Analytics Dashboard components reload correctly: YES/NO
   - Any errors in browser console: LIST

5. **Network Analysis:**
   - Successful API calls to `/api/cosmos/config`
   - Error responses and status codes
   - Request/response timing

This analysis will determine if the Analytics Dashboard configuration is properly saving to Cosmos DB and persisting across sessions.