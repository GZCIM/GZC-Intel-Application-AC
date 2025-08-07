# Container Architecture Proposal

## Overview

Separating frontend rendering and backend services into containerized components for better scalability and isolation.

## Proposed Architecture

```yaml
version: '3.8'

services:
  # Frontend Container
  frontend:
    build: ./frontend
    container_name: gzc-intel-frontend
    ports:
      - "3500:80"
    environment:
      - REACT_APP_API_GATEWAY=http://api-gateway:4000
    depends_on:
      - api-gateway
    networks:
      - gzc-network

  # API Gateway Container
  api-gateway:
    build: ./api-gateway
    container_name: gzc-api-gateway
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
    networks:
      - gzc-network
    depends_on:
      - market-service
      - order-service
      - portfolio-service

  # Microservices Containers
  market-service:
    build: ./services/market-service
    container_name: gzc-market-service
    environment:
      - DATABASE_URL=postgresql://postgres:password@market-db:5432/market
      - RABBITMQ_URL=amqp://rabbitmq:5672
    networks:
      - gzc-network
    depends_on:
      - market-db
      - rabbitmq

  order-service:
    build: ./services/order-service
    container_name: gzc-order-service
    environment:
      - DATABASE_URL=postgresql://postgres:password@order-db:5432/orders
      - RABBITMQ_URL=amqp://rabbitmq:5672
    networks:
      - gzc-network
    depends_on:
      - order-db
      - rabbitmq

  portfolio-service:
    build: ./services/portfolio-service
    container_name: gzc-portfolio-service
    environment:
      - DATABASE_URL=postgresql://postgres:password@portfolio-db:5432/portfolio
      - RABBITMQ_URL=amqp://rabbitmq:5672
    networks:
      - gzc-network
    depends_on:
      - portfolio-db
      - rabbitmq

  # Message Bus
  rabbitmq:
    image: rabbitmq:3.11-management
    container_name: gzc-rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    networks:
      - gzc-network

  # Databases
  market-db:
    image: postgres:14
    container_name: gzc-market-db
    environment:
      - POSTGRES_DB=market
      - POSTGRES_PASSWORD=password
    volumes:
      - market-data:/var/lib/postgresql/data
    networks:
      - gzc-network

  order-db:
    image: postgres:14
    container_name: gzc-order-db
    environment:
      - POSTGRES_DB=orders
      - POSTGRES_PASSWORD=password
    volumes:
      - order-data:/var/lib/postgresql/data
    networks:
      - gzc-network

  portfolio-db:
    image: postgres:14
    container_name: gzc-portfolio-db
    environment:
      - POSTGRES_DB=portfolio
      - POSTGRES_PASSWORD=password
    volumes:
      - portfolio-data:/var/lib/postgresql/data
    networks:
      - gzc-network

  # Cache
  redis:
    image: redis:7-alpine
    container_name: gzc-redis
    ports:
      - "6379:6379"
    networks:
      - gzc-network

networks:
  gzc-network:
    driver: bridge

volumes:
  market-data:
  order-data:
  portfolio-data:
```

## Benefits

1. **Isolation**: Each service runs in its own container
2. **Scalability**: Can scale individual services based on load
3. **Development**: Developers can work on services independently
4. **Deployment**: Easy to deploy with container orchestration
5. **Consistency**: Same environment from dev to production

## Frontend Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Backend Service Dockerfile

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4001
CMD ["node", "src/index.js"]
```

## Development Workflow

```bash
# Start all services
docker-compose up -d

# Start only frontend for development
docker-compose up frontend

# Rebuild and restart a service
docker-compose up -d --build market-service

# View logs
docker-compose logs -f market-service

# Scale a service
docker-compose up -d --scale order-service=3
```

## Service Communication

- Frontend → API Gateway (HTTP/WebSocket)
- API Gateway → Microservices (HTTP)
- Microservices → RabbitMQ (AMQP)
- Microservices → Databases (PostgreSQL)
- All services → Redis (Cache)

This architecture provides clear separation between frontend presentation and backend logic while maintaining the microservice benefits.