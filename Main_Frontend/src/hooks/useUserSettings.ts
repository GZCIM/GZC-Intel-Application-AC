import { useState, useEffect, useCallback } from 'react'
import { UserSettings, UserLayout } from '../services/redis/userSettingsClient'

// API endpoints for user settings
const API_BASE = '/api/user'

export interface UseUserSettingsReturn {
  settings: UserSettings | null
  layouts: UserLayout[]
  isLoading: boolean
  error: string | null
  
  // Settings operations
  updateSettings: (updates: Partial<UserSettings>) => Promise<boolean>
  updatePreference: (key: string, value: any) => Promise<boolean>
  
  // Layout operations
  saveLayout: (layout: Omit<UserLayout, 'userId'>) => Promise<boolean>
  deleteLayout: (layoutId: string) => Promise<boolean>
  setActiveLayout: (layoutId: string) => Promise<boolean>
  
  // Tab history
  addToTabHistory: (tabInfo: any) => Promise<boolean>
  getTabHistory: (limit?: number) => Promise<any[]>
  
  // Component config
  saveComponentConfig: (componentId: string, config: any) => Promise<boolean>
  getComponentConfig: (componentId: string) => Promise<any>
  
  // Utility
  refresh: () => Promise<void>
  exportUserData: () => Promise<any>
}

export function useUserSettings(userId: string): UseUserSettingsReturn {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [layouts, setLayouts] = useState<UserLayout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch user settings
  const fetchSettings = useCallback(async () => {
    if (!userId) return

    try {
      const response = await fetch(`${API_BASE}/${userId}/settings`)
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Failed to load user settings')
    }
  }, [userId])

  // Fetch user layouts
  const fetchLayouts = useCallback(async () => {
    if (!userId) return

    try {
      const response = await fetch(`${API_BASE}/${userId}/layouts`)
      if (response.ok) {
        const data = await response.json()
        setLayouts(data)
      }
    } catch (err) {
      console.error('Error fetching layouts:', err)
    }
  }, [userId])

  // Initial load
  useEffect(() => {
    const loadUserData = async () => {
      setIsLoading(true)
      await Promise.all([fetchSettings(), fetchLayouts()])
      setIsLoading(false)
    }

    loadUserData()
  }, [userId, fetchSettings, fetchLayouts])

  // Update settings
  const updateSettings = useCallback(async (updates: Partial<UserSettings>): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/${userId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        setSettings(prev => ({ ...prev, ...updates } as UserSettings))
        return true
      }
      return false
    } catch (err) {
      console.error('Error updating settings:', err)
      return false
    }
  }, [userId])

  // Update preference
  const updatePreference = useCallback(async (key: string, value: any): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/${userId}/preferences/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      })

      if (response.ok) {
        setSettings(prev => ({
          ...prev!,
          preferences: { ...prev?.preferences, [key]: value }
        }))
        return true
      }
      return false
    } catch (err) {
      console.error('Error updating preference:', err)
      return false
    }
  }, [userId])

  // Save layout
  const saveLayout = useCallback(async (layout: Omit<UserLayout, 'userId'>): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/${userId}/layouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(layout)
      })

      if (response.ok) {
        await fetchLayouts()
        return true
      }
      return false
    } catch (err) {
      console.error('Error saving layout:', err)
      return false
    }
  }, [userId, fetchLayouts])

  // Delete layout
  const deleteLayout = useCallback(async (layoutId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/${userId}/layouts/${layoutId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setLayouts(prev => prev.filter(l => l.id !== layoutId))
        return true
      }
      return false
    } catch (err) {
      console.error('Error deleting layout:', err)
      return false
    }
  }, [userId])

  // Set active layout
  const setActiveLayout = useCallback(async (layoutId: string): Promise<boolean> => {
    return updateSettings({ defaultLayout: layoutId })
  }, [updateSettings])

  // Add to tab history
  const addToTabHistory = useCallback(async (tabInfo: any): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/${userId}/tabs/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tabInfo)
      })

      return response.ok
    } catch (err) {
      console.error('Error adding to tab history:', err)
      return false
    }
  }, [userId])

  // Get tab history
  const getTabHistory = useCallback(async (limit: number = 20): Promise<any[]> => {
    try {
      const response = await fetch(`${API_BASE}/${userId}/tabs/history?limit=${limit}`)
      if (response.ok) {
        return await response.json()
      }
      return []
    } catch (err) {
      console.error('Error getting tab history:', err)
      return []
    }
  }, [userId])

  // Save component config
  const saveComponentConfig = useCallback(async (componentId: string, config: any): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/${userId}/components/${componentId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      return response.ok
    } catch (err) {
      console.error('Error saving component config:', err)
      return false
    }
  }, [userId])

  // Get component config
  const getComponentConfig = useCallback(async (componentId: string): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE}/${userId}/components/${componentId}/config`)
      if (response.ok) {
        return await response.json()
      }
      return null
    } catch (err) {
      console.error('Error getting component config:', err)
      return null
    }
  }, [userId])

  // Export user data
  const exportUserData = useCallback(async (): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE}/${userId}/export`)
      if (response.ok) {
        return await response.json()
      }
      return null
    } catch (err) {
      console.error('Error exporting user data:', err)
      return null
    }
  }, [userId])

  // Refresh all data
  const refresh = useCallback(async () => {
    setIsLoading(true)
    await Promise.all([fetchSettings(), fetchLayouts()])
    setIsLoading(false)
  }, [fetchSettings, fetchLayouts])

  return {
    settings,
    layouts,
    isLoading,
    error,
    updateSettings,
    updatePreference,
    saveLayout,
    deleteLayout,
    setActiveLayout,
    addToTabHistory,
    getTabHistory,
    saveComponentConfig,
    getComponentConfig,
    refresh,
    exportUserData
  }
}