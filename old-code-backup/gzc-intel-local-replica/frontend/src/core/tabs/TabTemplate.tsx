// Enhanced Tab Template System
// Content-agnostic tabs with component links and layout management

import React from 'react'

// Tab Template Types
export interface TabTemplate {
  id: string
  name: string
  icon: string
  description?: string
  componentLink?: ComponentLink
  layout?: TabLayout
  scope: 'user' | 'global'
  createdBy: string
  createdAt: string
  updatedAt: string
  tags?: string[]
  metadata?: Record<string, any>
}

// Component Link - Reference to component in registry or external service
export interface ComponentLink {
  type: 'registry' | 'external' | 'k8s'
  componentId: string
  endpoint?: string // For external/k8s components
  namespace?: string // For k8s components
  service?: string // For k8s service name
  port?: number // For external services
  path?: string // URL path for component
  authentication?: AuthConfig
  healthCheck?: HealthCheckConfig
  metadata?: ComponentMetadata
}

// Authentication configuration for external components
export interface AuthConfig {
  type: 'none' | 'bearer' | 'basic' | 'oauth' | 'custom'
  tokenEndpoint?: string
  credentials?: Record<string, string>
  headers?: Record<string, string>
}

// Health check configuration
export interface HealthCheckConfig {
  enabled: boolean
  endpoint: string
  interval: number // milliseconds
  timeout: number // milliseconds
  retries: number
}

// Component metadata
export interface ComponentMetadata {
  name: string
  version: string
  description: string
  category: string
  tags: string[]
  author: string
  documentation?: string
  repository?: string
  issues?: string
  dependencies?: string[]
  environment?: Record<string, string>
}

// Tab Layout configuration
export interface TabLayout {
  width?: string | number
  height?: string | number
  position?: 'center' | 'left' | 'right' | 'top' | 'bottom'
  resizable?: boolean
  scrollable?: boolean
  customCSS?: string
  containerProps?: Record<string, any>
}

// Layout Collection - Named collection of tabs
export interface LayoutCollection {
  id: string
  name: string
  description?: string
  tabs: TabTemplate[]
  scope: 'user' | 'global'
  createdBy: string
  createdAt: string
  updatedAt: string
  version: string
  tags?: string[]
  thumbnail?: string // Base64 screenshot or icon
}

// Component Registry Entry
export interface ComponentRegistryEntry {
  id: string
  name: string
  description: string
  category: string
  type: 'local' | 'container' | 'k8s'
  
  // Local components (bundled with app)
  componentPath?: string
  
  // Container app components
  containerImage?: string
  containerPort?: number
  
  // K8s components  
  k8sConfig?: K8sComponentConfig
  
  // Common metadata
  version: string
  author: string
  tags: string[]
  icon: string
  documentation?: string
  healthCheck?: HealthCheckConfig
  authentication?: AuthConfig
  environment?: Record<string, string>
  dependencies?: string[]
  
  // Runtime status
  status: 'available' | 'loading' | 'error' | 'unavailable'
  lastHealthCheck?: string
  errorMessage?: string
}

// Kubernetes component configuration
export interface K8sComponentConfig {
  namespace: string
  service: string
  port: number
  protocol: 'http' | 'https' | 'ws' | 'wss'
  path?: string
  ingress?: string
  cluster?: string
  context?: string
}

// Tab Controller Interface - Main management interface
export interface TabController {
  // Tab Template Management
  createTemplate(template: Omit<TabTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<TabTemplate>
  updateTemplate(id: string, updates: Partial<TabTemplate>): Promise<TabTemplate>
  deleteTemplate(id: string): Promise<boolean>
  getTemplate(id: string): Promise<TabTemplate | null>
  listTemplates(scope?: 'user' | 'global', createdBy?: string): Promise<TabTemplate[]>
  
  // Layout Management
  saveLayout(name: string, tabs: TabTemplate[], scope: 'user' | 'global'): Promise<LayoutCollection>
  loadLayout(id: string): Promise<LayoutCollection | null>
  deleteLayout(id: string): Promise<boolean>
  listLayouts(scope?: 'user' | 'global'): Promise<LayoutCollection[]>
  duplicateLayout(id: string, newName: string, scope: 'user' | 'global'): Promise<LayoutCollection>
  
  // Component Registry Management
  registerComponent(component: Omit<ComponentRegistryEntry, 'id' | 'status'>): Promise<ComponentRegistryEntry>
  updateComponent(id: string, updates: Partial<ComponentRegistryEntry>): Promise<ComponentRegistryEntry>
  unregisterComponent(id: string): Promise<boolean>
  getComponent(id: string): Promise<ComponentRegistryEntry | null>
  listComponents(category?: string, type?: string): Promise<ComponentRegistryEntry[]>
  healthCheckComponent(id: string): Promise<boolean>
  
  // Tab Runtime Management
  openTab(template: TabTemplate): Promise<string> // Returns tab instance ID
  closeTab(instanceId: string): Promise<boolean>
  reloadTab(instanceId: string): Promise<boolean>
  getTabStatus(instanceId: string): Promise<TabStatus>
}

// Tab Runtime Status
export interface TabStatus {
  instanceId: string
  templateId: string
  status: 'loading' | 'active' | 'error' | 'suspended'
  componentStatus: 'connected' | 'disconnected' | 'error'
  lastActivity: string
  errorMessage?: string
  performanceMetrics?: PerformanceMetrics
}

// Performance metrics for tab monitoring
export interface PerformanceMetrics {
  loadTime: number
  memoryUsage: number
  cpuUsage: number
  networkRequests: number
  errorCount: number
  lastUpdated: string
}

// Default component registry entries for local components
export const DEFAULT_COMPONENT_REGISTRY: ComponentRegistryEntry[] = [
  // Test Components
  {
    id: 'TestDashboard',
    name: 'Test Dashboard',
    description: 'Test dashboard for verifying tab system functionality',
    category: 'test',
    type: 'local',
    componentPath: '../../components/TestDashboard',
    version: '1.0.0',
    author: 'GZC Intel Team',
    tags: ['test', 'dashboard'],
    icon: 'activity',
    status: 'available'
  },
  // Dashboard Components
  {
    id: 'main-dashboard',
    name: 'Main Dashboard',
    description: 'Primary analytical dashboard with market overview and key metrics',
    category: 'dashboard',
    type: 'local',
    componentPath: '../../pages/Dashboard',
    version: '1.0.0',
    author: 'GZC Intel Team',
    tags: ['dashboard', 'analytics', 'overview'],
    icon: '📊',
    status: 'available'
  },
  
  // Trading Components
  {
    id: 'portfolio-manager',
    name: 'Portfolio Manager',
    description: 'Comprehensive portfolio management and position tracking',
    category: 'trading',
    type: 'local',
    componentPath: '../../modules/portfolio/Portfolio',
    version: '1.2.0',
    author: 'Alex Architecture',
    tags: ['trading', 'portfolio', 'positions'],
    icon: '💼',
    status: 'available'
  },
  {
    id: 'trading-terminal',
    name: 'Trading Terminal',
    description: 'Real-time trading interface with execution capabilities',
    category: 'trading',
    type: 'local',
    componentPath: '../../modules/trading/App',
    version: '1.1.0',
    author: 'Alex Architecture',
    tags: ['trading', 'execution', 'realtime'],
    icon: '💱',
    status: 'available'
  },
  
  // Analytics Components
  {
    id: 'knowledge-graph',
    name: 'Knowledge Graph Explorer',
    description: 'Interactive knowledge graph visualization and exploration',
    category: 'analytics',
    type: 'local',
    componentPath: '../../components/KnowledgeGraphExplorer',
    version: '1.0.0',
    author: 'GZC Intel Team',
    tags: ['graph', 'knowledge', 'visualization'],
    icon: '🕸️',
    status: 'available'
  },
  {
    id: 'fred-dashboard',
    name: 'FRED Economic Data',
    description: 'Federal Reserve Economic Data dashboard and analysis',
    category: 'analytics',
    type: 'local',
    componentPath: '../../components/FREDEconomicDashboard',
    version: '1.0.0',
    author: 'GZC Intel Team',
    tags: ['economics', 'fred', 'data'],
    icon: '📈',
    status: 'available'
  },
  {
    id: 'housing-monitor',
    name: 'Housing Market Monitor',
    description: 'Real estate and housing market analysis and monitoring',
    category: 'analytics',
    type: 'local',
    componentPath: '../../components/HousingMarketMonitor',
    version: '1.0.0',
    author: 'GZC Intel Team',
    tags: ['housing', 'realestate', 'market'],
    icon: '🏠',
    status: 'available'
  },
  {
    id: 'yield-curve',
    name: 'G10 Yield Curve Animator',
    description: 'G10 government bond yield curve analysis and animation',
    category: 'analytics',
    type: 'local',
    componentPath: '../../components/G10YieldCurveAnimator',
    version: '1.0.0',
    author: 'GZC Intel Team',
    tags: ['bonds', 'yield', 'g10', 'animation'],
    icon: '📉',
    status: 'available'
  },
  {
    id: 'volatility-surface',
    name: 'FX Volatility Surface Engine',
    description: 'Foreign exchange volatility surface analysis and modeling',
    category: 'analytics',
    type: 'local',
    componentPath: '../../components/FXVolatilitySurfaceEngine',
    version: '1.0.0',
    author: 'GZC Intel Team',
    tags: ['fx', 'volatility', 'surface', 'options'],
    icon: '🌊',
    status: 'available'
  },
  
  // Utility Components
  {
    id: 'component-library',
    name: 'Component Library',
    description: 'UI component library and interactive playground',
    category: 'utilities',
    type: 'local',
    componentPath: '../../pages/Components',
    version: '1.0.0',
    author: 'GZC Intel Team',
    tags: ['ui', 'components', 'library'],
    icon: '🧩',
    status: 'available'
  },
  {
    id: 'documentation',
    name: 'Documentation Hub',
    description: 'System documentation, setup guides, and help resources',
    category: 'utilities',
    type: 'local',
    componentPath: '../../pages/docs/SetupDocs',
    version: '1.0.0',
    author: 'GZC Intel Team',
    tags: ['docs', 'help', 'setup'],
    icon: '📚',
    status: 'available'
  }
]

// Example external/K8s components (to be configured by admin)
export const EXAMPLE_EXTERNAL_COMPONENTS: ComponentRegistryEntry[] = [
  {
    id: 'risk-engine',
    name: 'Risk Management Engine',
    description: 'Advanced risk analytics and monitoring system',
    category: 'risk',
    type: 'k8s',
    k8sConfig: {
      namespace: 'gzc-apps',
      service: 'risk-engine-service',
      port: 8080,
      protocol: 'https',
      path: '/dashboard'
    },
    version: '2.1.0',
    author: 'Risk Team',
    tags: ['risk', 'analytics', 'monitoring'],
    icon: '⚠️',
    status: 'available',
    healthCheck: {
      enabled: true,
      endpoint: '/health',
      interval: 30000,
      timeout: 5000,
      retries: 3
    }
  },
  {
    id: 'market-data-feed',
    name: 'Live Market Data Feed',
    description: 'Real-time market data aggregation and streaming',
    category: 'data',
    type: 'container',
    containerImage: 'gzc/market-data:latest',
    containerPort: 3000,
    version: '1.5.0',
    author: 'Data Team',
    tags: ['market-data', 'realtime', 'streaming'],
    icon: '📡',
    status: 'available'
  }
]