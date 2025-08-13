/**
 * Hook for component-level memory persistence across devices
 */

import { useState, useEffect, useCallback } from 'react'
import { memoryService } from '../services/memoryService'

export function useComponentMemory<T = any>(componentId: string, defaultState: T) {
  const [state, setState] = useState<T>(() => {
    // Load initial state from memory service
    const savedState = memoryService.getComponentState(componentId)
    return savedState && Object.keys(savedState).length > 0 ? savedState : defaultState
  })

  // Update memory service when state changes
  useEffect(() => {
    memoryService.updateComponentState(componentId, state)
  }, [componentId, state])

  // Enhanced setState that also syncs to cloud
  const setMemoryState = useCallback((newState: T | ((prev: T) => T)) => {
    setState(prev => {
      const nextState = typeof newState === 'function' 
        ? (newState as (prev: T) => T)(prev)
        : newState
      
      // Update memory service
      memoryService.updateComponentState(componentId, nextState)
      
      return nextState
    })
  }, [componentId])

  // Force sync to cloud
  const syncToCloud = useCallback(() => {
    memoryService.saveMemory(true)
  }, [])

  return [state, setMemoryState, syncToCloud] as const
}

/**
 * Example usage in a component:
 * 
 * const MyComponent = () => {
 *   const [settings, setSettings, syncToCloud] = useComponentMemory('my-component', {
 *     viewMode: 'grid',
 *     sortBy: 'date',
 *     filters: []
 *   })
 * 
 *   // Settings will persist across devices and browser sessions
 *   return (
 *     <div>
 *       <button onClick={() => setSettings({...settings, viewMode: 'list'})}>
 *         Change View
 *       </button>
 *       <button onClick={syncToCloud}>
 *         Save to Cloud
 *       </button>
 *     </div>
 *   )
 * }
 */