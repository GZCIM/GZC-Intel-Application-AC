# GZC Intel App Documentation

## Project Overview

GZC Intel App combines the best features of Port 3000 (drag & drop dashboard) and Port 3200 (modular architecture) while maintaining the GZC Pro microservice backend architecture.

## Key Documents

### Architecture
- **[ARCHITECTURE_SOLUTION.md](./ARCHITECTURE_SOLUTION.md)** - Complete architectural solution with simplified frontend and microservice backend
- **[architecture_comparison.html](../architecture_comparison.html)** - Visual comparison of architectural approaches

### Setup Guides
- **[MICROSERVICES_SETUP.md](./MICROSERVICES_SETUP.md)** - Step-by-step guide to set up the microservice backend locally

### Key Decisions

1. **Frontend Simplification**: Removed collapse/expand to eliminate event conflicts
2. **Microservice Backend**: Maintained GZC Pro architecture for scalability
3. **Technology Stack**: React + Vite (frontend), Node.js + Express (backend), RabbitMQ (messaging)

## Quick Start

### Frontend (Port 3500)
```bash
cd gzc-intel
npm install
npm run dev
```

### Backend Services
```bash
# See MICROSERVICES_SETUP.md for detailed instructions
docker-compose up -d
npm run dev:all
```

## Architecture Summary

```
Frontend (Port 3500)          Backend Services
┌─────────────────┐          ┌─────────────────┐
│                 │          │  API Gateway    │
│  React Dashboard│◀────────▶│  (Port 4000)    │
│  - Drag & Drop  │          └────────┬────────┘
│  - Fullscreen   │                   │
│  - No Collapse  │          ┌────────▼────────┐
└─────────────────┘          │  Microservices  │
                             │  - Market Data   │
                             │  - Orders        │
                             │  - Portfolio     │
                             │  - Analytics     │
                             └─────────────────┘
```

## Development Status

- ✅ Architecture design complete
- ✅ Frontend components created (GridWidget, SimplifiedDashboard)
- ✅ API service layer defined
- ✅ Microservice setup documented
- 🔄 Integration in progress
- ⏳ Testing and deployment pending

---

*Last Updated: 2025-07-05*