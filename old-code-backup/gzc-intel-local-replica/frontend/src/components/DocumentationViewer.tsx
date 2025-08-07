import React, { useState, useEffect } from 'react';
import { theme } from '../theme';

// Declare mermaid on window
declare global {
  interface Window {
    mermaid: any;
  }
}

interface DocSection {
  title: string;
  content: React.ReactNode;
}

// Mermaid component for rendering diagrams
const MermaidDiagram: React.FC<{ chart: string; id: string }> = ({ chart, id }) => {
  return (
    <div 
      id={id}
      className="mermaid" 
      style={{ 
        textAlign: 'center', 
        margin: '20px 0',
        backgroundColor: 'transparent',
        border: `1px solid ${theme.border}`,
        borderRadius: '4px',
        padding: '20px',
        overflow: 'auto'
      }}
    >
      {chart}
    </div>
  );
};

const sections: DocSection[] = [
  {
    title: 'System Architecture',
    content: (
      <div>
        <p style={{ marginBottom: '20px', color: theme.textSecondary }}>
          GZC Intel App uses a single frontend interface (Port 3500) with a comprehensive microservice backend architecture.
        </p>
        <MermaidDiagram 
          id="system-architecture"
          chart={`
graph TB
    subgraph "Frontend Layer"
        P3500["Port 3500<br/>Single Frontend Interface"]
        
        style P3500 fill:#95BD7833,stroke:#95BD78,color:#f8f6f0
    end
    
    subgraph "API Gateway Layer"
        Gateway["API Gateway<br/>:4000<br/>Request Routing"]
        Auth["Authentication<br/>Service"]
        RateLimit["Rate Limiting<br/>Service"]
        
        style Gateway fill:#A8CC8833,stroke:#A8CC88,color:#f8f6f0
        style Auth fill:#A8CC8833,stroke:#A8CC88,color:#f8f6f0
        style RateLimit fill:#A8CC8833,stroke:#A8CC88,color:#f8f6f0
    end
    
    subgraph "Microservices Layer"
        MarketService["Market Data Service<br/>:4001"]
        OrderService["Order Management<br/>:4002"]
        PortfolioService["Portfolio Service<br/>:4003"]
        AnalyticsService["Analytics Service<br/>:4004"]
        NotificationService["Notification Service<br/>:4005"]
        
        style MarketService fill:#95BD7833,stroke:#95BD78,color:#f8f6f0
        style OrderService fill:#95BD7833,stroke:#95BD78,color:#f8f6f0
        style PortfolioService fill:#95BD7833,stroke:#95BD78,color:#f8f6f0
        style AnalyticsService fill:#95BD7833,stroke:#95BD78,color:#f8f6f0
        style NotificationService fill:#95BD7833,stroke:#95BD78,color:#f8f6f0
    end
    
    subgraph "Message Bus"
        EventBus["RabbitMQ<br/>Event Bus<br/>:5672"]
        
        style EventBus fill:#95BD7866,stroke:#95BD78,color:#f8f6f0
    end
    
    subgraph "Data Layer"
        MarketDB[("Market DB<br/>PostgreSQL")]
        OrderDB[("Order DB<br/>PostgreSQL")]
        PortfolioDB[("Portfolio DB<br/>PostgreSQL")]
        AnalyticsDB[("Analytics DB<br/>PostgreSQL")]
        Cache[("Redis Cache<br/>:6379")]
        
        style MarketDB fill:#25232133,stroke:#95BD78,color:#f8f6f0
        style OrderDB fill:#25232133,stroke:#95BD78,color:#f8f6f0
        style PortfolioDB fill:#25232133,stroke:#95BD78,color:#f8f6f0
        style AnalyticsDB fill:#25232133,stroke:#95BD78,color:#f8f6f0
        style Cache fill:#25232133,stroke:#95BD78,color:#f8f6f0
    end
    
    P3500 --> Gateway
    
    Gateway --> Auth
    Gateway --> RateLimit
    Gateway --> MarketService
    Gateway --> OrderService
    Gateway --> PortfolioService
    Gateway --> AnalyticsService
    
    MarketService --> EventBus
    OrderService --> EventBus
    PortfolioService --> EventBus
    AnalyticsService --> EventBus
    NotificationService --> EventBus
    
    MarketService --> MarketDB
    MarketService --> Cache
    OrderService --> OrderDB
    PortfolioService --> PortfolioDB
    AnalyticsService --> AnalyticsDB
          `}
        />
      </div>
    )
  },
  {
    title: 'Frontend Architecture Issues',
    content: (
      <div>
        <p style={{ marginBottom: '20px', color: theme.textSecondary }}>
          Port 3500 attempted to combine features from Port 3000 and Port 3200, resulting in technical conflicts.
        </p>
        <MermaidDiagram 
          id="frontend-conflicts"
          chart={`
graph TB
    P3000["Port 3000<br/>Analytics Dashboard"]
    P3200["Port 3200<br/>Trading Interface"] 
    P3500["Port 3500<br/>Combined Interface"]
    
    RGL["React Grid Layout<br/>Grid Management"]
    RDnD["React DnD<br/>Drag Operations"]
    CC["Collapse Components<br/>Click Events"]
    
    FastAPI["FastAPI Backend<br/>:8000"]
    DB[("Database<br/>Storage")]
    
    EventConflict["Event System<br/>Conflicts"]
    
    P3000 --> FastAPI
    P3200 --> FastAPI
    P3500 --> FastAPI
    
    P3500 --> RGL
    P3500 --> RDnD
    P3500 --> CC
    
    RGL --> EventConflict
    RDnD --> EventConflict
    CC --> EventConflict
    
    FastAPI --> DB
    
    style P3000 fill:#95BD7833,stroke:#95BD78,color:#f8f6f0
    style P3200 fill:#95BD7833,stroke:#95BD78,color:#f8f6f0
    style P3500 fill:#D69A8233,stroke:#D69A82,color:#f8f6f0
    style RGL fill:#D69A8233,stroke:#D69A82,color:#f8f6f0
    style RDnD fill:#D69A8233,stroke:#D69A82,color:#f8f6f0
    style CC fill:#D69A8233,stroke:#D69A82,color:#f8f6f0
    style EventConflict fill:#D69A8266,stroke:#D69A82,color:#f8f6f0
    style FastAPI fill:#95BD7833,stroke:#95BD78,color:#f8f6f0
    style DB fill:#25232133,stroke:#95BD78,color:#f8f6f0
          `}
        />
        <div style={{
          backgroundColor: 'transparent',
          border: `1px solid ${theme.danger}`,
          borderRadius: '4px',
          padding: '16px',
          marginTop: '20px'
        }}>
          <h4 style={{ marginBottom: '8px', color: theme.danger }}>Technical Debt</h4>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>Three competing event systems causing UI freezes</li>
            <li>Incompatible library requirements</li>
            <li>Complex state management conflicts</li>
            <li>Performance degradation from event handler overhead</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    title: 'Service Communication',
    content: (
      <div>
        <p style={{ marginBottom: '20px', color: theme.textSecondary }}>
          Event-driven architecture using RabbitMQ for service communication.
        </p>
        <MermaidDiagram 
          id="service-communication"
          chart={`
sequenceDiagram
    participant UI as Frontend
    participant GW as API Gateway
    participant MS as Market Service
    participant OS as Order Service
    participant PS as Portfolio Service
    participant EB as Event Bus
    participant DB as Database
    
    UI->>GW: Place Order Request
    GW->>OS: Forward Order
    OS->>DB: Store Order
    OS->>EB: Publish OrderPlaced
    EB->>PS: Notify Portfolio
    EB->>MS: Update Market Data
    PS->>DB: Update Positions
    MS->>EB: Publish PriceUpdate
    EB->>UI: WebSocket Update
    
    Note over UI,DB: Asynchronous event-driven flow
          `}
        />
      </div>
    )
  },
  {
    title: 'Data Flow Architecture',
    content: (
      <div>
        <p style={{ marginBottom: '20px', color: theme.textSecondary }}>
          Real-time data flow from external sources through microservices to frontend.
        </p>
        <MermaidDiagram 
          id="data-flow"
          chart={`
graph LR
    subgraph "External Sources"
        MarketFeed["Market Data<br/>Feeds"]
        Exchange["Exchange<br/>APIs"]
        News["News<br/>Sources"]
        
        style MarketFeed fill:#95BD7833,stroke:#95BD78,color:#f8f6f0
        style Exchange fill:#95BD7833,stroke:#95BD78,color:#f8f6f0
        style News fill:#95BD7833,stroke:#95BD78,color:#f8f6f0
    end
    
    subgraph "Ingestion Layer"
        DataCollector["Data Collector<br/>Service"]
        Normalizer["Data Normalizer<br/>Service"]
        
        style DataCollector fill:#A8CC8833,stroke:#A8CC88,color:#f8f6f0
        style Normalizer fill:#A8CC8833,stroke:#A8CC88,color:#f8f6f0
    end
    
    subgraph "Processing"
        StreamProcessor["Stream<br/>Processor"]
        Analytics["Analytics<br/>Engine"]
        
        style StreamProcessor fill:#95BD7833,stroke:#95BD78,color:#f8f6f0
        style Analytics fill:#95BD7833,stroke:#95BD78,color:#f8f6f0
    end
    
    subgraph "Distribution"
        WebSocket["WebSocket<br/>Server"]
        REST["REST API<br/>Endpoints"]
        
        style WebSocket fill:#A8CC8833,stroke:#A8CC88,color:#f8f6f0
        style REST fill:#A8CC8833,stroke:#A8CC88,color:#f8f6f0
    end
    
    MarketFeed --> DataCollector
    Exchange --> DataCollector
    News --> DataCollector
    DataCollector --> Normalizer
    Normalizer --> StreamProcessor
    StreamProcessor --> Analytics
    Analytics --> WebSocket
    Analytics --> REST
          `}
        />
      </div>
    )
  },
  {
    title: 'Deployment Architecture',
    content: (
      <div>
        <p style={{ marginBottom: '20px', color: theme.textSecondary }}>
          Container-based deployment using Docker and Kubernetes orchestration.
        </p>
        <MermaidDiagram 
          id="deployment"
          chart={`
graph TB
    subgraph "Kubernetes Cluster"
        subgraph "Frontend Pods"
            FP1["Frontend<br/>Replica 1"]
            FP2["Frontend<br/>Replica 2"]
            FP3["Frontend<br/>Replica 3"]
            
            style FP1 fill:#95BD7833,stroke:#95BD78,color:#f8f6f0
            style FP2 fill:#95BD7833,stroke:#95BD78,color:#f8f6f0
            style FP3 fill:#95BD7833,stroke:#95BD78,color:#f8f6f0
        end
        
        subgraph "Service Pods"
            SP1["Market Service<br/>Pod"]
            SP2["Order Service<br/>Pod"]
            SP3["Portfolio Service<br/>Pod"]
            
            style SP1 fill:#A8CC8833,stroke:#A8CC88,color:#f8f6f0
            style SP2 fill:#A8CC8833,stroke:#A8CC88,color:#f8f6f0
            style SP3 fill:#A8CC8833,stroke:#A8CC88,color:#f8f6f0
        end
        
        subgraph "Infrastructure"
            LB["Load Balancer"]
            IG["Ingress Controller"]
            SM["Service Mesh"]
            
            style LB fill:#95BD7866,stroke:#95BD78,color:#f8f6f0
            style IG fill:#95BD7866,stroke:#95BD78,color:#f8f6f0
            style SM fill:#95BD7866,stroke:#95BD78,color:#f8f6f0
        end
    end
    
    subgraph "External Services"
        CDN["CDN<br/>Static Assets"]
        Monitor["Monitoring<br/>Prometheus"]
        Log["Logging<br/>ELK Stack"]
        
        style CDN fill:#25232133,stroke:#95BD78,color:#f8f6f0
        style Monitor fill:#25232133,stroke:#95BD78,color:#f8f6f0
        style Log fill:#25232133,stroke:#95BD78,color:#f8f6f0
    end
    
    LB --> IG
    IG --> FP1
    IG --> FP2
    IG --> FP3
    FP1 --> SM
    FP2 --> SM
    FP3 --> SM
    SM --> SP1
    SM --> SP2
    SM --> SP3
          `}
        />
      </div>
    )
  },
  {
    title: 'Current Status',
    content: (
      <div>
        <h4 style={{ marginBottom: '16px' }}>Implementation Progress</h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            backgroundColor: 'transparent',
            border: `1px solid ${theme.border}`,
            borderRadius: '4px',
            padding: '16px'
          }}>
            <h5 style={{ color: theme.success, marginBottom: '8px' }}>Completed</h5>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px' }}>
              <li>Microservice architecture design</li>
              <li>API Gateway implementation</li>
              <li>Database schema design</li>
              <li>Basic service scaffolding</li>
            </ul>
          </div>
          <div style={{
            backgroundColor: 'transparent',
            border: `1px solid ${theme.border}`,
            borderRadius: '4px',
            padding: '16px'
          }}>
            <h5 style={{ color: theme.warning, marginBottom: '8px' }}>In Progress</h5>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px' }}>
              <li>Frontend simplification</li>
              <li>Service integration</li>
              <li>Event bus configuration</li>
              <li>WebSocket implementation</li>
            </ul>
          </div>
          <div style={{
            backgroundColor: 'transparent',
            border: `1px solid ${theme.border}`,
            borderRadius: '4px',
            padding: '16px'
          }}>
            <h5 style={{ color: theme.danger, marginBottom: '8px' }}>Pending</h5>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px' }}>
              <li>Performance optimization</li>
              <li>Security hardening</li>
              <li>Monitoring setup</li>
              <li>Production deployment</li>
            </ul>
          </div>
        </div>
        <div style={{
          backgroundColor: 'transparent',
          border: `1px solid ${theme.warning}`,
          borderRadius: '4px',
          padding: '16px'
        }}>
          <h4 style={{ marginBottom: '8px', color: theme.warning }}>Architecture Decision</h4>
          <p style={{ margin: 0 }}>
            Due to event system conflicts in Port 3500, the collapse/expand feature was removed 
            to enable drag & drop functionality. This represents a downgrade in UI capabilities 
            but was necessary to achieve system stability.
          </p>
        </div>
      </div>
    )
  },
  {
    title: 'API Documentation',
    content: (
      <div>
        <h4 style={{ marginBottom: '16px' }}>Service Endpoints</h4>
        <div style={{
          backgroundColor: 'transparent',
          border: `1px solid ${theme.border}`,
          borderRadius: '4px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <h5 style={{ color: theme.primary, marginBottom: '12px' }}>Market Service API</h5>
          <pre style={{
            backgroundColor: 'transparent',
            padding: '12px',
            borderRadius: '4px',
            fontSize: '11px',
            overflow: 'auto'
          }}>
{`GET    /api/market/data              # Market overview
POST   /api/market/quotes            # Get quotes for symbols
GET    /api/market/historical/:symbol # Historical data
POST   /api/market/subscribe         # Real-time subscription
GET    /api/market/orderbook/:symbol # Order book data`}
          </pre>
        </div>
        <div style={{
          backgroundColor: 'transparent',
          border: `1px solid ${theme.border}`,
          borderRadius: '4px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <h5 style={{ color: theme.primary, marginBottom: '12px' }}>Order Service API</h5>
          <pre style={{
            backgroundColor: 'transparent',
            padding: '12px',
            borderRadius: '4px',
            fontSize: '11px',
            overflow: 'auto'
          }}>
{`GET    /api/orders                   # Active orders
GET    /api/orders/history           # Order history
POST   /api/orders                   # Place order
DELETE /api/orders/:id               # Cancel order
GET    /api/orders/status/:id        # Order status`}
          </pre>
        </div>
        <div style={{
          backgroundColor: 'transparent',
          border: `1px solid ${theme.border}`,
          borderRadius: '4px',
          padding: '16px'
        }}>
          <h5 style={{ color: theme.primary, marginBottom: '12px' }}>Portfolio Service API</h5>
          <pre style={{
            backgroundColor: 'transparent',
            padding: '12px',
            borderRadius: '4px',
            fontSize: '11px',
            overflow: 'auto'
          }}>
{`GET    /api/portfolio/positions      # Current positions
GET    /api/portfolio/balance        # Account balance
GET    /api/portfolio/pnl            # P&L metrics
GET    /api/portfolio/risk           # Risk analysis
GET    /api/portfolio/performance    # Performance data`}
          </pre>
        </div>
      </div>
    )
  }
];

export const DocumentationViewer: React.FC = () => {
  const [activeSection, setActiveSection] = useState(0);
  const [mermaidLoaded, setMermaidLoaded] = useState(false);

  useEffect(() => {
    // Load Mermaid library
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
    script.async = true;
    script.onload = () => {
      window.mermaid.initialize({ 
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          primaryColor: '#95BD78',
          primaryTextColor: '#f8f6f0',
          primaryBorderColor: '#95BD78',
          lineColor: '#95BD78',
          secondaryColor: '#A8CC88',
          tertiaryColor: '#252321',
          background: '#1a1918',
          mainBkg: '#95BD7833',
          secondBkg: '#A8CC8833',
          tertiaryBkg: '#25232133',
          primaryBorderColor: '#95BD78',
          secondaryBorderColor: '#A8CC88',
          tertiaryBorderColor: '#3a3632',
          textColor: '#f8f6f0',
          nodeTextColor: '#f8f6f0',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '12px',
          darkMode: true,
          clusterBkg: '#1a191866',
          clusterBorder: '#95BD7866'
        }
      });
      setMermaidLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Re-render Mermaid diagrams when section changes
  useEffect(() => {
    if (mermaidLoaded && window.mermaid) {
      // Clear existing rendered diagrams
      document.querySelectorAll('.mermaid-processed').forEach(el => {
        el.classList.remove('mermaid-processed');
        el.removeAttribute('data-processed');
      });
      
      // Re-render all mermaid elements
      setTimeout(() => {
        window.mermaid.run();
      }, 100);
    }
  }, [activeSection, mermaidLoaded]);

  return (
    <div style={{
      minHeight: 'calc(100vh - 120px)',
      padding: '20px',
      color: theme.text
    }}>
      <h1 style={{
        fontSize: theme.typography.h1.fontSize,
        fontWeight: theme.typography.h1.fontWeight,
        marginBottom: '24px',
        color: theme.text
      }}>
        GZC Intel App - Project Documentation
      </h1>

      <div style={{
        display: 'flex',
        gap: '20px',
        height: 'calc(100vh - 200px)'
      }}>
        {/* Navigation */}
        <div style={{
          width: '250px',
          backgroundColor: 'transparent',
          borderRadius: '4px',
          border: `1px solid ${theme.border}`,
          padding: '12px',
          overflow: 'auto'
        }}>
          <h3 style={{
            fontSize: theme.typography.h3.fontSize,
            fontWeight: theme.typography.h3.fontWeight,
            marginBottom: '12px',
            color: theme.textSecondary
          }}>
            Table of Contents
          </h3>
          {sections.map((section, index) => (
            <div
              key={index}
              onClick={() => setActiveSection(index)}
              style={{
                padding: '8px 12px',
                marginBottom: '4px',
                borderRadius: '2px',
                cursor: 'pointer',
                backgroundColor: activeSection === index ? 'rgba(149, 189, 120, 0.2)' : 'transparent',
                borderLeft: activeSection === index ? `3px solid ${theme.primary}` : '3px solid transparent',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (activeSection !== index) {
                  e.currentTarget.style.backgroundColor = 'rgba(149, 189, 120, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeSection !== index) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {section.title}
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          backgroundColor: 'transparent',
          borderRadius: '4px',
          border: `1px solid ${theme.border}`,
          padding: '24px',
          overflow: 'auto'
        }}>
          <h2 style={{
            fontSize: theme.typography.h2.fontSize,
            fontWeight: theme.typography.h2.fontWeight,
            marginBottom: '16px',
            color: theme.text
          }}>
            {sections[activeSection].title}
          </h2>
          <div style={{
            fontSize: theme.typography.body.fontSize,
            lineHeight: 1.6
          }}>
            {sections[activeSection].content}
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '24px',
        padding: '12px',
        backgroundColor: 'transparent',
        borderRadius: '4px',
        border: `1px solid ${theme.border}`,
        textAlign: 'center',
        fontSize: theme.typography.bodySmall.fontSize,
        color: theme.textSecondary
      }}>
        Last Updated: 2025-07-05 | Version: 1.0.0 | Status: Development
      </div>
    </div>
  );
};