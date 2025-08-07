# GZC Intel App - Microservices Setup Guide

## Overview

This guide explains how to set up the GZC Pro microservice architecture for local development.

## Architecture Components

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React Frontend │────▶│   API Gateway    │────▶│  Microservices  │
│   (Port 3500)   │     │   (Port 4000)    │     │  (Ports 4001+)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │   RabbitMQ Bus   │
                        │   (Port 5672)    │
                        └──────────────────┘
```

## Quick Start

### Prerequisites

- Node.js v18+
- Docker & Docker Compose
- PostgreSQL 14+
- RabbitMQ 3.11+

### 1. Clone Microservices Repository

```bash
# Clone the GZC Pro microservices (if separate repo)
git clone [gzc-pro-microservices-repo]
cd gzc-pro-microservices

# Or navigate to microservices directory if monorepo
cd ../gzc-pro/microservices
```

### 2. Start Infrastructure Services

```bash
# Start PostgreSQL and RabbitMQ using Docker Compose
docker-compose up -d postgres rabbitmq
```

### 3. Environment Configuration

Create `.env` files for each service:

#### API Gateway (.env)
```env
PORT=4000
NODE_ENV=development
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3500
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

#### Market Service (.env)
```env
PORT=4001
DATABASE_URL=postgresql://user:password@localhost:5432/market_db
RABBITMQ_URL=amqp://localhost:5672
CACHE_TTL=30
```

#### Order Service (.env)
```env
PORT=4002
DATABASE_URL=postgresql://user:password@localhost:5432/order_db
RABBITMQ_URL=amqp://localhost:5672
```

#### Portfolio Service (.env)
```env
PORT=4003
DATABASE_URL=postgresql://user:password@localhost:5432/portfolio_db
RABBITMQ_URL=amqp://localhost:5672
```

### 4. Install Dependencies

```bash
# Install dependencies for all services
npm run install:all

# Or manually for each service
cd api-gateway && npm install
cd ../market-service && npm install
cd ../order-service && npm install
cd ../portfolio-service && npm install
```

### 5. Database Setup

```bash
# Run migrations for all services
npm run migrate:all

# Or individually
cd market-service && npm run migrate
cd ../order-service && npm run migrate
cd ../portfolio-service && npm run migrate
```

### 6. Start Services

```bash
# Start all services in development mode
npm run dev:all

# Or start individually in separate terminals
cd api-gateway && npm run dev
cd market-service && npm run dev
cd order-service && npm run dev
cd portfolio-service && npm run dev
```

## Service Endpoints

### API Gateway Routes

```javascript
// Market Service Routes
GET    /api/market/data          // Get market overview
POST   /api/market/quotes        // Get quotes for symbols
GET    /api/market/historical/:symbol  // Historical data
POST   /api/market/subscribe     // Subscribe to real-time

// Order Service Routes  
GET    /api/orders               // Get active orders
GET    /api/orders/history       // Order history
POST   /api/orders               // Place new order
DELETE /api/orders/:id           // Cancel order
GET    /api/orders/book/:symbol  // Order book

// Portfolio Service Routes
GET    /api/portfolio/positions  // Current positions
GET    /api/portfolio/balance    // Account balance
GET    /api/portfolio/pnl        // P&L metrics
GET    /api/portfolio/risk       // Risk metrics
```

## Frontend Integration

### 1. Update Frontend Environment

```bash
# In the React app directory
cd gzc-intel

# Create/update .env.local
echo "VITE_API_GATEWAY_URL=http://localhost:4000" > .env.local
```

### 2. Test Connection

```javascript
// In your React app
import { healthCheck } from './services/api';

// Test the connection
healthCheck().then(status => {
  console.log('Service Status:', status);
});
```

## Development Workflow

### Running Tests

```bash
# Run all service tests
npm run test:all

# Run specific service tests
cd market-service && npm test
```

### Monitoring Services

```bash
# Check service health
curl http://localhost:4000/health

# View RabbitMQ management
open http://localhost:15672

# Check service logs
docker-compose logs -f [service-name]
```

### Common Issues

#### Port Conflicts
```bash
# Check if ports are in use
lsof -i :4000-4003

# Kill processes if needed
kill -9 [PID]
```

#### Database Connection Issues
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Test connection
psql -h localhost -U user -d market_db
```

#### RabbitMQ Connection Issues
```bash
# Check RabbitMQ status
docker exec rabbitmq rabbitmqctl status

# Reset RabbitMQ if needed
docker-compose restart rabbitmq
```

## Production Considerations

### Docker Deployment

```dockerfile
# Example Dockerfile for a service
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4001
CMD ["node", "src/index.js"]
```

### Environment Variables

```yaml
# docker-compose.prod.yml
services:
  market-service:
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - RABBITMQ_URL=${RABBITMQ_URL}
```

### Health Checks

```javascript
// Each service should implement
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'market-service',
    timestamp: new Date().toISOString()
  });
});
```

## Troubleshooting

### Service Discovery Issues

If services can't find each other:

1. Check network configuration
2. Verify service registration
3. Check API Gateway routing

### Performance Issues

1. Enable service metrics
2. Check database query performance
3. Monitor RabbitMQ queue sizes
4. Review service logs for bottlenecks

---

*Document created: 2025-07-05*  
*Status: Development Setup Guide*