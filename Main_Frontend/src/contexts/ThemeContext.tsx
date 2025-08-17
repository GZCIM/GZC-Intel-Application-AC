import React, { createContext, useContext, useState, useEffect } from 'react'
import { themes, Theme } from '../theme/themes'
import { useViewMemory } from '../hooks/useViewMemory'
import { useUserMemory } from '../hooks/useUserMemory'

interface ThemeContextType {
  currentTheme: Theme
  themeName: string
  setTheme: (themeName: string) => void
  availableThemes: string[]
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: string
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultTheme = 'gzc-dark' 
}) => {
  const { initializeThemeSystem, saveThemeSettings } = useViewMemory()
  const { saveThemeData, loadThemeData } = useUserMemory()
  const [themeName, setThemeName] = useState<string>(defaultTheme)
  const [isThemeLoaded, setIsThemeLoaded] = useState(false)

  // Load theme from user memory on mount
  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedTheme = await loadThemeData()
        if (savedTheme && themes[savedTheme]) {
          setThemeName(savedTheme)
        }
      } catch (error) {
        console.warn('Failed to load theme, using default:', error)
        // Use default theme on error - don't let theme loading break the app
        setThemeName(defaultTheme)
      } finally {
        setIsThemeLoaded(true)
      }
    }
    
    // Always set theme loaded after a short delay even if loading fails
    const timeout = setTimeout(() => {
      setIsThemeLoaded(true)
    }, 1000)
    
    loadSavedTheme().finally(() => {
      clearTimeout(timeout)
    })
  }, [loadThemeData, defaultTheme])

  const setTheme = async (newThemeName: string) => {
    if (themes[newThemeName]) {
      setThemeName(newThemeName)
      
      // Save to user memory instead of localStorage
      try {
        await saveThemeData(newThemeName)
      } catch (error) {
        console.warn('Failed to save theme to user memory:', error)
        // Theme still applied locally, just won't persist across sessions
      }
      
      // Update view memory with current theme (legacy support)
      saveThemeSettings({ currentTheme: newThemeName })
      
      // Apply theme to document root for CSS variables
      applyCSSVariables(themes[newThemeName], newThemeName)
    }
  }

  // Apply CSS variables to document root
  const applyCSSVariables = (theme: Theme, themeName: string) => {
    const root = document.documentElement
    
    // Set CSS variables
    root.style.setProperty('--theme-primary', theme.primary)
    root.style.setProperty('--theme-secondary', theme.secondary)
    root.style.setProperty('--theme-accent', theme.accent)
    root.style.setProperty('--theme-background', theme.background)
    root.style.setProperty('--theme-surface', theme.surface)
    root.style.setProperty('--theme-surface-alt', theme.surfaceAlt)
    root.style.setProperty('--theme-text', theme.text)
    root.style.setProperty('--theme-text-secondary', theme.textSecondary)
    root.style.setProperty('--theme-text-tertiary', theme.textTertiary)
    root.style.setProperty('--theme-border', theme.border)
    root.style.setProperty('--theme-border-light', theme.borderLight)
    root.style.setProperty('--theme-success', theme.success)
    root.style.setProperty('--theme-danger', theme.danger)
    root.style.setProperty('--theme-warning', theme.warning)
    root.style.setProperty('--theme-info', theme.info)
    
    // Set data attribute for theme-specific CSS
    root.setAttribute('data-theme', themeName)
  }

  // Apply theme when loaded or changed
  useEffect(() => {
    if (isThemeLoaded) {
      applyCSSVariables(themes[themeName], themeName)
    }
  }, [themeName, isThemeLoaded])

  // Initialize comprehensive theme system in view memory
  useEffect(() => {
    initializeThemeSystem()
  }, [initializeThemeSystem])

  const value: ThemeContextType = {
    currentTheme: themes[themeName] || themes['gzc-dark'], // Fallback to gzc-dark theme if undefined
    themeName,
    setTheme,
    availableThemes: Object.keys(themes)
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}