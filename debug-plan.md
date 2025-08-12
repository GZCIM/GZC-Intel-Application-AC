# Comprehensive Testing & Debugging Plan for User Memory System

## Current Status (2025-08-11 19:07)

### ✅ Fixed Issues
1. **Azure AD Platform Configuration** - Moved redirect URIs from web to SPA platform
2. **Environment Variable Injection** - Client ID and Tenant ID properly injected
3. **Backend Health** - Backend is running and healthy

### 🔍 Discovered Architecture

#### Authentication
- **Azure AD App**: b1263d01-9fbb-4ca5-bfe3-443d78fd886f
- **SPA Redirect URIs**: 
  - https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io
  - http://localhost:3500

#### Storage Systems
1. **PostgreSQL**: gzcdevserver in AEWS resource group (database: gzc_intel)
2. **Cosmos DB**: cosmos-research-analytics-prod
   - Database: gzc-intel-app-config
   - Container: user-configurations (partitioned by /userId)

#### Monitoring
- **Application Insights**: claude-code-insights
- Backend telemetry working (transmitting every 5 seconds)
- Frontend telemetry: App_Initialized event detected

## Testing Strategy

### Phase 1: Authentication Testing ✅
- [x] Fix Azure AD app registration (SPA platform)
- [ ] Test login popup flow
- [ ] Verify token acquisition
- [ ] Check token in localStorage

### Phase 2: User Memory Creation
- [ ] Create new tab
- [ ] Add multiple components
- [ ] Save tab configuration
- [ ] Monitor network requests

### Phase 3: Backend Persistence
- [ ] Check PostgreSQL for user data
- [ ] Check Cosmos DB for user configurations
- [ ] Verify partition key (userId) usage

### Phase 4: Cross-Session Testing
- [ ] Close browser
- [ ] Reopen in new session
- [ ] Login with same user
- [ ] Verify tabs/components restored

### Phase 5: Application Insights Analysis
- [ ] Query custom events
- [ ] Check for exceptions
- [ ] Monitor request latency
- [ ] Identify bottlenecks

## Debug Commands

### Check Authentication
```javascript
// Browser console
const accounts = window.msalInstance?.getAllAccounts()
console.log('Accounts:', accounts)

// Get token
const token = await window.msalInstance.acquireTokenSilent({
  scopes: [`api://${clientId}/.default`],
  account: accounts[0]
}).then(r => r.accessToken)
console.log('Token acquired:', !!token)
```

### Monitor Network
```javascript
// Intercept fetch calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('Fetch:', args[0], args[1]);
  return originalFetch.apply(this, args);
}
```

### Check Local Storage
```javascript
// View all tab configurations
const tabs = localStorage.getItem('tabLayouts')
console.log('Tabs:', JSON.parse(tabs))
```

### Application Insights Queries
```kusto
// Authentication events
customEvents 
| where timestamp > ago(1h)
| where name contains "auth" or name contains "login"
| project timestamp, name, customDimensions

// API requests
requests
| where timestamp > ago(1h)
| where url contains "preferences" or url contains "tabs"
| project timestamp, name, url, resultCode, duration

// Exceptions
exceptions
| where timestamp > ago(1h)
| project timestamp, message, details
```

### Database Verification
```bash
# PostgreSQL
az postgres flexible-server db list \
  --server-name gzcdevserver \
  --resource-group AEWS

# Cosmos DB
az cosmosdb sql container show \
  --account-name cosmos-research-analytics-prod \
  --database-name gzc-intel-app-config \
  --name user-configurations \
  --resource-group rg-research-analytics-prod
```

## Known Issues to Investigate

1. **Frontend Telemetry**: Only seeing App_Initialized event, not seeing user actions
2. **PostgreSQL Connection**: Server is in different resource group (AEWS)
3. **Cosmos DB Access**: Need to verify app has proper permissions
4. **CORS Configuration**: Check if backend allows frontend origin

## Next Steps

1. Test login flow with browser developer tools open
2. Monitor network tab for failed requests
3. Check browser console for JavaScript errors
4. Query Application Insights for any exceptions
5. Verify database connectivity from backend

## Success Criteria

- [ ] User can login via Azure AD
- [ ] Tabs persist across sessions
- [ ] Components save their state
- [ ] No errors in Application Insights
- [ ] Sub-second response times
- [ ] Data visible in Cosmos DB

-- CLAUDE @ 2025-08-11T19:07:33Z