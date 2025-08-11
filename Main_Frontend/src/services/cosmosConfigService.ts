/**
 * Cosmos DB Configuration Service
 * Uses FastAPI backend to access Cosmos DB (backend handles managed identity)
 */

import { PublicClientApplication } from '@azure/msal-browser'

interface UserConfiguration {
  id: string
  userId: string
  tabs: any[]
  layouts: any[]
  preferences: any
  timestamp: string
  type: 'user-config'
}

class CosmosConfigService {
  // In production, use relative URL so it goes through nginx proxy
  private backendUrl = import.meta.env.VITE_BACKEND_URL || (
    import.meta.env.PROD ? '' : 'http://localhost:5300'
  )
  private msalInstance: PublicClientApplication | null = null

  constructor() {
    // Get MSAL instance from window if available
    if (typeof window !== 'undefined' && (window as any).msalInstance) {
      this.msalInstance = (window as any).msalInstance
    }
  }

  /**
   * Get Azure AD token for backend API access
   */
  private async getAccessToken(): Promise<string> {
    if (!this.msalInstance) {
      // In development, return empty token
      if (import.meta.env.DEV) {
        return 'dev-token'
      }
      throw new Error('MSAL not initialized')
    }

    const accounts = this.msalInstance.getAllAccounts()
    if (accounts.length === 0) {
      throw new Error('No authenticated user')
    }

    try {
      // Request token for backend API
      const response = await this.msalInstance.acquireTokenSilent({
        scopes: ['User.Read'],
        account: accounts[0]
      })
      return response.accessToken
    } catch (error) {
      console.error('Failed to get token:', error)
      // Fallback to interactive if silent fails
      const response = await this.msalInstance.acquireTokenPopup({
        scopes: ['User.Read'],
        account: accounts[0]
      })
      return response.accessToken
    }
  }

  /**
   * Save user configuration via backend API
   */
  async saveConfiguration(config: Partial<UserConfiguration>): Promise<void> {
    try {
      const token = await this.getAccessToken()
      
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
    } catch (error) {
      console.error('Error saving to Cosmos DB:', error)
      // Fallback to localStorage
      this.saveToLocalStorage(config)
    }
  }

  /**
   * Load user configuration via backend API
   */
  async loadConfiguration(): Promise<UserConfiguration | null> {
    try {
      const token = await this.getAccessToken()
      
      const response = await fetch(`${this.backendUrl}/api/cosmos/config`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data) {
          console.log('Configuration loaded from Cosmos DB via backend')
          return data
        }
      }
      
      console.log('No configuration found in Cosmos DB, checking localStorage')
      return this.loadFromLocalStorage()
      
    } catch (error) {
      console.error('Error loading from Cosmos DB:', error)
      // Fallback to localStorage
      return this.loadFromLocalStorage()
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
    } catch (error) {
      console.error('Error updating Cosmos DB:', error)
      // Fallback to localStorage
      this.saveToLocalStorage(updates)
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
      return { status: 'error', message: error.toString() }
    }
  }

  /**
   * Get user ID from authenticated user
   */
  private getUserId(): string {
    if (!this.msalInstance) {
      // Fallback to temporary user ID for testing
      return `temp_user_${Date.now()}`
    }

    const accounts = this.msalInstance.getAllAccounts()
    if (accounts.length > 0) {
      return accounts[0].homeAccountId || accounts[0].username
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