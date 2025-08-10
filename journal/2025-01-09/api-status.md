# API Status and Future Plans

## Date: 2025-01-09

## Current API Status

### Bloomberg Terminal API
- **Current URL**: `http://20.172.249.92:8080` (Direct VM connection)
- **Status**: Working but blocked by browser due to mixed content (HTTPS→HTTP)
- **Plan**: Will migrate to Kubernetes-hosted Bloomberg API service
- **Timeline**: To be implemented later
- **Note**: Terminal may not be logged in, but this is not critical for now

### Portfolio Backend API  
- **URL**: `https://portfolio-backend.agreeablepond-1a74a92d.eastus.azurecontainerapps.io`
- **Status**: CORS blocking cross-origin requests
- **Impact**: Tab persistence not working
- **Priority**: Low - core functionality works without it

## Future Architecture

```
┌─────────────────────────────────┐
│   GZC Intel App (HTTPS)         │
│   Container Apps                 │
└──────────┬──────────────────────┘
           │
           ├── Bloomberg API Service (Kubernetes)
           │   └── HTTPS endpoint
           │   └── Same cluster networking
           │   └── No mixed content issues
           │
           └── Portfolio Backend
               └── CORS configuration needed
```

## Action Items
- ✅ Core modal functionality working
- ⏳ Bloomberg API migration to Kubernetes (future)
- ⏳ Portfolio backend CORS configuration (low priority)

## Summary
The application is fully functional for component management. API issues are external dependencies that will be resolved in future iterations when the Bloomberg API is properly deployed to Kubernetes with HTTPS termination.

---
**Documented by**: Claude Code
**Date**: 2025-01-09