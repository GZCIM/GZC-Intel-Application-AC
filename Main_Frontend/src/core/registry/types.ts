export interface ComponentManifest {
  id: string
  name: string
  version: string
  description: string
  category: 'trading' | 'analytics' | 'portfolio' | 'data' | 'system'
  author: string
  dependencies: string[]
  exports: {
    component: string
    icon?: string
    routes?: RouteConfig[]
    widgets?: WidgetConfig[]
  }
  permissions: string[]
  config?: ComponentConfig
}

export interface RouteConfig {
  path: string
  component: string
  title: string
  icon?: string
  protected?: boolean
}

export interface WidgetConfig {
  id: string
  name: string
  component: string
  defaultSize: { w: number; h: number }
  minSize: { w: number; h: number }
  maxSize?: { w: number; h: number }
  resizable: boolean
  configurable: boolean
}

export interface ComponentConfig {
  settings: Record<string, any>
  theme?: 'inherit' | 'custom'
  permissions?: string[]
}

export interface RegisteredComponent {
  manifest: ComponentManifest
  module: any
  status: 'loading' | 'ready' | 'error'
  error?: string
  loadedAt: Date
}

export interface ComponentRegistryState {
  components: Map<string, RegisteredComponent>
  loading: Set<string>
  errors: Map<string, string>
  categories: Record<string, string[]>
}

export interface ComponentLoadResult {
  success: boolean
  component?: RegisteredComponent
  error?: string
}