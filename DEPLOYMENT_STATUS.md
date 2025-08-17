# Deployment Status - Bloomberg Volatility Fix

## Current Production Version
- **Version**: `v20250814-044841` (from 4:48 AM this morning)
- **Status**: WORKING ✅
- **URL**: https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io
- **Issue**: EURUSD works, but other currency pairs throw DOM manipulation error

## Test Version with Fix
- **Version**: `v20250814-163418-fix-volatility-cleanup`
- **Status**: DEPLOYED ✅
- **Deployed**: 2025-08-14 16:36:04 UTC
- **Changes**: Added D3.js DOM cleanup in VolatilityAnalysis currency pair change handler (targeted fix)
- **Revision**: gzc-intel-application-ac--0000240

## The Fix Applied
```javascript
// In VolatilityAnalysis.tsx line 1171-1182
onChange={(e) => {
  // Clear charts before changing pair to avoid DOM manipulation conflicts
  try {
    if (smileChartRef.current) {
      d3.select(smileChartRef.current).selectAll("*").remove()
    }
    if (termChartRef.current) {
      d3.select(termChartRef.current).selectAll("*").remove()
    }
  } catch (error) {
    console.warn('Error clearing charts before pair change:', error)
  }
  setSelectedPair(e.target.value)
  fetchSpotRates() // Refresh spot rates when pair changes
}}
```

## Previous Failed Attempts
- `v20250814-155851` - Broke the application (missing configs)
- `v20250814-153324-final` - Authentication issues with ACR

## To Deploy Test Version
```bash
az containerapp update \
  --name gzc-intel-application-ac \
  --resource-group gzc-kubernetes-rg \
  --image gzcacr.azurecr.io/gzc-intel-app:v20250814-161144-fix-currency-switch
```

## To Rollback if Needed
```bash
az containerapp update \
  --name gzc-intel-application-ac \
  --resource-group gzc-kubernetes-rg \
  --image gzcacr.azurecr.io/gzc-intel-app:v20250814-044841
```