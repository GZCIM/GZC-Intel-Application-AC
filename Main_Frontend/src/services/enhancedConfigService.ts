/**
 * Enhanced Configuration Service
 * Captures and manages comprehensive user settings including:
 * - Tab layouts and component states
 * - User preferences and window state  
 * - Session information and device details
 * - Component-specific memory and settings
 */

import { cosmosConfigService } from './cosmosConfigService'
import { TabConfig, TabLayout } from '../core/tabs/TabLayoutManager'

interface ComponentState {
  componentId: string
  componentType: string
  tabId: string
  data: Record<string, any>
  settings: Record<string, any>
  lastAccessed: string
  version: string
}

interface WindowState {
  dimensions: { width: number; height: number }
  position: { x: number; y: number }
  maximized: boolean
  fullscreen: boolean
}

interface UserSession {
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

interface UserMemoryItem {
  key: string
  value: any
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  ttl?: number
  tags?: string[]
  lastModified: string
}

interface EnhancedUserConfiguration {
  id: string
  userId: string
  type: 'user-config'
  version: string
  
  // Core configuration
  tabs: TabConfig[]
  layouts: TabLayout[]
  currentLayoutId: string
  activeTabId: string
  
  // User preferences
  preferences: {
    theme: string
    language: string
    autoSave: boolean
    syncAcrossDevices: boolean
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
  
  // State management
  componentStates: ComponentState[]
  windowState: WindowState
  
  // Session and memory
  currentSession: UserSession
  userMemory: UserMemoryItem[]
  
  // Metadata
  createdAt: string
  updatedAt: string
  lastSyncAt: string
  deviceId?: string
  
  // Feature flags
  featureFlags?: Record<string, boolean>
}

class EnhancedConfigService {
  private currentSessionId: string
  private memoryStorage = new Map<string, any>()
  
  constructor() {
    this.currentSessionId = `session-${Date.now()}`
    this.setupWindowStateTracking()
    this.setupBeforeUnloadSave()
  }
  
  /**
   * Capture complete current application state
   */
  private captureCurrentState(): Partial<EnhancedUserConfiguration> {
    const now = new Date().toISOString()
    
    // Get window state
    const windowState: WindowState = {
      dimensions: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      position: {
        x: window.screenX || 0,
        y: window.screenY || 0
      },
      maximized: window.outerWidth === screen.width && window.outerHeight === screen.height,
      fullscreen: !!(document as any).webkitFullscreenElement || !!(document as any).fullscreenElement
    }
    
    // Get device info
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
    
    // Get current tabs and layouts from TabLayoutManager
    const tabLayoutData = this.getCurrentTabLayoutData()
    
    // Get theme preference
    const currentTheme = localStorage.getItem('selectedTheme') || 'gzc-dark'
    
    // Get component states from all active components
    const componentStates = this.captureComponentStates()
    
    // Get user memory items
    const userMemory = this.getUserMemoryItems()
    
    return {
      version: '1.0.0',
      tabs: tabLayoutData.tabs,
      layouts: tabLayoutData.layouts,
      currentLayoutId: tabLayoutData.currentLayoutId,
      activeTabId: tabLayoutData.activeTabId,
      
      preferences: {
        theme: currentTheme,
        language: navigator.language.split('-')[0] || 'en',
        autoSave: true,
        syncAcrossDevices: true,
        notifications: {
          enabled: true,
          types: ['system', 'component-updates']
        },
        accessibility: {
          highContrast: window.matchMedia('(prefers-contrast: more)').matches,
          fontSize: this.getFontSizePreference(),
          animations: !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        },
        performance: {
          enableLazyLoading: true,
          maxComponentsPerTab: 20
        }
      },
      
      componentStates,
      windowState,
      
      currentSession: {
        sessionId: this.currentSessionId,
        deviceInfo,
        loginTime: sessionStorage.getItem('sessionStartTime') || now,
        lastActivity: now,
        activeTabIds: tabLayoutData.activeTabIds,
        openLayouts: [tabLayoutData.currentLayoutId]
      },
      
      userMemory,
      
      updatedAt: now,
      lastSyncAt: now,
      
      featureFlags: {
        experimentalComponents: false,
        advancedGridLayout: true,
        cloudSync: true
      }
    }
  }
  
  /**
   * Get current tab layout data from the application
   */
  private getCurrentTabLayoutData() {
    try {
      // Try to get from TabLayoutManager context if available
      const tabLayouts = JSON.parse(localStorage.getItem('tabLayouts') || '[]')
      const currentLayoutId = localStorage.getItem('currentLayoutId') || 'default'
      const activeTabId = localStorage.getItem('activeTabId') || 'analytics'
      
      const currentLayout = tabLayouts.find((l: any) => l.id === currentLayoutId)
      
      return {
        tabs: currentLayout?.tabs || [],
        layouts: tabLayouts,
        currentLayoutId,
        activeTabId,
        activeTabIds: [activeTabId]
      }
    } catch (error) {
      console.error('Error getting tab layout data:', error)
      return {
        tabs: [],
        layouts: [],
        currentLayoutId: 'default',
        activeTabId: 'analytics',
        activeTabIds: ['analytics']
      }
    }
  }
  
  /**
   * Capture states from all active components
   */
  private captureComponentStates(): ComponentState[] {
    const states: ComponentState[] = []
    const now = new Date().toISOString()
    
    try {
      // Look for component state in various storage locations
      const componentMemory = JSON.parse(localStorage.getItem('componentMemory') || '{}')
      const componentSettings = JSON.parse(localStorage.getItem('componentSettings') || '{}')
      
      Object.entries(componentMemory).forEach(([componentId, data]) => {
        const [tabId, type] = componentId.split('-')
        states.push({
          componentId,
          componentType: type || 'unknown',
          tabId: tabId || 'unknown',
          data: data as Record<string, any>,
          settings: componentSettings[componentId] || {},
          lastAccessed: now,
          version: '1.0.0'
        })
      })
      
      // Capture Bloomberg component states specifically
      const bloombergState = sessionStorage.getItem('bloomberg-volatility-state')
      if (bloombergState) {
        states.push({
          componentId: 'bloomberg-volatility',
          componentType: 'bloomberg-volatility',
          tabId: 'analytics',
          data: JSON.parse(bloombergState),
          settings: {},
          lastAccessed: now,
          version: '1.0.0'
        })
      }
      
    } catch (error) {
      console.error('Error capturing component states:', error)
    }
    
    return states
  }
  
  /**
   * Get user memory items from various storage locations
   */
  private getUserMemoryItems(): UserMemoryItem[] {
    const items: UserMemoryItem[] = []
    const now = new Date().toISOString()
    
    try {
      // Capture from custom memory storage
      this.memoryStorage.forEach((value, key) => {
        items.push({
          key,
          value,
          type: this.getValueType(value),
          lastModified: now
        })
      })
      
      // Capture important localStorage items
      const importantKeys = ['userPreferences', 'savedQueries', 'customSettings']
      importantKeys.forEach(key => {
        const value = localStorage.getItem(key)
        if (value) {
          try {
            items.push({
              key,
              value: JSON.parse(value),
              type: 'object',
              lastModified: now,
              tags: ['persistent']
            })
          } catch {
            items.push({
              key,
              value,
              type: 'string',
              lastModified: now,
              tags: ['persistent']
            })
          }
        }
      })
      
    } catch (error) {
      console.error('Error capturing user memory:', error)
    }
    
    return items
  }
  
  /**
   * Get font size preference
   */
  private getFontSizePreference(): 'small' | 'medium' | 'large' {
    const fontSize = getComputedStyle(document.documentElement).fontSize
    const size = parseInt(fontSize)
    if (size <= 14) return 'small'
    if (size >= 18) return 'large'
    return 'medium'
  }
  
  /**
   * Determine JavaScript value type
   */
  private getValueType(value: any): 'string' | 'number' | 'boolean' | 'object' | 'array' {
    if (Array.isArray(value)) return 'array'
    return typeof value as 'string' | 'number' | 'boolean' | 'object'
  }
  
  /**
   * Save complete configuration to Cosmos DB with retry logic
   */
  async saveCompleteConfiguration(): Promise<void> {
    const maxRetries = 3
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const config = this.captureCurrentState()
        console.log(`💾 Saving complete configuration (attempt ${attempt}/${maxRetries}):`, {
          tabs: config.tabs?.length,
          components: config.componentStates?.length,
          memoryItems: config.userMemory?.length,
          windowState: !!config.windowState
        })
        
        await cosmosConfigService.saveConfiguration(config as any)
        console.log('✅ Complete configuration saved successfully')
        return // Success - exit retry loop
        
      } catch (error) {
        lastError = error as Error
        console.warn(`⚠️ Save attempt ${attempt}/${maxRetries} failed:`, error.message)
        
        // If it's a network timeout, wait before retrying
        if (error.message.includes('aborted') || error.message.includes('timeout')) {
          if (attempt < maxRetries) {
            const delay = attempt * 2000 // Exponential backoff: 2s, 4s, 6s
            console.log(`⏳ Waiting ${delay}ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        } else {
          // For non-timeout errors, don't retry
          break
        }
      }
    }
    
    // All retries failed
    console.error('❌ Failed to save complete configuration after', maxRetries, 'attempts:', lastError)
    
    // Store locally as fallback
    try {
      const config = this.captureCurrentState()
      localStorage.setItem('lastFailedSave', JSON.stringify({
        config,
        timestamp: new Date().toISOString(),
        error: lastError?.message
      }))
      console.log('💽 Configuration saved to localStorage as fallback')
    } catch (localError) {
      console.error('Failed to save to localStorage fallback:', localError)
    }
    
    throw lastError
  }
  
  /**
   * Set up window state tracking
   */
  private setupWindowStateTracking(): void {
    // Track window resize and movement
    let saveTimeout: NodeJS.Timeout
    
    const debouncedSave = () => {
      clearTimeout(saveTimeout)
      saveTimeout = setTimeout(() => {
        this.saveCompleteConfiguration().catch(console.error)
      }, 2000) // Save 2 seconds after window changes
    }
    
    window.addEventListener('resize', debouncedSave)
    window.addEventListener('beforeunload', () => {
      clearTimeout(saveTimeout)
    })
  }
  
  /**
   * Set up automatic save before page unload
   */
  private setupBeforeUnloadSave(): void {
    // Mark session start time
    if (!sessionStorage.getItem('sessionStartTime')) {
      sessionStorage.setItem('sessionStartTime', new Date().toISOString())
    }
    
    // Save configuration before page unload
    window.addEventListener('beforeunload', (event) => {
      console.log('📄 Page unloading, saving configuration...')
      
      // Synchronous save attempt
      try {
        this.saveCompleteConfiguration()
      } catch (error) {
        console.error('Failed to save on unload:', error)
      }
      
      // Optional: Show warning if there are unsaved changes
      const hasUnsavedChanges = this.hasUnsavedChanges()
      if (hasUnsavedChanges) {
        event.preventDefault()
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
      }
    })
    
    // Also save on visibility change (tab switch, minimize)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('👁️ Page hidden, saving configuration...')
        this.saveCompleteConfiguration().catch(console.error)
      }
    })
  }
  
  /**
   * Check if there are unsaved changes
   */
  private hasUnsavedChanges(): boolean {
    const lastSave = localStorage.getItem('lastConfigSave')
    const lastModified = localStorage.getItem('lastModified')
    
    if (!lastSave || !lastModified) return true
    
    return new Date(lastModified) > new Date(lastSave)
  }
  
  /**
   * Store user memory item
   */
  setUserMemory(key: string, value: any, ttl?: number, tags?: string[]): void {
    this.memoryStorage.set(key, value)
    
    // Also persist to localStorage for important items
    if (tags?.includes('persistent')) {
      try {
        localStorage.setItem(`userMemory_${key}`, JSON.stringify({
          value,
          timestamp: new Date().toISOString(),
          ttl,
          tags
        }))
      } catch (error) {
        console.warn('Failed to persist user memory item:', error)
      }
    }
  }
  
  /**
   * Get user memory item
   */
  getUserMemory(key: string): any {
    return this.memoryStorage.get(key)
  }
  
  /**
   * Clear user memory
   */
  clearUserMemory(): void {
    this.memoryStorage.clear()
    
    // Clear persisted items
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('userMemory_')) {
        localStorage.removeItem(key)
      }
    })
  }
}

export const enhancedConfigService = new EnhancedConfigService()