import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react'
import { ThemeConfig, ThemeState, ThemeContextValue, ThemePreferences } from './types'
import { defaultThemes } from './themes'

// Theme reducer
type ThemeAction = 
  | { type: 'SET_THEME'; payload: string }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<ThemePreferences> }
  | { type: 'REGISTER_THEME'; payload: ThemeConfig }
  | { type: 'UNREGISTER_THEME'; payload: string }
  | { type: 'LOAD_PERSISTED_STATE'; payload: Partial<ThemeState> }

const themeReducer = (state: ThemeState, action: ThemeAction): ThemeState => {
  switch (action.type) {
    case 'SET_THEME':
      return {
        ...state,
        currentTheme: action.payload
      }
    
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload
        }
      }
    
    case 'REGISTER_THEME':
      const newThemes = new Map(state.availableThemes)
      newThemes.set(action.payload.id, action.payload)
      return {
        ...state,
        availableThemes: newThemes
      }
    
    case 'UNREGISTER_THEME':
      const filteredThemes = new Map(state.availableThemes)
      filteredThemes.delete(action.payload)
      return {
        ...state,
        availableThemes: filteredThemes,
        currentTheme: state.currentTheme === action.payload ? 'professional' : state.currentTheme
      }
    
    case 'LOAD_PERSISTED_STATE':
      return {
        ...state,
        ...action.payload
      }
    
    default:
      return state
  }
}

const initialState: ThemeState = {
  currentTheme: 'professional',
  availableThemes: defaultThemes,
  customThemes: new Map(),
  preferences: {
    autoSwitch: false,
    darkMode: false,
    colorBlindMode: false,
    highContrast: false,
    compactMode: false,
    customProperties: {}
  }
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: string
  persistenceKey?: string
}

export function ThemeProvider({ 
  children, 
  defaultTheme = 'professional',
  persistenceKey = 'gzc-intel-theme'
}: ThemeProviderProps) {
  const [state, dispatch] = useReducer(themeReducer, {
    ...initialState,
    currentTheme: defaultTheme
  })

  // Load persisted state on mount
  useEffect(() => {
    try {
      const persisted = localStorage.getItem(persistenceKey)
      if (persisted) {
        const parsed = JSON.parse(persisted)
        dispatch({ type: 'LOAD_PERSISTED_STATE', payload: parsed })
      }
    } catch (error) {
      console.warn('Failed to load persisted theme state:', error)
    }
  }, [persistenceKey])

  // Persist state changes
  useEffect(() => {
    try {
      const toStore = {
        currentTheme: state.currentTheme,
        preferences: state.preferences,
        customThemes: Array.from(state.customThemes.entries())
      }
      localStorage.setItem(persistenceKey, JSON.stringify(toStore))
    } catch (error) {
      console.warn('Failed to persist theme state:', error)
    }
  }, [state.currentTheme, state.preferences, state.customThemes, persistenceKey])

  // Apply theme to DOM
  useEffect(() => {
    const theme = state.availableThemes.get(state.currentTheme)
    if (!theme) return

    const root = document.documentElement
    
    // Apply CSS custom properties
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--gzc-${key}`, value)
    })

    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--gzc-text-${key}`, value)
    })

    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--gzc-space-${key}`, value)
    })

    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--gzc-radius-${key}`, value)
    })

    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--gzc-shadow-${key}`, value)
    })

    // Apply font family
    root.style.setProperty('--gzc-font-family', theme.typography.fontFamily)

    // Apply transition settings
    root.style.setProperty('--gzc-transition', theme.animations.transition)

    // Apply preferences
    if (state.preferences.compactMode) {
      root.classList.add('gzc-compact')
    } else {
      root.classList.remove('gzc-compact')
    }

    if (state.preferences.highContrast) {
      root.classList.add('gzc-high-contrast')
    } else {
      root.classList.remove('gzc-high-contrast')
    }

    // Apply custom properties
    Object.entries(state.preferences.customProperties).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    // Set theme attribute
    root.setAttribute('data-theme', state.currentTheme)

  }, [state.currentTheme, state.availableThemes, state.preferences])

  const contextValue: ThemeContextValue = {
    theme: state.availableThemes.get(state.currentTheme) || defaultThemes.get('professional')!,
    themeId: state.currentTheme,
    setTheme: (themeId: string) => {
      dispatch({ type: 'SET_THEME', payload: themeId })
    },
    preferences: state.preferences,
    updatePreferences: (preferences: Partial<ThemePreferences>) => {
      dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences })
    },
    registerTheme: (theme: ThemeConfig) => {
      dispatch({ type: 'REGISTER_THEME', payload: theme })
    },
    unregisterTheme: (themeId: string) => {
      dispatch({ type: 'UNREGISTER_THEME', payload: themeId })
    },
    getAvailableThemes: () => Array.from(state.availableThemes.values()),
    createCustomTheme: (baseTheme: string, overrides: Partial<ThemeConfig>) => {
      const base = state.availableThemes.get(baseTheme) || defaultThemes.get('professional')!
      const customTheme: ThemeConfig = {
        ...base,
        ...overrides,
        id: overrides.id || `custom-${Date.now()}`,
        category: 'custom'
      }
      
      dispatch({ type: 'REGISTER_THEME', payload: customTheme })
      return customTheme
    }
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}