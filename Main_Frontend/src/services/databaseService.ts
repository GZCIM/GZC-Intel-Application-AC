/**
 * Database Service for PostgreSQL persistence
 * Connects to backend API for user preferences, tabs, and components
 */

import { PublicClientApplication } from '@azure/msal-browser'
import { loginRequest } from '../modules/shell/components/auth/msalConfig'

// Use main gateway backend for database API (not FSS!)
const API_BASE_URL = import.meta.env.PROD 
  ? '/api'  // Use relative URL in production (goes through nginx to port 5000)
  : 'http://localhost:5000/api'  // Main gateway backend in development

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
  private getMsalInstance(): PublicClientApplication | null {
    // CRITICAL: Use the shared MSAL instance with authentication state
    return (window as any).msalInstance || null
  }
  
  private async getAuthHeaders(): Promise<HeadersInit> {
    try {
      const msalInstance = this.getMsalInstance()
      if (!msalInstance) {
        console.warn('🚨 MSAL instance not available for database service')
        return { 'Content-Type': 'application/json' }
      }
      
      // Get authenticated accounts from the shared MSAL instance
      const accounts = msalInstance.getAllAccounts()
      console.log('🔐 Database service: Found', accounts.length, 'MSAL accounts')
      
      if (accounts.length > 0) {
        // User is authenticated, get real Azure AD token
        const response = await msalInstance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0]
        })
        
        console.log('✅ Database service: Got access token for', accounts[0].username)
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${response.accessToken}`
        }
      } else {
        console.warn('🚫 Database service: No authenticated accounts found')
      }
    } catch (error) {
      console.warn('❌ Failed to acquire MSAL token:', error)
      
      // Handle token expiration gracefully without popup
      if (error instanceof Error && (error.name === 'InteractionRequiredAuthError' || error.message?.includes('refresh_token_expired'))) {
        console.warn('🔄 Database service: Token expired - continuing without auth for this request')
        // Return headers without auth instead of completely blocking
        return { 'Content-Type': 'application/json' }
      }
      
      // For other auth errors, still try popup (needed for initial login)
      const msalInstance = this.getMsalInstance()
      if (msalInstance) {
        try {
          console.log('🔄 Database service: Attempting interactive authentication...')
          const response = await msalInstance.acquireTokenPopup(loginRequest)
          console.log('✅ Database service: Interactive auth successful')
          return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${response.accessToken}`
          }
        } catch (interactiveError) {
          console.error('❌ Interactive auth failed:', interactiveError)
        }
      }
    }
    
    // No auth available
    console.warn('🚫 Database service: No authentication available')
    return {
      'Content-Type': 'application/json'
    }
  }

  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/preferences/user`, {
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
      const response = await fetch(`${API_BASE_URL}/preferences/user`, {
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
      const response = await fetch(`${API_BASE_URL}/preferences/tabs`, {
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
      const response = await fetch(`${API_BASE_URL}/preferences/tabs`, {
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
      const response = await fetch(`${API_BASE_URL}/preferences/tabs/${tabId}`, {
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
      const response = await fetch(`${API_BASE_URL}/preferences/layouts/bulk`, {
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