/**
 * Database Service for PostgreSQL persistence
 * Connects to backend API for user preferences, tabs, and components
 */

import { PublicClientApplication } from '@azure/msal-browser'
import { msalConfig, loginRequest } from '../modules/shell/components/auth/msalConfig'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5300'

interface UserPreferences {
  user_id: string
  email: string
  theme?: string
  language?: string
  timezone?: string
  tabs?: any[]
  layouts?: any[]
}

class DatabaseService {
  private msalInstance: PublicClientApplication
  
  constructor() {
    this.msalInstance = new PublicClientApplication(msalConfig)
  }
  
  private async getAuthHeaders(): Promise<HeadersInit> {
    try {
      // Get MSAL token properly
      const accounts = this.msalInstance.getAllAccounts()
      
      if (accounts.length > 0) {
        // User is authenticated, get real Azure AD token
        const response = await this.msalInstance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0]
        })
        
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${response.accessToken}`
        }
      }
    } catch (error) {
      console.warn('Failed to acquire MSAL token:', error)
      // Try interactive auth
      try {
        const response = await this.msalInstance.acquireTokenPopup(loginRequest)
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${response.accessToken}`
        }
      } catch (interactiveError) {
        console.error('Interactive auth failed:', interactiveError)
      }
    }
    
    // No auth available
    return {
      'Content-Type': 'application/json'
    }
  }

  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/preferences/user`, {
        headers: await this.getAuthHeaders()
      })
      
      if (!response.ok) {
        console.warn('Failed to fetch user preferences:', response.status)
        return null
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error fetching user preferences:', error)
      return null
    }
  }

  async saveUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/preferences/user`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(preferences)
      })
      
      return response.ok
    } catch (error) {
      console.error('Error saving user preferences:', error)
      return false
    }
  }

  async getUserTabs(userId: string): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/preferences/tabs`, {
        headers: await this.getAuthHeaders()
      })
      
      if (!response.ok) {
        console.warn('Failed to fetch user tabs:', response.status)
        return []
      }
      
      const data = await response.json()
      return data.tabs || []
    } catch (error) {
      console.error('Error fetching user tabs:', error)
      return []
    }
  }

  async saveTab(userId: string, tab: any): Promise<any | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/preferences/tabs`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(tab)
      })
      
      if (!response.ok) {
        console.warn('Failed to save tab:', response.status)
        return null
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error saving tab:', error)
      return null
    }
  }

  async deleteTab(userId: string, tabId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/preferences/tabs/${tabId}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      })
      
      return response.ok
    } catch (error) {
      console.error('Error deleting tab:', error)
      return false
    }
  }

  async saveComponentLayouts(userId: string, tabId: string, layouts: any[]): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/preferences/layouts/bulk`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({
          tab_id: tabId,
          layouts: layouts
        })
      })
      
      return response.ok
    } catch (error) {
      console.error('Error saving component layouts:', error)
      return false
    }
  }

  // Fallback to localStorage if API is not available
  private useLocalStorageFallback(): boolean {
    // Check if API is available
    return false // For now, always try API first
  }
}

export const databaseService = new DatabaseService()
export default databaseService