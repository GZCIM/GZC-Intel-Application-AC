# API Reference

## 🔌 Backend APIs (Port 5100)

### Health Check
```http
GET /health
```
**Response**: 
```json
{ "status": "healthy", "timestamp": "2025-01-08T10:30:00Z" }
```

### Quote Subscription
```http
POST /api/subscribe_quote
Content-Type: application/json

{
  "symbol": "EURUSD",
  "type": "spot"
}
```

### WebSocket Endpoints

#### ESP Quote Stream
```javascript
ws://localhost:5100/ws_esp

// Message format
{
  "symbol": "EURUSD",
  "bid": 1.0456,
  "ask": 1.0457,
  "timestamp": 1234567890
}
```

#### RFS Quote Stream
```javascript
ws://localhost:5100/ws_rfs

// Message format
{
  "symbol": "GBPUSD",
  "price": 1.2534,
  "volume": 1000000,
  "timestamp": 1234567890
}
```

#### Execution Stream
```javascript
ws://localhost:5100/ws_execution

// Message format
{
  "trade_id": "T123456",
  "symbol": "EURUSD",
  "side": "buy",
  "quantity": 1000000,
  "price": 1.0456,
  "timestamp": 1234567890
}
```

## 📊 Bloomberg API (Port 8080)

### Health Check
```http
GET http://20.172.249.92:8080/health
```

### Market Data
```http
POST http://20.172.249.92:8080/api/market-data
Content-Type: application/json

{
  "securities": ["AAPL US Equity", "EURUSD Curncy"],
  "fields": ["PX_LAST", "CHG_PCT_1D", "VOLUME"]
}
```

**Response**:
```json
{
  "data": {
    "AAPL US Equity": {
      "PX_LAST": 145.23,
      "CHG_PCT_1D": 1.23,
      "VOLUME": 54321000
    },
    "EURUSD Curncy": {
      "PX_LAST": 1.0456,
      "CHG_PCT_1D": -0.15
    }
  },
  "timestamp": "2025-01-08T10:30:00Z"
}
```

### FX Rates
```http
GET http://20.172.249.92:8080/api/fx/rates
```

**Response**:
```json
{
  "rates": {
    "EURUSD": 1.0456,
    "GBPUSD": 1.2534,
    "USDJPY": 110.23,
    "AUDUSD": 0.7123
  },
  "timestamp": "2025-01-08T10:30:00Z"
}
```

## 📁 Frontend Component APIs

### ComponentInventory
```typescript
// Get all components
componentInventory.getAllComponents(): ComponentConfig[]

// Search components
componentInventory.searchComponents(query: string): ComponentConfig[]

// Get single component
componentInventory.getComponent(id: string): ComponentConfig | undefined

// Get by category
componentInventory.getComponentsByCategory(category: string): ComponentConfig[]
```

### Tab Layout Manager
```typescript
// Save layout
TabLayoutManager.saveLayout(tabId: string, layout: Layout[]): void

// Get layout
TabLayoutManager.getLayout(tabId: string): Layout[]

// Clear layout
TabLayoutManager.clearLayout(tabId: string): void
```

### Theme Context
```typescript
// Use theme
const { currentTheme, setTheme } = useTheme()

// Theme object
{
  background: string,
  surface: string,
  primary: string,
  text: string,
  textSecondary: string,
  border: string,
  success: string,
  danger: string,
  warning: string
}
```

## 🔐 Azure Management APIs

### Container App Update
```bash
az containerapp update \
  --name gzc-intel-application-ac \
  --resource-group gzc-kubernetes-rg \
  --image gzcacr.azurecr.io/gzc-intel-app:VERSION
```

### Get Revision Status
```bash
az containerapp revision list \
  --name gzc-intel-application-ac \
  --resource-group gzc-kubernetes-rg \
  --query "[0:3]"
```

### View Logs
```bash
az containerapp logs show \
  --name gzc-intel-application-ac \
  --resource-group gzc-kubernetes-rg \
  --follow
```

## 📡 Redis Commands

### Test Connection
```bash
redis-cli -a $REDIS_PASSWORD ping
```

### Get Quote
```bash
redis-cli -a $REDIS_PASSWORD get "quote:EURUSD"
```

### Monitor Updates
```bash
redis-cli -a $REDIS_PASSWORD monitor
```

## 🔧 Utility Functions

### Clear Storage Corruption
```javascript
function clearCorruptStorage() {
  const keys = ['gzc-intel-theme', 'gzc-intel-user', 'tabLayouts']
  keys.forEach(key => {
    try {
      const value = localStorage.getItem(key)
      if (value) JSON.parse(value)
    } catch {
      localStorage.removeItem(key)
    }
  })
}
```

### Force Component Reload
```javascript
componentInventory.rebuildSearchIndex()
```

-- Claude Code @ 2025-01-08T18:40:45Z