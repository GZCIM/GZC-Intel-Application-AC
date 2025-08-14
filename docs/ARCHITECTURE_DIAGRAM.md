# GZC Intel Application - Complete Architecture Diagram

## System Architecture Overview

```mermaid
graph TB
    subgraph "User Layer"
        Browser[Browser<br/>React App]
    end

    subgraph "Azure Container Apps - Production"
        subgraph "Container App: gzc-intel-application-ac"
            Nginx[Nginx<br/>Port 80<br/>Reverse Proxy]
            MainGateway[Main Gateway<br/>FastAPI<br/>Port 5000]
            FSSBackend[FSS Backend<br/>Flask<br/>Port 5100]
            StaticFiles[Static Files<br/>React Build]
        end
        ManagedIdentity[System Assigned<br/>Managed Identity<br/>b7746c59-1dfa-4299...]
    end

    subgraph "Azure AD / Entra ID"
        AzureAD[Azure AD<br/>Tenant: 8274c97d...]
        AppReg[App Registration<br/>ClientID: a873f2d7...]
        MSALAuth[MSAL Authentication]
    end

    subgraph "Data Storage"
        CosmosDB[(Cosmos DB<br/>gzc-intel-app-config<br/>user-configurations)]
        PostgreSQL[(PostgreSQL<br/>gzc_intel DB<br/>Fallback Storage)]
        Redis[(Azure Redis<br/>Session Cache)]
    end

    subgraph "Kubernetes Cluster - AKS"
        K8sGateway[Bloomberg Gateway<br/>LoadBalancer<br/>52.149.235.82]
        K8sConfig[ConfigMap<br/>bloomberg-gateway-config]
        K8sSecret[Secret<br/>bloomberg-gateway-secrets]
    end

    subgraph "Bloomberg Infrastructure"
        BloombergVM[Bloomberg VM<br/>bloomberg-vm-02<br/>20.172.249.92:8080]
        Terminal[Bloomberg Terminal<br/>Windows VM]
        BloombergAPI[Bloomberg API Server<br/>real_bloomberg_api.py]
    end

    subgraph "WebSocket Streams"
        ESP[ESP WebSocket<br/>/ws_esp]
        RFS[RFS WebSocket<br/>/ws_rfs]
        Execution[Execution WebSocket<br/>/ws_execution]
    end

    %% User Authentication Flow
    Browser -->|1. Login Request| MSALAuth
    MSALAuth -->|2. Auth Code| AzureAD
    AzureAD -->|3. ID Token + Access Token| Browser
    Browser -->|4. Bearer Token| Nginx

    %% Main Application Flow
    Nginx -->|/api/*| MainGateway
    Nginx -->|/ws_*| FSSBackend
    Nginx -->|/*.html, *.js| StaticFiles
    Nginx -->|/api/bloomberg/*| K8sGateway

    %% Main Gateway Connections
    MainGateway -->|Managed Identity| ManagedIdentity
    ManagedIdentity -->|RBAC Access| CosmosDB
    ManagedIdentity -->|RBAC Access| PostgreSQL
    MainGateway -->|Validate Token| AppReg

    %% FSS Backend Connections
    FSSBackend --> ESP
    FSSBackend --> RFS
    FSSBackend --> Execution
    FSSBackend --> Redis

    %% K8s Bloomberg Gateway
    K8sGateway --> K8sConfig
    K8sGateway --> K8sSecret
    K8sGateway -->|HTTP Proxy| BloombergAPI

    %% Bloomberg Terminal Connection
    BloombergAPI --> Terminal
    Terminal -->|COM API| BloombergAPI

    style Browser fill:#e1f5fe
    style Nginx fill:#fff3e0
    style MainGateway fill:#f3e5f5
    style FSSBackend fill:#f3e5f5
    style CosmosDB fill:#e8f5e9
    style PostgreSQL fill:#e8f5e9
    style Redis fill:#e8f5e9
    style K8sGateway fill:#fff9c4
    style BloombergVM fill:#ffebee
    style AzureAD fill:#e3f2fd
    style ManagedIdentity fill:#e0f2f1
```

## Bloomberg Volatility Component - Detailed Data Flow

```mermaid
sequenceDiagram
    participant User as User Browser
    participant React as React Component<br/>VolatilityAnalysis.tsx
    participant Nginx as Nginx Proxy
    participant K8s as K8s Gateway<br/>52.149.235.82
    participant BBG as Bloomberg VM<br/>20.172.249.92:8080
    participant Terminal as Bloomberg Terminal

    Note over User,React: User adds Bloomberg Volatility component via Tools menu
    
    User->>React: Select currency pair (e.g., EURUSD)
    
    React->>React: Build ticker list<br/>[EURUSDV1W BGN Curncy,<br/>EURUSD25R1M BGN Curncy,<br/>EURUSD25B1M BGN Curncy...]
    
    React->>Nginx: POST /api/bloomberg/reference<br/>{securities: [...], fields: [PX_LAST]}
    
    Note over Nginx: Proxy rule: /api/bloomberg/* → K8s Gateway
    
    Nginx->>K8s: Forward request to LoadBalancer
    
    Note over K8s: K8s Gateway Service (v3)<br/>- Caching enabled (TTL: 900s)<br/>- Enhanced logging<br/>- Retry logic
    
    K8s->>BBG: POST /api/bloomberg/reference<br/>Authorization: Bearer test
    
    Note over BBG: Bloomberg API Server Process:<br/>1. Receive request<br/>2. Validate tickers<br/>3. Query Terminal via COM API
    
    BBG->>Terminal: blpapi.Session()<br/>RefDataRequest
    
    Terminal->>Terminal: Process tickers:<br/>- ATM: EURUSDV1M BGN<br/>- RR: EURUSD25R1M BGN<br/>- BF: EURUSD25B1M BGN
    
    Terminal-->>BBG: Market data response
    
    BBG-->>K8s: JSON response:<br/>{data: {securities_data: [...]}}
    
    Note over K8s: Cache response for 15 minutes
    
    K8s-->>Nginx: Nested JSON structure
    
    Nginx-->>React: Response with Bloomberg data
    
    React->>React: Parse nested structure:<br/>response.data.data.securities_data
    
    React->>React: Validate & transform data:<br/>- Filter null values<br/>- Calculate term structure<br/>- Build 3D surface mesh
    
    React->>User: Render charts:<br/>- 3D Volatility Surface<br/>- Smile Chart<br/>- Term Structure
```

## Authentication & Authorization Details

```mermaid
graph LR
    subgraph "Frontend Authentication"
        MSAL[MSAL.js<br/>localStorage]
        LoginFlow[Login Flow:<br/>1. Popup/Redirect<br/>2. Get ID Token<br/>3. Get Access Token]
        Scopes[Scopes:<br/>- User.Read<br/>- api://a873f2d7.../.default]
    end

    subgraph "Backend Authorization"
        JWT[JWT Validation<br/>validate_token()]
        Claims[Token Claims:<br/>- sub: user ID<br/>- email: user email<br/>- preferred_username]
        RBAC[RBAC Check:<br/>- Cosmos DB access<br/>- PostgreSQL access]
    end

    subgraph "Managed Identity"
        SystemID[System Assigned<br/>principalId: b7746c59...]
        DefaultCred[DefaultAzureCredential<br/>Auto-auth in Azure]
        Resources[Access to:<br/>- Cosmos DB<br/>- Key Vault<br/>- PostgreSQL]
    end

    MSAL --> LoginFlow
    LoginFlow --> Scopes
    Scopes -->|Bearer Token| JWT
    JWT --> Claims
    Claims --> RBAC
    
    SystemID --> DefaultCred
    DefaultCred --> Resources
```

## Component Memory Persistence

```mermaid
graph TD
    subgraph "User Action"
        AddComp[User adds Bloomberg<br/>Volatility Component]
        TabState[Tab State Updated]
    end

    subgraph "Frontend State Management"
        TabManager[TabLayoutManager.tsx]
        CosmosService[cosmosConfigService.ts]
        LocalStorage[localStorage Fallback]
    end

    subgraph "Backend Persistence"
        MainGateway[Main Gateway<br/>/api/cosmos/config]
        AuthCheck{Token Valid?}
        CosmosCtrl[cosmos_config_controller.py]
    end

    subgraph "Data Storage"
        CosmosDB[(Cosmos DB<br/>Document Structure:<br/>{<br/>  id: user-email,<br/>  tabs: [...],<br/>  layouts: [...],<br/>  preferences: {...}<br/>})]
        PostgreSQL[(PostgreSQL<br/>Fallback Tables:<br/>- user_preferences<br/>- user_sessions)]
    end

    AddComp --> TabState
    TabState --> TabManager
    TabManager --> CosmosService
    
    CosmosService -->|POST /api/cosmos/config| MainGateway
    MainGateway --> AuthCheck
    AuthCheck -->|Yes| CosmosCtrl
    AuthCheck -->|No| LocalStorage
    
    CosmosCtrl -->|Managed Identity| CosmosDB
    CosmosCtrl -->|Fallback| PostgreSQL
    
    CosmosDB -->|Cross-browser sync| TabManager
```

## Network Security & Routing

```yaml
Production URL: https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io

Nginx Routing Rules:
  /                    → Static React files
  /api/*              → Main Gateway (port 5000)
  /api/bloomberg/*    → K8s Gateway (52.149.235.82)
  /ws_esp             → FSS Backend WebSocket
  /ws_rfs             → FSS Backend WebSocket  
  /ws_execution       → FSS Backend WebSocket

Security Headers:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - Strict-Transport-Security: max-age=31536000
  - Content-Security-Policy: restrictive

CORS Configuration:
  - Allowed Origins: Production URL + localhost:3500/3501
  - Credentials: true
  - Methods: GET, POST, PUT, DELETE, OPTIONS
```

## Bloomberg Data Processing Pipeline

### 1. Ticker Construction (Frontend)
```javascript
// VolatilityAnalysis.tsx builds tickers:
const tenors = ['1W', '2W', '1M', '2M', '3M', '6M', '9M', '1Y']
const strikes = ['25R', 'ATM', '25B']  // Risk Reversal, At-The-Money, Butterfly

// Generated tickers for EURUSD:
EURUSDV1W BGN Curncy    // ATM 1 week
EURUSD25R1M BGN Curncy  // 25-delta risk reversal 1 month
EURUSD25B1M BGN Curncy  // 25-delta butterfly 1 month
```

### 2. K8s Gateway Processing
```python
# bloomberg-gateway service in K8s:
- Receives request at LoadBalancer IP
- Checks Redis cache (TTL: 900 seconds)
- If cache miss, forwards to Bloomberg VM
- Applies retry logic (3 attempts)
- Returns nested JSON structure
```

### 3. Bloomberg VM API Server
```python
# real_bloomberg_api.py on Windows VM:
@app.post("/api/bloomberg/reference")
async def get_reference_data(request: ReferenceDataRequest):
    # 1. Create Bloomberg session
    session = blpapi.Session()
    
    # 2. Open service
    session.openService("//blp/refdata")
    
    # 3. Create request
    request = service.createRequest("ReferenceDataRequest")
    
    # 4. Add securities and fields
    for security in securities:
        request.append("securities", security)
    for field in fields:
        request.append("fields", field)
    
    # 5. Send request and parse response
    session.sendRequest(request)
    
    # 6. Return structured data
    return {"data": {"securities_data": [...]}}
```

### 4. Data Validation & Transformation
```javascript
// DataValidator.ts validates response:
- Checks for nested structure: response.data?.data?.securities_data
- Validates each security has success: true
- Filters out null/undefined values
- Transforms to ValidatedVolatilityData interface

// VolatilityAnalysis.tsx processes data:
- Parses tenor strings (1W → 7 days, 1M → 30 days)
- Calculates volatility smile curves
- Builds 3D surface mesh for Plotly
- Generates term structure time series
```

## Deployment Pipeline

```mermaid
graph LR
    subgraph "Development"
        Code[Code Changes]
        Git[Git Push to<br/>component-state-refactor]
    end

    subgraph "GitHub Actions"
        Trigger[Workflow Triggered]
        Build[Build Frontend<br/>npm run build:skip-ts]
        Docker[Build Docker Image<br/>linux/amd64]
        Push[Push to ACR<br/>gzcacr.azurecr.io]
    end

    subgraph "Azure Deployment"
        Update[Update Container App<br/>gzc-intel-application-ac]
        Revision[New Revision<br/>v20250814-HHMMSS]
        Live[Live in Production]
    end

    Code --> Git
    Git --> Trigger
    Trigger --> Build
    Build --> Docker
    Docker --> Push
    Push --> Update
    Update --> Revision
    Revision --> Live
```

## Key Component Details

### Bloomberg Volatility Component
- **Location**: `/Main_Frontend/src/components/bloomberg-volatility/`
- **Main Files**:
  - `VolatilityAnalysis.tsx` - Main component with data fetching
  - `ResponsiveVolatilityAnalysis.tsx` - Grid-responsive wrapper
  - `PlotlyVolatilitySurface.tsx` - 3D surface visualization
  - `DataValidator.ts` - Response validation logic

### Supported Currency Pairs
- EURUSD, GBPUSD, USDJPY, AUDUSD, USDCHF, USDCAD, NZDUSD

### Data Update Frequency
- Manual refresh via UI button
- Cache TTL: 15 minutes (K8s Gateway)
- Real-time data from Bloomberg Terminal when available

### Error Handling
- Graceful fallback when Terminal offline
- Validation of all data points
- User-friendly error messages
- Automatic retry logic in K8s Gateway