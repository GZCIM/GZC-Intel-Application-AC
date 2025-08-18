/**
 * Cosmos DB Configuration Service
 * Uses FastAPI backend to access Cosmos DB (backend handles managed identity)
 */

import { PublicClientApplication } from '@azure/msal-browser'
import { toastManager } from '../components/Toast'

interface UserConfiguration {
  id: string
  userId: string
  tabs: any[]
  layouts: any[]
  preferences: Record<string, any>
  componentStates: Record<string, any>  // Component-specific data
  userMemory: Record<string, any>       // General key-value storage
  timestamp: string
  type: 'user-config'
}

class CosmosConfigService {
  // In production, use relative URL so it goes through nginx proxy
  private backendUrl = import.meta.env.VITE_BACKEND_URL || (
    import.meta.env.PROD ? '' : 'http://localhost:5300'  // Main gateway backend
  )

  // Lazy-load MSAL instance to avoid initialization race condition
  private get msalInstance(): PublicClientApplication | null {
    if (typeof window !== 'undefined' && (window as any).msalInstance) {
      return (window as any).msalInstance
    }
    return null
  }

  /**
   * Get Azure AD token for backend API access
   */
  private async getAccessToken(): Promise<string> {
    const msal = this.msalInstance
    if (!msal) {
      // Wait for MSAL to be initialized
      await new Promise(resolve => setTimeout(resolve, 1000))
      const retryMsal = this.msalInstance
      if (!retryMsal) {
        throw new Error('MSAL not initialized after wait')
      }
      return this.getAccessToken() // Retry with initialized MSAL
    }

    // Check if MSAL is actually initialized (not just present)
    let accounts: any[] = []
    try {
      accounts = msal.getAllAccounts()
    } catch (e) {
      // MSAL not initialized yet, wait and retry
      await new Promise(resolve => setTimeout(resolve, 1000))
      try {
        accounts = msal.getAllAccounts()
      } catch (e2) {
        throw new Error('MSAL not initialized after wait: ' + e2.message)
      }
    }
    if (accounts.length === 0) {
      throw new Error('No authenticated user')
    }

    try {
      // For now, use the User.Read token which should work with the backend
      // The backend should accept tokens from the same tenant
      const response = await msal.acquireTokenSilent({
        scopes: ["User.Read"],
        account: accounts[0]
      })
      return response.accessToken
    } catch (error) {
      console.error('Failed to get token silently:', error)
      // Try popup for interactive auth
      try {
        const response = await msal.acquireTokenPopup({
          scopes: ["User.Read"],
          account: accounts[0]
        })
        return response.accessToken
      } catch (popupError) {
        console.error('Popup failed, trying redirect:', popupError)
        // Last resort: redirect (Safari-friendly)
        await msal.acquireTokenRedirect({
          scopes: ["User.Read"],
          account: accounts[0]
        })
        // This will redirect, so we won't get here
        throw new Error('Redirecting for authentication...')
      }
    }
  }

  /**
   * Save user configuration via backend API
   */
  async saveConfiguration(config: Partial<UserConfiguration>): Promise<void> {
    try {
      // Check if user is authenticated first
      const msal = this.msalInstance
      if (!msal) {
        throw new Error('Authentication required - MSAL not initialized')
      }
      
      const accounts = msal.getAllAccounts()
      if (accounts.length === 0) {
        throw new Error('Authentication required - please login to save configurations')
      }
      
      const token = await this.getAccessToken()
      
      console.log('💾 Saving to Cosmos DB:', {
        tabsCount: config.tabs?.length || 0,
        layoutsCount: config.layouts?.length || 0,
        hasPreferences: !!config.preferences,
        backend: this.backendUrl
      })
      
      const response = await fetch(`${this.backendUrl}/api/cosmos/config`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })

      if (!response.ok) {
        throw new Error(`Failed to save config: ${response.statusText}`)
      }

      console.log('Configuration saved to Cosmos DB via backend')
      toastManager.show('✓ Configuration saved to cloud', 'success')
    } catch (error) {
      console.error('Error saving to Cosmos DB:', error)
      toastManager.show('Failed to save configuration', 'error')
      throw error  // No fallback - require Cosmos DB
    }
  }

  /**
   * Load user configuration via backend API
   */
  async loadConfiguration(): Promise<UserConfiguration | null> {
    try {
      // Check if user is authenticated first
      const msal = this.msalInstance
      if (!msal) {
        console.log('🚨 MSAL not initialized, skipping Cosmos load')
        return null
      }
      
      const accounts = msal.getAllAccounts()
      console.log('🔍 MSAL accounts found:', accounts.length)
      if (accounts.length === 0) {
        console.log('🚨 No authenticated user, skipping Cosmos load')
        return null
      }
      
      console.log('🔑 Getting access token for Cosmos DB...')
      const token = await this.getAccessToken()
      console.log('✅ Token acquired, making Cosmos DB request')
      
      const response = await fetch(`${this.backendUrl}/api/cosmos/config`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data) {
          console.log('✅ Configuration loaded from Cosmos DB via backend:', {
            tabsCount: data.tabs?.length || 0,
            userId: data.userId,
            timestamp: data.timestamp
          })
          return data
        }
      } else {
        console.log('🚨 Cosmos DB request failed:', response.status, response.statusText)
      }
      
      console.log('❌ No configuration found in Cosmos DB')
      return null
      
    } catch (error) {
      console.error('Error loading from Cosmos DB:', error)
      // No fallback - Cosmos DB only
      return null
    }
  }

  /**
   * Update specific fields in configuration
   */
  async updateConfiguration(updates: Partial<UserConfiguration>): Promise<void> {
    try {
      const token = await this.getAccessToken()
      
      const response = await fetch(`${this.backendUrl}/api/cosmos/config`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error(`Failed to update config: ${response.statusText}`)
      }

      console.log('Configuration updated in Cosmos DB via backend')
      toastManager.show('✓ Configuration updated', 'success')
    } catch (error) {
      console.error('Error updating Cosmos DB:', error)
      toastManager.show('Failed to update configuration', 'error')
      throw error  // No fallback - require Cosmos DB
    }
  }

  /**
   * Delete user configuration
   */
  async deleteConfiguration(): Promise<void> {
    try {
      const token = await this.getAccessToken()
      
      const response = await fetch(`${this.backendUrl}/api/cosmos/config`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete config: ${response.statusText}`)
      }

      console.log('Configuration deleted from Cosmos DB via backend')
    } catch (error) {
      console.error('Error deleting from Cosmos DB:', error)
    }
    
    // Also clear localStorage
    this.clearLocalStorage()
  }

  /**
   * Check Cosmos DB health via backend
   */
  async checkHealth(): Promise<{ status: string; message?: string }> {
    try {
      const response = await fetch(`${this.backendUrl}/api/cosmos/health`)
      
      if (response.ok) {
        return await response.json()
      }
      
      return { status: 'error', message: 'Backend not reachable' }
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * Get user ID from authenticated user
   */
  private getUserId(): string {
    const msal = this.msalInstance
    if (!msal) {
      // Fallback to temporary user ID for testing
      return `temp_user_${Date.now()}`
    }

    try {
      const accounts = msal.getAllAccounts()
      if (accounts.length > 0) {
        return accounts[0].homeAccountId || accounts[0].username
      }
    } catch (e) {
      // MSAL not initialized yet
      console.warn('MSAL not initialized in getUserId')
    }

    return `temp_user_${Date.now()}`
  }

  /**
   * Fallback: Save to localStorage
   */
  private saveToLocalStorage(config: Partial<UserConfiguration>): void {
    const userId = this.getUserId()
    const key = `gzc-intel-config-${userId}`
    const existing = this.loadFromLocalStorage() || {}
    
    const updated = {
      ...existing,
      ...config,
      timestamp: new Date().toISOString()
    }
    
    localStorage.setItem(key, JSON.stringify(updated))
    console.log('Configuration saved to localStorage (fallback)')
  }

  /**
   * Fallback: Load from localStorage
   */
  private loadFromLocalStorage(): UserConfiguration | null {
    const userId = this.getUserId()
    const key = `gzc-intel-config-${userId}`
    const stored = localStorage.getItem(key)
    
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (e) {
        console.error('Failed to parse localStorage config:', e)
      }
    }
    
    return null
  }

  /**
   * Update specific component state (professional pattern)
   */
  async updateComponentState(componentId: string, state: any): Promise<void> {
    try {
      const config = await this.loadConfiguration() || this.getDefaultConfig()
      if (!config.componentStates) config.componentStates = {}
      config.componentStates[componentId] = state
      await this.saveConfiguration(config)
    } catch (error) {
      console.error('Failed to update component state:', error)
      throw error
    }
  }

  /**
   * Get specific component state
   */
  async getComponentState(componentId: string): Promise<any> {
    try {
      const config = await this.loadConfiguration()
      return config?.componentStates?.[componentId] || {}
    } catch (error) {
      console.error('Failed to get component state:', error)
      return {}
    }
  }

  /**
   * Update user preference (professional pattern)
   */
  async updatePreference(key: string, value: any): Promise<void> {
    try {
      const config = await this.loadConfiguration() || this.getDefaultConfig()
      if (!config.preferences) config.preferences = {}
      config.preferences[key] = value
      await this.saveConfiguration(config)
    } catch (error) {
      console.error('Failed to update preference:', error)
      throw error
    }
  }

  /**
   * Get user preference
   */
  async getPreference(key: string): Promise<any> {
    try {
      const config = await this.loadConfiguration()
      return config?.preferences?.[key] || null
    } catch (error) {
      console.error('Failed to get preference:', error)
      return null
    }
  }

  /**
   * Get default configuration structure
   */
  private getDefaultConfig(): UserConfiguration {
    return {
      id: `user-${this.getUserId()}`,
      userId: this.getUserId(),
      tabs: [],
      layouts: [],
      preferences: {},
      componentStates: {},
      userMemory: {},
      timestamp: new Date().toISOString(),
      type: 'user-config'
    }
  }

  /**
   * Clear localStorage
   */
  private clearLocalStorage(): void {
    const userId = this.getUserId()
    const key = `gzc-intel-config-${userId}`
    localStorage.removeItem(key)
  }
}

// Export singleton instance
export const cosmosConfigService = new CosmosConfigService()

// Export helper functions for backward compatibility
export const saveTabsToCosmosDB = async (tabs: any[]) => {
  await cosmosConfigService.saveConfiguration({ tabs })
}

export const loadTabsFromCosmosDB = async (): Promise<any[]> => {
  const config = await cosmosConfigService.loadConfiguration()
  return config?.tabs || []
}

export const saveLayoutsToCosmosDB = async (layouts: any[]) => {
  await cosmosConfigService.saveConfiguration({ layouts })
}

export const loadLayoutsFromCosmosDB = async (): Promise<any[]> => {
  const config = await cosmosConfigService.loadConfiguration()
  return config?.layouts || []
}