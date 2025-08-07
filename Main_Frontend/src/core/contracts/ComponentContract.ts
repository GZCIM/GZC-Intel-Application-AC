/**
 * PROFESSIONAL COMPONENT CONTRACT SYSTEM
 * 
 * Every component MUST declare its capabilities, requirements, and behavior.
 * This enables content-agnostic architecture where layout engine knows
 * what components can do without knowing what they contain.
 */

export interface ComponentCapabilities {
  // Sizing behavior
  sizing: {
    minWidth?: number
    minHeight?: number
    maxWidth?: number | 'unlimited'
    maxHeight?: number | 'unlimited'
    aspectRatio?: 'free' | 'square' | '16:9' | '4:3' | number
    resizable: boolean
    responsive: boolean
  }
  
  // Interaction modes
  modes: {
    standalone: boolean      // Can run as full tab
    widget: boolean         // Can run as dashboard widget
    embedded: boolean       // Can run inside other components
    modal: boolean          // Can run as overlay/modal
  }
  
  // Data requirements
  data: {
    realTime: boolean       // Needs live data updates
    historical: boolean     // Needs historical data
    userSpecific: boolean   // Needs user context
    external: boolean       // Needs external API calls
    cached: boolean         // Can work with cached data
  }
  
  // Performance characteristics
  performance: {
    renderComplexity: 'low' | 'medium' | 'high'
    memoryUsage: 'light' | 'moderate' | 'heavy'
    cpuIntensive: boolean
    networkIntensive: boolean
  }
  
  // Layout behavior
  layout: {
    scrollable: boolean
    fixedPosition: boolean
    overlay: boolean
    zIndexRequirement?: number
  }
}

export interface ComponentMetadata {
  id: string
  name: string
  displayName: string
  version: string
  category: 'trading' | 'analytics' | 'portfolio' | 'market-data' | 'admin' | 'docs'
  description: string
  icon: string
  tags: string[]
  author?: string
  license?: string
  lastUpdated: string
}

export interface ComponentLifecycle {
  // Initialization phase
  initialize(): Promise<void> | void
  
  // Mount phase
  onMount(): Promise<void> | void
  
  // Resize handling
  onResize(width: number, height: number): Promise<void> | void
  
  // Data updates
  onDataUpdate?(data: any): Promise<void> | void
  
  // User context changes
  onUserChange?(userId: string): Promise<void> | void
  
  // Cleanup phase
  onUnmount(): Promise<void> | void
  
  // Error handling
  onError?(error: Error): Promise<void> | void
}

export interface DataContract {
  // Input data ports
  inputs: DataPortDefinition[]
  
  // Output data ports  
  outputs: DataPortDefinition[]
  
  // Real-time subscriptions
  subscriptions?: SubscriptionDefinition[]
}

export interface DataPortDefinition {
  id: string
  name: string
  type: 'number' | 'string' | 'object' | 'array' | 'boolean' | 'date'
  required: boolean
  schema?: object // JSON schema for validation
  defaultValue?: any
  description: string
}

export interface SubscriptionDefinition {
  id: string
  name: string
  type: 'websocket' | 'sse' | 'polling' | 'redis'
  endpoint: string
  interval?: number // for polling
  transform?: string // transformation function name
}

export interface ComponentConfig {
  // Component settings that can be customized
  settings: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'select' | 'color'
    default: any
    options?: any[] // for select type
    validation?: object
    description: string
  }>
  
  // Theme customization
  theme?: {
    customizable: boolean
    properties: string[] // list of CSS custom properties that can be overridden
  }
}

/**
 * COMPLETE COMPONENT CONTRACT
 * 
 * Every professional component MUST implement this contract
 */
export interface ComponentContract {
  metadata: ComponentMetadata
  capabilities: ComponentCapabilities
  lifecycle: ComponentLifecycle
  dataContract: DataContract
  config: ComponentConfig
  
  // Validation methods
  validateProps?(props: any): { valid: boolean; errors: string[] }
  validateData?(data: any): { valid: boolean; errors: string[] }
  
  // Performance monitoring
  getPerformanceMetrics?(): {
    renderTime: number
    memoryUsage: number
    dataFreshness: number
  }
}

/**
 * COMPONENT REGISTRY ENTRY
 * 
 * How components are registered in the system
 */
export interface ComponentRegistryEntry {
  contract: ComponentContract
  component: React.ComponentType<any>
  loader: () => Promise<{ default: React.ComponentType<any> }>
  status: 'available' | 'loading' | 'error' | 'deprecated'
  dependencies?: string[]
  compatibilityMatrix?: {
    react: string
    typescript: string
    [key: string]: string
  }
}

/**
 * LAYOUT ENGINE CONTRACT
 * 
 * How the layout engine communicates with components
 */
export interface LayoutEngineContract {
  // Component placement
  placeComponent(componentId: string, container: string, options?: any): Promise<void>
  
  // Component removal
  removeComponent(instanceId: string): Promise<void>
  
  // Resize coordination
  resizeComponent(instanceId: string, width: number, height: number): Promise<void>
  
  // Data flow coordination
  connectDataFlow(sourceId: string, targetId: string, mapping: object): Promise<void>
  
  // Performance monitoring
  getLayoutMetrics(): {
    componentCount: number
    renderTime: number
    memoryUsage: number
  }
}