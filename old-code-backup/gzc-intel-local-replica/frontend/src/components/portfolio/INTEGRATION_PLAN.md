# Portfolio Component Integration Plan

## Immediate Actions Required

### 1. Create Portfolio Adapter
This will handle the differences between the 3200 project and our 3500 architecture.

### 2. Component Structure
```
src/components/portfolio/
├── INTEGRATION_PLAN.md (this file)
├── PortfolioAdapter.tsx       # Main adapter component
├── PortfolioStandalone.tsx    # Admin tab version
├── PortfolioWidget.tsx        # Dynamic canvas version
├── PortfolioEmbedded.tsx      # Static canvas version
├── components/                 # Copied from 3200
│   ├── PortfolioMetrics.tsx
│   ├── PortfolioFilters.tsx
│   ├── PortfolioTable.tsx
│   └── BlotterTable.tsx
├── hooks/                      # Adapted hooks
│   ├── usePortfolioData.ts
│   └── useQuoteStream.ts
├── types/
│   └── portfolio.ts
└── contracts/
    └── PortfolioContract.ts    # Component contract
```

### 3. Authentication Strategy
- Development: Mock auth token
- Production: Integrate with actual auth system
- Use adapter pattern to isolate auth logic

### 4. Backend Requirements
```bash
# Start backend separately
cd /Users/mikaeleage/Projects\ Container/gzc-production-platform-vite/backend
python -m uvicorn app.main:app --reload --port 5000
```

### 5. Environment Configuration
```env
# .env.local
VITE_PORTFOLIO_API_URL=http://localhost:5000
VITE_PORTFOLIO_WS_URL=ws://localhost:5000/ws
VITE_PORTFOLIO_AUTH_MODE=development
```

## Next Steps
1. Copy portfolio components from 3200
2. Create adapter layer
3. Remove external dependencies
4. Implement mode-specific rendering
5. Test with mock data first
6. Connect to real backend
7. Add to component registry