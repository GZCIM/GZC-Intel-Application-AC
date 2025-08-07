import { useState, useEffect } from 'react'
import { componentRegistry } from './ComponentRegistry'
import { ComponentRegistryState, RegisteredComponent } from './types'

// Hook to subscribe to registry state
export function useComponentRegistry() {
  const [state, setState] = useState<ComponentRegistryState>(componentRegistry.getState())

  useEffect(() => {
    const unsubscribe = componentRegistry.subscribe(setState)
    return () => {
      unsubscribe()
    }
  }, [])

  return state
}

// Hook to get registry statistics
export function useRegistryStats() {
  const state = useComponentRegistry()
  
  return {
    ...componentRegistry.getStats(),
    state
  }
}

// Hook to get components by category
export function useComponentsByCategory(category: string) {
  const state = useComponentRegistry()
  
  return Array.from(state.components.values())
    .filter(comp => comp.manifest.category === category)
}

// Hook to get a specific component
export function useComponent(id: string) {
  const state = useComponentRegistry()
  
  return {
    component: state.components.get(id),
    isLoading: state.loading.has(id),
    error: state.errors.get(id)
  }
}

// Hook to load component dynamically
export function useComponentLoader() {
  const [loading, setLoading] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Map<string, string>>(new Map())

  const loadComponent = async (manifestUrl: string) => {
    setLoading(prev => new Set(prev).add(manifestUrl))
    
    try {
      const result = await componentRegistry.loadFromManifest(manifestUrl)
      
      if (!result.success) {
        setErrors(prev => new Map(prev).set(manifestUrl, result.error || 'Unknown error'))
      }
      
      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setErrors(prev => new Map(prev).set(manifestUrl, errorMsg))
      return { success: false, error: errorMsg }
    } finally {
      setLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(manifestUrl)
        return newSet
      })
    }
  }

  return {
    loadComponent,
    loading: Array.from(loading),
    errors: Object.fromEntries(errors)
  }
}