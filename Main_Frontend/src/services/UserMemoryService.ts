// User Memory Service - Phase 1 Implementation
// Independent service for user-scoped data persistence

export interface UserMemoryService {
  saveLayout(tabId: string, layout: any): Promise<void>
  loadLayout(tabId: string): Promise<any | null>
  saveTheme(theme: string): Promise<void>
  loadTheme(): Promise<string | null>
  saveComponentState(componentId: string, state: any): Promise<void>
  loadComponentState(componentId: string): Promise<any>
  savePreference(key: string, value: any): Promise<void>
  loadPreference(key: string): Promise<any>
}

interface ApiClient {
  post(url: string, data: any): Promise<{ data: any }>
  get(url: string, params?: { [key: string]: string }): Promise<{ data: any }>
  delete(url: string, params?: { [key: string]: string }): Promise<{ data: any }>
}

class SimpleApiClient implements ApiClient {
  private baseURL: string
  private headers: { [key: string]: string }

  constructor(baseURL: string, headers: { [key: string]: string } = {}) {
    this.baseURL = baseURL
    this.headers = {
      'Content-Type': 'application/json',
      ...headers
    }
  }

  async post(url: string, data: any): Promise<{ data: any }> {
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const responseData = await response.json()
    return { data: responseData }
  }

  async get(url: string, params?: { [key: string]: string }): Promise<{ data: any }> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : ''
    const response = await fetch(`${this.baseURL}${url}${queryString}`, {
      method: 'GET',
      headers: this.headers
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const responseData = await response.json()
    return { data: responseData }
  }

  async delete(url: string, params?: { [key: string]: string }): Promise<{ data: any }> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : ''
    const response = await fetch(`${this.baseURL}${url}${queryString}`, {
      method: 'DELETE',
      headers: this.headers
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const responseData = await response.json()
    return { data: responseData }
  }
}

export class DatabaseUserMemoryService implements UserMemoryService {
  private apiClient: ApiClient
  private userId: string
  private tenantId: string

  constructor(userId: string, tenantId: string, accessToken?: string) {
    this.userId = userId
    this.tenantId = tenantId
    
    const headers: Record<string, string> = accessToken 
      ? { 'Authorization': `Bearer ${accessToken}` }
      : {}
    
    const baseUrl = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api'
    this.apiClient = new SimpleApiClient(baseUrl, headers)
  }

  async saveLayout(tabId: string, layout: any): Promise<void> {
    try {
      await this.apiClient.post('/user-memory', {
        memoryType: 'layout',
        memoryKey: tabId,
        memoryData: layout,
        userId: this.userId,
        tenantId: this.tenantId
      })
    } catch (error) {
      console.error('Failed to save layout:', error)
      throw error
    }
  }

  async loadLayout(tabId: string): Promise<any | null> {
    try {
      const response = await this.apiClient.get(
        `/user-memory/layout/${tabId}`,
        { 
          user_id: this.userId, 
          tenant_id: this.tenantId 
        }
      )
      return response.data?.memoryData || null
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null // No layout found is expected
      }
      console.error('Failed to load layout:', error)
      throw error
    }
  }

  async saveTheme(theme: string): Promise<void> {
    try {
      await this.apiClient.post('/user-memory', {
        memoryType: 'theme',
        memoryKey: 'current',
        memoryData: { theme },
        userId: this.userId,
        tenantId: this.tenantId
      })
    } catch (error) {
      console.error('Failed to save theme:', error)
      throw error
    }
  }

  async loadTheme(): Promise<string | null> {
    try {
      const response = await this.apiClient.get(
        '/user-memory/theme/current',
        { 
          user_id: this.userId, 
          tenant_id: this.tenantId 
        }
      )
      return response.data?.memoryData?.theme || null
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null // No theme found is expected
      }
      console.warn('Failed to load theme, using default:', error)
      return null // Return null instead of throwing
    }
  }

  async saveComponentState(componentId: string, state: any): Promise<void> {
    try {
      await this.apiClient.post('/user-memory', {
        memoryType: 'component_state',
        memoryKey: componentId,
        memoryData: state,
        userId: this.userId,
        tenantId: this.tenantId
      })
    } catch (error) {
      console.error('Failed to save component state:', error)
      throw error
    }
  }

  async loadComponentState(componentId: string): Promise<any> {
    try {
      const response = await this.apiClient.get(
        `/user-memory/component_state/${componentId}`,
        { 
          user_id: this.userId, 
          tenant_id: this.tenantId 
        }
      )
      return response.data?.memoryData || {}
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return {} // No state found is expected
      }
      console.error('Failed to load component state:', error)
      return {} // Return empty state on error
    }
  }

  async savePreference(key: string, value: any): Promise<void> {
    try {
      await this.apiClient.post('/user-memory', {
        memoryType: 'preferences',
        memoryKey: key,
        memoryData: { value },
        userId: this.userId,
        tenantId: this.tenantId
      })
    } catch (error) {
      console.error('Failed to save preference:', error)
      throw error
    }
  }

  async loadPreference(key: string): Promise<any> {
    try {
      const response = await this.apiClient.get(
        `/user-memory/preferences/${key}`,
        { 
          user_id: this.userId, 
          tenant_id: this.tenantId 
        }
      )
      return response.data?.memoryData?.value || null
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null // No preference found is expected
      }
      console.error('Failed to load preference:', error)
      return null
    }
  }
}

// Session storage fallback for when service is unavailable
export class SessionStorageUserMemoryService implements UserMemoryService {
  private keyPrefix: string

  constructor(userId: string) {
    this.keyPrefix = `user_${userId}_`
  }

  async saveLayout(tabId: string, layout: any): Promise<void> {
    sessionStorage.setItem(`${this.keyPrefix}layout_${tabId}`, JSON.stringify(layout))
  }

  async loadLayout(tabId: string): Promise<any | null> {
    const stored = sessionStorage.getItem(`${this.keyPrefix}layout_${tabId}`)
    return stored ? JSON.parse(stored) : null
  }

  async saveTheme(theme: string): Promise<void> {
    sessionStorage.setItem(`${this.keyPrefix}theme`, theme)
  }

  async loadTheme(): Promise<string | null> {
    return sessionStorage.getItem(`${this.keyPrefix}theme`)
  }

  async saveComponentState(componentId: string, state: any): Promise<void> {
    sessionStorage.setItem(`${this.keyPrefix}component_${componentId}`, JSON.stringify(state))
  }

  async loadComponentState(componentId: string): Promise<any> {
    const stored = sessionStorage.getItem(`${this.keyPrefix}component_${componentId}`)
    return stored ? JSON.parse(stored) : {}
  }

  async savePreference(key: string, value: any): Promise<void> {
    sessionStorage.setItem(`${this.keyPrefix}pref_${key}`, JSON.stringify(value))
  }

  async loadPreference(key: string): Promise<any> {
    const stored = sessionStorage.getItem(`${this.keyPrefix}pref_${key}`)
    return stored ? JSON.parse(stored) : null
  }
}

// Factory function to create appropriate service
export function createUserMemoryService(
  userId: string, 
  tenantId: string, 
  accessToken?: string
): UserMemoryService {
  // Try database service first, fallback to session storage
  try {
    return new DatabaseUserMemoryService(userId, tenantId, accessToken)
  } catch (error) {
    console.warn('Database user memory service unavailable, using session storage fallback')
    return new SessionStorageUserMemoryService(userId)
  }
}