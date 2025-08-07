/**
 * Global State Manager
 * Ensures complete persistence of user state including:
 * - All tabs (user-created and default)
 * - Tab order and active tab
 * - All components in each tab
 * - Component positions and configurations
 * - Component internal state
 */

interface AppState {
  version: string
  timestamp: string
  tabs: {
    layouts: any[] // All saved layouts
    activeLayoutId: string
    activeTabId: string
  }
  components: {
    [tabId: string]: {
      instances: any[] // Component instances with positions and props
      layouts?: any // Grid layouts for dynamic tabs
      slotLayout?: any[] // Slot layout for static tabs
    }
  }
  viewMemory: Record<string, any> // All view memory data
  userSettings: Record<string, any> // User preferences
}

class StateManager {
  private static instance: StateManager
  private saveDebounceTimer: NodeJS.Timeout | null = null

  static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager()
    }
    return StateManager.instance
  }

  /**
   * Save complete application state
   */
  async saveState(): Promise<void> {
    try {
      const state: AppState = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        tabs: this.getTabState(),
        components: this.getComponentState(),
        viewMemory: this.getViewMemory(),
        userSettings: this.getUserSettings()
      }

      // Save to localStorage with compression
      const stateJson = JSON.stringify(state)
      localStorage.setItem('gzc-intel-complete-state', stateJson)
      
      // Also save a backup
      localStorage.setItem('gzc-intel-state-backup', stateJson)
      localStorage.setItem('gzc-intel-state-timestamp', state.timestamp)

      console.log('State saved successfully', {
        size: stateJson.length,
        timestamp: state.timestamp
      })
    } catch (error) {
      console.error('Failed to save state:', error)
    }
  }

  /**
   * Load complete application state
   */
  async loadState(): Promise<AppState | null> {
    try {
      const stateJson = localStorage.getItem('gzc-intel-complete-state')
      if (!stateJson) return null

      const state = JSON.parse(stateJson) as AppState
      
      // Validate state version
      if (state.version !== '1.0.0') {
        console.warn('State version mismatch, may need migration')
      }

      return state
    } catch (error) {
      console.error('Failed to load state:', error)
      // Try backup
      return this.loadBackupState()
    }
  }

  /**
   * Load backup state
   */
  private async loadBackupState(): Promise<AppState | null> {
    try {
      const backupJson = localStorage.getItem('gzc-intel-state-backup')
      if (!backupJson) return null
      return JSON.parse(backupJson) as AppState
    } catch (error) {
      console.error('Failed to load backup state:', error)
      return null
    }
  }

  /**
   * Get current tab state
   */
  private getTabState(): AppState['tabs'] {
    const layouts = JSON.parse(localStorage.getItem('gzc-intel-layouts') || '[]')
    const activeLayoutId = localStorage.getItem('gzc-intel-active-layout') || 'default'
    const activeTabId = sessionStorage.getItem('gzc-intel-active-tab') || ''

    return {
      layouts,
      activeLayoutId,
      activeTabId
    }
  }

  /**
   * Get component state for all tabs
   */
  private getComponentState(): AppState['components'] {
    const components: AppState['components'] = {}
    
    // Get all keys from localStorage that are component-related
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.includes('dynamic-canvas-') || key?.includes('static-canvas-')) {
        const tabId = key.split('-').pop()
        if (tabId) {
          const data = localStorage.getItem(key)
          if (data) {
            try {
              components[tabId] = JSON.parse(data)
            } catch (e) {
              console.error(`Failed to parse component data for ${tabId}`)
            }
          }
        }
      }
    }

    return components
  }

  /**
   * Get view memory
   */
  private getViewMemory(): Record<string, any> {
    const viewMemoryJson = localStorage.getItem('gzc-platform-view-memory')
    if (!viewMemoryJson) return {}
    
    try {
      return JSON.parse(viewMemoryJson)
    } catch (e) {
      return {}
    }
  }

  /**
   * Get user settings
   */
  private getUserSettings(): Record<string, any> {
    const settings: Record<string, any> = {}
    
    // Collect all user settings
    const settingsKeys = [
      'gzc-platform-theme',
      'gzc-platform-user-settings',
      'gzc-platform-widget-settings'
    ]

    for (const key of settingsKeys) {
      const value = localStorage.getItem(key)
      if (value) {
        try {
          settings[key] = JSON.parse(value)
        } catch (e) {
          settings[key] = value
        }
      }
    }

    return settings
  }

  /**
   * Restore complete state
   */
  async restoreState(state: AppState): Promise<void> {
    try {
      // Restore tabs
      if (state.tabs.layouts) {
        localStorage.setItem('gzc-intel-layouts', JSON.stringify(state.tabs.layouts))
      }
      if (state.tabs.activeLayoutId) {
        localStorage.setItem('gzc-intel-active-layout', state.tabs.activeLayoutId)
      }

      // Restore components
      for (const [tabId, componentData] of Object.entries(state.components)) {
        if (componentData.layouts) {
          localStorage.setItem(`dynamic-canvas-${tabId}`, JSON.stringify(componentData))
        } else if (componentData.slotLayout) {
          localStorage.setItem(`static-canvas-${tabId}`, JSON.stringify(componentData))
        }
      }

      // Restore view memory
      if (state.viewMemory) {
        localStorage.setItem('gzc-platform-view-memory', JSON.stringify(state.viewMemory))
      }

      // Restore user settings
      for (const [key, value] of Object.entries(state.userSettings)) {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
      }

      console.log('State restored successfully')
    } catch (error) {
      console.error('Failed to restore state:', error)
    }
  }

  /**
   * Export state as JSON file
   */
  async exportState(): Promise<void> {
    const state = await this.loadState()
    if (!state) return

    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gzc-intel-state-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Import state from JSON file
   */
  async importState(file: File): Promise<void> {
    try {
      const text = await file.text()
      const state = JSON.parse(text) as AppState
      await this.restoreState(state)
      window.location.reload() // Reload to apply changes
    } catch (error) {
      console.error('Failed to import state:', error)
      throw error
    }
  }

  /**
   * Auto-save with debounce
   */
  autoSave(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer)
    }

    this.saveDebounceTimer = setTimeout(() => {
      this.saveState()
    }, 1000) // Save after 1 second of inactivity
  }

  /**
   * Clear all state
   */
  clearState(): void {
    const keys = [
      'gzc-intel-complete-state',
      'gzc-intel-state-backup',
      'gzc-intel-state-timestamp',
      'gzc-intel-layouts',
      'gzc-intel-active-layout',
      'gzc-platform-view-memory'
    ]

    for (const key of keys) {
      localStorage.removeItem(key)
    }

    // Clear component-specific keys
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key?.includes('canvas-') || key?.includes('component-')) {
        localStorage.removeItem(key)
      }
    }
  }

  /**
   * Get state size in bytes
   */
  getStateSize(): number {
    let totalSize = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key)
        if (value) {
          totalSize += key.length + value.length
        }
      }
    }
    return totalSize
  }
}

// Export singleton instance
export const stateManager = StateManager.getInstance()

// Auto-save on important events
if (typeof window !== 'undefined') {
  // Save before page unload
  window.addEventListener('beforeunload', () => {
    stateManager.saveState()
  })

  // Save periodically
  setInterval(() => {
    stateManager.autoSave()
  }, 30000) // Every 30 seconds
}