// useUserMemory Hook - Phase 1 Implementation
// Minimal integration hook for user memory service

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useAuthContext } from '../modules/ui-library'
import { cosmosConfigService } from '../services/cosmosConfigService'

// TODO: Replace with actual MSAL integration
// For now, using temporary user identification
function getTempUserInfo() {
  // Generate or retrieve temporary user ID for development
  let tempUserId = sessionStorage.getItem('temp_user_id')
  if (!tempUserId) {
    tempUserId = `temp_user_${Date.now()}`
    sessionStorage.setItem('temp_user_id', tempUserId)
  }
  
  return {
    userId: tempUserId,
    tenantId: 'default_tenant',
    accessToken: undefined // No token for now
  }
}

export function useUserMemory() {
  // Try to use auth context but handle case where it's not available
  let auth: { getToken: () => Promise<string> } | undefined
  try {
    auth = useAuthContext()
  } catch (error) {
    // AuthContext not available yet - this is ok during initial render
    auth = undefined
  }
  const [userInfo, setUserInfo] = useState(() => getTempUserInfo())

  // Decode JWT payload (base64url) safely
  const decodeJwt = useCallback((token: string): Record<string, any> | null => {
    try {
      const part = token.split('.')[1]
      if (!part) return null
      const padded = part + '='.repeat((4 - (part.length % 4)) % 4)
      const json = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
      return JSON.parse(json)
    } catch {
      return null
    }
  }, [])

  // Initialize user info when auth is available
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      try {
        if (auth?.getToken) {
          const token = await auth.getToken()
          const claims = decodeJwt(token)
          const derivedUserId = (claims?.oid || claims?.sub || claims?.preferred_username || claims?.email || 'anonymous') as string
          const derivedTenantId = (claims?.tid || 'default_tenant') as string
          const effective = { userId: derivedUserId, tenantId: derivedTenantId, accessToken: token }
          if (!cancelled) {
            setUserInfo(effective)
          }
          return
        }
      } catch (_) {
        // Fall back below
      }
      if (!cancelled) {
        const temp = getTempUserInfo()
        setUserInfo(temp)
      }
    }
    init()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.getToken])

  // Graceful error handling wrapper
  const withFallback = useCallback(async <T>(
    operation: () => Promise<T>, 
    fallbackValue: T,
    operationName: string
  ): Promise<T> => {
    try {
      return await operation()
    } catch (error) {
      console.warn(`User memory ${operationName} failed, continuing without persistence:`, error)
      return fallbackValue
    }
  }, [])

  // Layout management - now using Cosmos DB
  const saveLayoutData = useCallback(async (tabId: string, layout: any): Promise<void> => {
    await withFallback(async () => {
      // Load current config, update just the layout for this tab, save back
      const config = await cosmosConfigService.loadConfiguration() || { 
        tabs: [], layouts: [], preferences: {}, componentStates: {}, userMemory: {}
      }
      if (!config.userMemory) config.userMemory = {}
      config.userMemory[`layout_${tabId}`] = layout
      await cosmosConfigService.saveConfiguration(config)
    }, undefined, 'save layout')
  }, [withFallback])

  const loadLayoutData = useCallback(async (tabId: string): Promise<any | null> => {
    return await withFallback(async () => {
      const config = await cosmosConfigService.loadConfiguration()
      return config?.userMemory?.[`layout_${tabId}`] || null
    }, null, 'load layout')
  }, [withFallback])

  // Theme management - now using Cosmos DB
  const saveThemeData = useCallback(async (theme: string): Promise<void> => {
    await withFallback(async () => {
      const config = await cosmosConfigService.loadConfiguration() || { 
        tabs: [], layouts: [], preferences: {}, componentStates: {}, userMemory: {}
      }
      if (!config.preferences) config.preferences = {}
      config.preferences.theme = theme
      await cosmosConfigService.saveConfiguration(config)
    }, undefined, 'save theme')
  }, [withFallback])

  const loadThemeData = useCallback(async (): Promise<string | null> => {
    return await withFallback(async () => {
      const config = await cosmosConfigService.loadConfiguration()
      return config?.preferences?.theme || null
    }, null, 'load theme')
  }, [withFallback])

  // Component state management - clean professional API
  const saveComponentStateData = useCallback(async (componentId: string, state: any): Promise<void> => {
    await withFallback(() => cosmosConfigService.updateComponentState(componentId, state), undefined, 'save component state')
  }, [withFallback])

  const loadComponentStateData = useCallback(async (componentId: string): Promise<any> => {
    return await withFallback(() => cosmosConfigService.getComponentState(componentId), {}, 'load component state')
  }, [withFallback])

  // Preferences management - clean professional API
  const savePreferenceData = useCallback(async (key: string, value: any): Promise<void> => {
    await withFallback(() => cosmosConfigService.updatePreference(key, value), undefined, 'save preference')
  }, [withFallback])

  const loadPreferenceData = useCallback(async (key: string): Promise<any> => {
    return await withFallback(() => cosmosConfigService.getPreference(key), null, 'load preference')
  }, [withFallback])

  return {
    // Layout functions - now using Cosmos DB
    saveLayoutData,
    loadLayoutData,
    
    // Theme functions - now using Cosmos DB
    saveThemeData,
    loadThemeData,
    
    // Component state functions - now using Cosmos DB
    saveComponentStateData,
    loadComponentStateData,
    
    // Preferences functions - now using Cosmos DB
    savePreferenceData,
    loadPreferenceData,
    
    // Service info for debugging
    userInfo,
    serviceType: 'CosmosDB'
  }
}

// Debounced saver utility for preventing excessive saves during drag/resize
export class DebouncedUserMemorySaver {
  private timeouts = new Map<string, NodeJS.Timeout>()
  private saveFunction: (key: string, data: any) => Promise<void>
  
  constructor(saveFunction: (key: string, data: any) => Promise<void>) {
    this.saveFunction = saveFunction
  }
  
  save(key: string, data: any, delay = 500) {
    // Clear existing timeout
    const existing = this.timeouts.get(key)
    if (existing) clearTimeout(existing)
    
    // Set new timeout
    const timeout = setTimeout(async () => {
      try {
        await this.saveFunction(key, data)
        this.timeouts.delete(key)
      } catch (error) {
        console.error('Debounced save failed:', error)
      }
    }, delay)
    
    this.timeouts.set(key, timeout)
  }
  
  flush(key?: string) {
    if (key) {
      const timeout = this.timeouts.get(key)
      if (timeout) {
        clearTimeout(timeout)
        this.timeouts.delete(key)
      }
    } else {
      // Flush all timeouts
      this.timeouts.forEach((timeout) => clearTimeout(timeout))
      this.timeouts.clear()
    }
  }
}

// Hook for debounced saving during drag/resize operations
export function useDebouncedUserMemory() {
  const { saveLayoutData } = useUserMemory()
  
  const debouncedSaver = useMemo(() => 
    new DebouncedUserMemorySaver(saveLayoutData), 
    [saveLayoutData]
  )
  
  return {
    saveLayout: (tabId: string, layout: any, delay?: number) => 
      debouncedSaver.save(tabId, layout, delay),
    flushSaves: (tabId?: string) => debouncedSaver.flush(tabId)
  }
}