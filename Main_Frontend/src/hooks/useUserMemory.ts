// useUserMemory Hook - Phase 1 Implementation
// Minimal integration hook for user memory service

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useAuthContext } from '../modules/ui-library'
import { 
  UserMemoryService, 
  createUserMemoryService,
  SessionStorageUserMemoryService 
} from '../services/UserMemoryService'

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
  const auth = useAuthContext?.() as { getToken: () => Promise<string> } | undefined
  const [userInfo, setUserInfo] = useState(() => getTempUserInfo())
  const [service, setService] = useState<UserMemoryService>(() =>
    userInfo ? createUserMemoryService(userInfo.userId, userInfo.tenantId, userInfo.accessToken) :
    new SessionStorageUserMemoryService('anonymous')
  )

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

  // Initialize or refresh the DB-backed service when auth is available
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
            setService(createUserMemoryService(effective.userId, effective.tenantId, effective.accessToken))
          }
          return
        }
      } catch (_) {
        // Fall back below
      }
      if (!cancelled) {
        const temp = getTempUserInfo()
        setUserInfo(temp)
        setService(createUserMemoryService(temp.userId, temp.tenantId, temp.accessToken))
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

  // Layout management
  const saveLayoutData = useCallback(async (tabId: string, layout: any): Promise<void> => {
    await withFallback(
      () => service.saveLayout(tabId, layout),
      undefined,
      'save layout'
    )
  }, [service, withFallback])

  const loadLayoutData = useCallback(async (tabId: string): Promise<any | null> => {
    return await withFallback(
      () => service.loadLayout(tabId),
      null,
      'load layout'
    )
  }, [service, withFallback])

  // Theme management
  const saveThemeData = useCallback(async (theme: string): Promise<void> => {
    await withFallback(
      () => service.saveTheme(theme),
      undefined,
      'save theme'
    )
  }, [service, withFallback])

  const loadThemeData = useCallback(async (): Promise<string | null> => {
    return await withFallback(
      () => service.loadTheme(),
      null,
      'load theme'
    )
  }, [service, withFallback])

  // Component state management
  const saveComponentStateData = useCallback(async (componentId: string, state: any): Promise<void> => {
    await withFallback(
      () => service.saveComponentState(componentId, state),
      undefined,
      'save component state'
    )
  }, [service, withFallback])

  const loadComponentStateData = useCallback(async (componentId: string): Promise<any> => {
    return await withFallback(
      () => service.loadComponentState(componentId),
      {},
      'load component state'
    )
  }, [service, withFallback])

  // Preferences management
  const savePreferenceData = useCallback(async (key: string, value: any): Promise<void> => {
    await withFallback(
      () => service.savePreference(key, value),
      undefined,
      'save preference'
    )
  }, [service, withFallback])

  const loadPreferenceData = useCallback(async (key: string): Promise<any> => {
    return await withFallback(
      () => service.loadPreference(key),
      null,
      'load preference'
    )
  }, [service, withFallback])

  return {
    // Layout functions - replace localStorage calls
    saveLayoutData,
    loadLayoutData,
    
    // Theme functions - replace localStorage calls
    saveThemeData,
    loadThemeData,
    
    // Component state functions
    saveComponentStateData,
    loadComponentStateData,
    
    // Preferences functions
    savePreferenceData,
    loadPreferenceData,
    
    // Service info for debugging
    userInfo,
    serviceType: service.constructor.name
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