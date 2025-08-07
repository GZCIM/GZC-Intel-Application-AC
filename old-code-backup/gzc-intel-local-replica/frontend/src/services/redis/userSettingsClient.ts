import { createClient, RedisClientType } from 'redis'

// User settings key prefixes
const KEY_PREFIX = {
  USER_SETTINGS: 'gzc:user:settings:',
  USER_LAYOUTS: 'gzc:user:layouts:',
  USER_PREFERENCES: 'gzc:user:preferences:',
  USER_TAB_HISTORY: 'gzc:user:tabs:history:',
  USER_COMPONENT_CONFIG: 'gzc:user:components:config:'
}

export interface UserSettings {
  userId: string
  theme?: string
  defaultLayout?: string
  preferences?: {
    autoSave?: boolean
    showWelcome?: boolean
    defaultView?: string
    [key: string]: any
  }
  lastActivity?: string
  createdAt?: string
  updatedAt?: string
}

export interface UserLayout {
  id: string
  userId: string
  name: string
  tabs: any[]
  isDefault?: boolean
  isActive?: boolean
  createdAt: string
  updatedAt: string
}

class UserSettingsRedisClient {
  private client: RedisClientType | null = null
  private isConnected: boolean = false

  async connect() {
    if (this.isConnected) return

    try {
      // Get Redis connection from environment variables
      const redisUrl = process.env.REDIS_URL || process.env.AZURE_REDIS_CONNECTION_STRING
      
      if (!redisUrl) {
        console.warn('Redis URL not found in environment variables')
        return
      }

      this.client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 10000,
          reconnectStrategy: (retries) => {
            if (retries > 10) return false
            return Math.min(retries * 100, 3000)
          }
        }
      })

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err)
      })

      this.client.on('connect', () => {
        console.log('Redis Client Connected')
        this.isConnected = true
      })

      await this.client.connect()
    } catch (error) {
      console.error('Failed to connect to Redis:', error)
      this.isConnected = false
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit()
      this.isConnected = false
    }
  }

  // User Settings Operations
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    if (!this.client || !this.isConnected) return null

    try {
      const key = `${KEY_PREFIX.USER_SETTINGS}${userId}`
      const data = await this.client.get(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Error getting user settings:', error)
      return null
    }
  }

  async setUserSettings(userId: string, settings: Partial<UserSettings>): Promise<boolean> {
    if (!this.client || !this.isConnected) return false

    try {
      const key = `${KEY_PREFIX.USER_SETTINGS}${userId}`
      const existing = await this.getUserSettings(userId)
      
      const updatedSettings: UserSettings = {
        ...existing,
        ...settings,
        userId,
        updatedAt: new Date().toISOString(),
        createdAt: existing?.createdAt || new Date().toISOString()
      }

      await this.client.set(key, JSON.stringify(updatedSettings))
      return true
    } catch (error) {
      console.error('Error setting user settings:', error)
      return false
    }
  }

  // User Layouts Operations
  async getUserLayouts(userId: string): Promise<UserLayout[]> {
    if (!this.client || !this.isConnected) return []

    try {
      const pattern = `${KEY_PREFIX.USER_LAYOUTS}${userId}:*`
      const keys = await this.client.keys(pattern)
      
      const layouts = await Promise.all(
        keys.map(async (key) => {
          const data = await this.client!.get(key)
          return data ? JSON.parse(data) : null
        })
      )

      return layouts.filter(Boolean) as UserLayout[]
    } catch (error) {
      console.error('Error getting user layouts:', error)
      return []
    }
  }

  async saveUserLayout(userId: string, layout: Omit<UserLayout, 'userId'>): Promise<boolean> {
    if (!this.client || !this.isConnected) return false

    try {
      const key = `${KEY_PREFIX.USER_LAYOUTS}${userId}:${layout.id}`
      const layoutData: UserLayout = {
        ...layout,
        userId,
        updatedAt: new Date().toISOString()
      }

      await this.client.set(key, JSON.stringify(layoutData))
      
      // Update user's active layout if specified
      if (layout.isActive) {
        await this.setUserSettings(userId, { defaultLayout: layout.id })
      }

      return true
    } catch (error) {
      console.error('Error saving user layout:', error)
      return false
    }
  }

  async deleteUserLayout(userId: string, layoutId: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false

    try {
      const key = `${KEY_PREFIX.USER_LAYOUTS}${userId}:${layoutId}`
      const result = await this.client.del(key)
      return result > 0
    } catch (error) {
      console.error('Error deleting user layout:', error)
      return false
    }
  }

  // User Preferences Operations
  async getUserPreference(userId: string, preferenceKey: string): Promise<any> {
    if (!this.client || !this.isConnected) return null

    try {
      const key = `${KEY_PREFIX.USER_PREFERENCES}${userId}:${preferenceKey}`
      const data = await this.client.get(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Error getting user preference:', error)
      return null
    }
  }

  async setUserPreference(userId: string, preferenceKey: string, value: any): Promise<boolean> {
    if (!this.client || !this.isConnected) return false

    try {
      const key = `${KEY_PREFIX.USER_PREFERENCES}${userId}:${preferenceKey}`
      await this.client.set(key, JSON.stringify(value))
      
      // Also update in main settings
      const settings = await this.getUserSettings(userId)
      await this.setUserSettings(userId, {
        preferences: {
          ...settings?.preferences,
          [preferenceKey]: value
        }
      })

      return true
    } catch (error) {
      console.error('Error setting user preference:', error)
      return false
    }
  }

  // Tab History Operations
  async addTabToHistory(userId: string, tabInfo: any): Promise<boolean> {
    if (!this.client || !this.isConnected) return false

    try {
      const key = `${KEY_PREFIX.USER_TAB_HISTORY}${userId}`
      const timestamp = Date.now()
      
      await this.client.zAdd(key, {
        score: timestamp,
        value: JSON.stringify({ ...tabInfo, timestamp })
      })

      // Keep only last 100 entries
      await this.client.zRemRangeByRank(key, 0, -101)
      
      return true
    } catch (error) {
      console.error('Error adding tab to history:', error)
      return false
    }
  }

  async getTabHistory(userId: string, limit: number = 20): Promise<any[]> {
    if (!this.client || !this.isConnected) return []

    try {
      const key = `${KEY_PREFIX.USER_TAB_HISTORY}${userId}`
      const history = await this.client.zRange(key, -limit, -1, { REV: true })
      
      return history.map(item => {
        try {
          return JSON.parse(item)
        } catch {
          return null
        }
      }).filter(Boolean)
    } catch (error) {
      console.error('Error getting tab history:', error)
      return []
    }
  }

  // Component Configuration Operations
  async getComponentConfig(userId: string, componentId: string): Promise<any> {
    if (!this.client || !this.isConnected) return null

    try {
      const key = `${KEY_PREFIX.USER_COMPONENT_CONFIG}${userId}:${componentId}`
      const data = await this.client.get(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Error getting component config:', error)
      return null
    }
  }

  async setComponentConfig(userId: string, componentId: string, config: any): Promise<boolean> {
    if (!this.client || !this.isConnected) return false

    try {
      const key = `${KEY_PREFIX.USER_COMPONENT_CONFIG}${userId}:${componentId}`
      await this.client.set(key, JSON.stringify({
        ...config,
        updatedAt: new Date().toISOString()
      }))
      return true
    } catch (error) {
      console.error('Error setting component config:', error)
      return false
    }
  }

  // Batch Operations
  async exportUserData(userId: string): Promise<any> {
    if (!this.client || !this.isConnected) return null

    try {
      const [settings, layouts, history] = await Promise.all([
        this.getUserSettings(userId),
        this.getUserLayouts(userId),
        this.getTabHistory(userId, 100)
      ])

      return {
        settings,
        layouts,
        history,
        exportedAt: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error exporting user data:', error)
      return null
    }
  }
}

// Export singleton instance
export const userSettingsClient = new UserSettingsRedisClient()

// Initialize connection on module load
if (typeof window === 'undefined') {
  // Server-side only
  userSettingsClient.connect().catch(console.error)
}