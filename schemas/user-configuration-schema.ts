/**
 * Comprehensive User Configuration Schema for Cosmos DB
 * Captures ALL user settings, layout, components, and preferences
 */

export interface ComponentInTab {
  id: string
  type: string // Component type from inventory
  position: { x: number; y: number; w: number; h: number }
  props?: Record<string, any>
  zIndex?: number
  state?: Record<string, any> // Component internal state
  settings?: Record<string, any> // Component-specific settings
}

export interface TabConfig {
  id: string
  name: string
  component: string // Component identifier to load
  type: 'dynamic' | 'static'
  icon?: string
  closable?: boolean
  props?: Record<string, any>
  gridLayoutEnabled?: boolean
  gridLayout?: any[] // react-grid-layout configuration
  components?: ComponentInTab[] // For dynamic tabs with multiple components
  editMode?: boolean
  memoryStrategy?: 'local' | 'redis' | 'hybrid'
  lastModified?: string
  position?: number // Tab order in tab bar
}

export interface TabLayout {
  id: string
  name: string
  tabs: TabConfig[]
  isDefault?: boolean
  createdAt: string
  updatedAt: string
  activeTabId?: string // Remember which tab was active
}

export interface UserPreferences {
  theme: string
  language: string
  autoSave: boolean
  syncAcrossDevices: boolean
  defaultLayout?: string
  notifications?: {
    enabled: boolean
    types: string[]
  }
  accessibility?: {
    highContrast: boolean
    fontSize: 'small' | 'medium' | 'large'
    animations: boolean
  }
  performance?: {
    enableLazyLoading: boolean
    maxComponentsPerTab: number
  }
}

export interface WindowState {
  dimensions: {
    width: number
    height: number
  }
  position: {
    x: number
    y: number
  }
  maximized: boolean
  fullscreen: boolean
}

export interface ComponentState {
  componentId: string
  componentType: string
  tabId: string
  data: Record<string, any>
  settings: Record<string, any>
  lastAccessed: string
  version: string
}

export interface UserSession {
  sessionId: string
  deviceInfo: {
    userAgent: string
    platform: string
    screenResolution: string
    timezone: string
  }
  loginTime: string
  lastActivity: string
  activeTabIds: string[]
  openLayouts: string[]
}

export interface UserMemoryItem {
  key: string
  value: any
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  ttl?: number // Time to live in seconds
  tags?: string[]
  lastModified: string
}

/**
 * Complete User Configuration Document for Cosmos DB
 */
export interface UserConfigurationDocument {
  // Document metadata
  id: string // Format: "user-{userId}"
  userId: string // Azure AD homeAccountId
  type: 'user-config'
  version: string // Schema version for migration
  
  // Core configuration
  tabs: TabConfig[]
  layouts: TabLayout[]
  currentLayoutId: string
  activeTabId: string
  
  // User preferences and settings  
  preferences: UserPreferences
  
  // Component and application state
  componentStates: ComponentState[]
  windowState: WindowState
  
  // Session and memory management
  currentSession: UserSession
  userMemory: UserMemoryItem[] // Key-value storage for user data
  
  // Metadata
  createdAt: string
  updatedAt: string
  lastSyncAt: string
  deviceId?: string
  
  // Backup and versioning
  previousVersions?: {
    version: string
    data: Partial<UserConfigurationDocument>
    timestamp: string
  }[]
  
  // Feature flags and experiments
  featureFlags?: Record<string, boolean>
  experiments?: Record<string, any>
}

/**
 * Default configuration template
 */
export const DEFAULT_USER_CONFIG: Partial<UserConfigurationDocument> = {
  version: '1.0.0',
  tabs: [
    {
      id: 'analytics',
      name: 'Analytics', 
      component: 'Analytics',
      type: 'dynamic',
      icon: 'bar-chart-2',
      closable: true,
      gridLayoutEnabled: true,
      components: [],
      editMode: false,
      position: 0
    }
  ],
  layouts: [],
  currentLayoutId: 'default',
  activeTabId: 'analytics',
  preferences: {
    theme: 'gzc-dark',
    language: 'en',
    autoSave: true,
    syncAcrossDevices: true,
    notifications: {
      enabled: true,
      types: ['system', 'component-updates']
    },
    accessibility: {
      highContrast: false,
      fontSize: 'medium',
      animations: true
    },
    performance: {
      enableLazyLoading: true,
      maxComponentsPerTab: 20
    }
  },
  componentStates: [],
  windowState: {
    dimensions: { width: 1920, height: 1080 },
    position: { x: 0, y: 0 },
    maximized: false,
    fullscreen: false
  },
  userMemory: [],
  featureFlags: {
    experimentalComponents: false,
    advancedGridLayout: true,
    cloudSync: true
  }
}

/**
 * Validation functions
 */
export function validateUserConfig(config: any): config is UserConfigurationDocument {
  return (
    typeof config === 'object' &&
    typeof config.id === 'string' &&
    typeof config.userId === 'string' &&
    Array.isArray(config.tabs) &&
    Array.isArray(config.layouts) &&
    typeof config.preferences === 'object'
  )
}

export function sanitizeUserConfig(config: Partial<UserConfigurationDocument>): UserConfigurationDocument {
  const now = new Date().toISOString()
  
  return {
    id: config.id || `user-${config.userId}`,
    userId: config.userId || '',
    type: 'user-config',
    version: config.version || '1.0.0',
    tabs: config.tabs || DEFAULT_USER_CONFIG.tabs!,
    layouts: config.layouts || [],
    currentLayoutId: config.currentLayoutId || 'default',
    activeTabId: config.activeTabId || 'analytics',
    preferences: { ...DEFAULT_USER_CONFIG.preferences!, ...config.preferences },
    componentStates: config.componentStates || [],
    windowState: config.windowState || DEFAULT_USER_CONFIG.windowState!,
    currentSession: config.currentSession || {
      sessionId: `session-${Date.now()}`,
      deviceInfo: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        platform: typeof navigator !== 'undefined' ? navigator.platform : '',
        screenResolution: typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      loginTime: now,
      lastActivity: now,
      activeTabIds: [config.activeTabId || 'analytics'],
      openLayouts: [config.currentLayoutId || 'default']
    },
    userMemory: config.userMemory || [],
    createdAt: config.createdAt || now,
    updatedAt: now,
    lastSyncAt: now,
    deviceId: config.deviceId,
    previousVersions: config.previousVersions || [],
    featureFlags: { ...DEFAULT_USER_CONFIG.featureFlags!, ...config.featureFlags }
  }
}