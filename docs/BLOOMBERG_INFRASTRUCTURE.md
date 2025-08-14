# Bloomberg Infrastructure Documentation

## Overview
This document describes the Bloomberg data infrastructure for the GZC Intel Application, including multiple API endpoints and deployment options.

## Infrastructure Components

### 1. Bloomberg Terminal VM
- **Direct API Endpoint**: `http://20.172.249.92:8080`
- **Status**: ✅ Active and healthy
- **Features**: 
  - Real Bloomberg Terminal data
  - Supports FX volatility surfaces
  - Direct market data access
  - Supported FX pairs: EURUSD, GBPUSD, USDJPY, USDCHF, AUDUSD, USDCAD, NZDUSD
  - Supported tenors: 1W, 2W, 1M, 2M, 3M, 6M, 9M, 1Y, 2Y

### 2. Kubernetes Bloomberg Gateway
- **LoadBalancer Endpoint**: `http://52.149.235.82`
- **Namespace**: `bloomberg-gateway`
- **Deployment**: 2 replicas of `gzcacr.azurecr.io/bloomberg-gateway:v2`
- **Status**: ✅ Active
- **Configuration**:
  ```yaml
  Service: bloomberg-gateway-lb
  Type: LoadBalancer
  External IP: 52.149.235.82
  Port: 80 → 8000
  Session Affinity: ClientIP (3 hours)
  ```
- **Features**:
  - Load balancing across 2 pods
  - Health checks at `/health`, `/live`, `/ready`
  - Redis caching support (TTL: 900 seconds)
  - Proxies to Bloomberg VM API

### 3. Azure Container App
- **Endpoint**: `https://bloomberg-volatility-surface.agreeablepond-1a74a92d.eastus.azurecontainerapps.io`
- **Status**: ✅ Active
- **Features**: Alternative deployment option

## API Endpoints

### Market Data Endpoint
```bash
POST /api/market-data
{
  "tickers": [
    {"ticker": "EURUSD Curncy", "fields": ["PX_LAST"]},
    {"ticker": "EURUSD V1M Curncy", "fields": ["PX_LAST"]}
  ]
}
```

### Volatility Surface Data
The frontend fetches volatility data for multiple tenors and strike levels to build 3D surfaces.

## Current Configuration

The application now uses **nginx proxy** to avoid mixed content issues:
- Production: `/api/bloomberg/` (proxies to `http://20.172.249.92:8080`)
- Development: `http://localhost:8080`
- Legacy Direct: `http://20.172.249.92:8080` (blocked by HTTPS mixed content policy)

### Mixed Content Fix (2025-08-13)
Production app served over HTTPS was blocking HTTP API calls to Bloomberg VM. Fixed by:
1. Adding nginx proxy configuration: `/api/bloomberg/` → `http://52.149.235.82` (K8s Bloomberg Gateway)
2. Updated frontend API format to match K8s gateway expectations:
   - Market data: `{securities: [...], fields: [...]}` instead of `{tickers: [...]}`
   - Volatility surface: Send array directly instead of `{tenors: [...]}`
3. Updated response data handling for K8s gateway format
4. Deployed v20250813-235711 with working K8s Bloomberg architecture

## Kubernetes Setup Commands

### View Bloomberg Gateway Status
```bash
# Check deployment
kubectl get deployment -n bloomberg-gateway

# Check service
kubectl get svc bloomberg-gateway-lb -n bloomberg-gateway

# View logs
kubectl logs deployment/bloomberg-gateway -n bloomberg-gateway

# Check pod health
kubectl get pods -n bloomberg-gateway
```

### Update Configuration
```bash
# Edit ConfigMap
kubectl edit configmap bloomberg-gateway-config -n bloomberg-gateway

# Restart deployment
kubectl rollout restart deployment/bloomberg-gateway -n bloomberg-gateway
```

## Migration Path

To migrate from direct VM connection to K8s gateway:

1. **Update Gateway API**: Ensure K8s gateway API matches the expected format
2. **Update Frontend**: Change endpoint in `VolatilityAnalysis.tsx`
3. **Benefits**:
   - Better load distribution
   - Automatic failover
   - Caching layer
   - Kubernetes native monitoring

## Monitoring

### Health Checks
```bash
# Direct VM
curl http://20.172.249.92:8080/health

# K8s Gateway
curl http://52.149.235.82/health

# Container App
curl https://bloomberg-volatility-surface.agreeablepond-1a74a92d.eastus.azurecontainerapps.io/health
```

### Response Format
```json
{
  "success": true,
  "data": {
    "api_status": "healthy",
    "bloomberg_terminal_running": true,
    "bloomberg_service_available": true,
    "supported_fx_pairs": ["EURUSD", "GBPUSD", ...],
    "supported_tenors": ["1W", "2W", "1M", ...],
    "is_using_real_data": true
  }
}
```

## Troubleshooting

### Issue: K8s Gateway API Format Mismatch
**Problem**: The K8s gateway expects different request format than the frontend sends.
**Solution**: Use direct VM API until gateway is updated to match expected format.

### Issue: CORS Errors
**Problem**: Browser blocks cross-origin requests.
**Solution**: Ensure backend includes proper CORS headers or use proxy.

### Issue: Connection Timeouts
**Problem**: Requests to Bloomberg API timeout.
**Solution**: 
1. Check VM health: `curl http://20.172.249.92:8080/health`
2. Verify network connectivity
3. Check Bloomberg Terminal status on VM

## Future Improvements

1. **Unified API Gateway**: Standardize API format across all Bloomberg endpoints
2. **WebSocket Support**: Add real-time data streaming for live volatility updates
3. **Caching Strategy**: Implement intelligent caching for frequently requested data
4. **Monitoring Dashboard**: Create Grafana dashboard for Bloomberg API metrics
5. **Auto-scaling**: Configure HPA for K8s deployment based on load

## Contact

For Bloomberg Terminal access or API issues, contact the infrastructure team.

---
Last Updated: 2025-08-13