export interface ThemeConfig {
  id: string
  name: string
  description: string
  category: 'professional' | 'institutional' | 'enterprise' | 'custom'
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
    textSecondary: string
    border: string
    success: string
    warning: string
    error: string
    info: string
  }
  typography: {
    fontFamily: string
    fontSize: {
      xs: string
      sm: string
      base: string
      lg: string
      xl: string
      '2xl': string
      '3xl': string
    }
    fontWeight: {
      light: number
      normal: number
      medium: number
      semibold: number
      bold: number
    }
  }
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
    '2xl': string
  }
  borderRadius: {
    none: string
    sm: string
    base: string
    md: string
    lg: string
    xl: string
    full: string
  }
  shadows: {
    sm: string
    base: string
    md: string
    lg: string
    xl: string
  }
  animations: {
    transition: string
    duration: {
      fast: string
      normal: string
      slow: string
    }
  }
  components?: {
    [componentName: string]: Record<string, any>
  }
}

export interface ThemeState {
  currentTheme: string
  availableThemes: Map<string, ThemeConfig>
  customThemes: Map<string, ThemeConfig>
  preferences: ThemePreferences
}

export interface ThemePreferences {
  autoSwitch: boolean
  darkMode: boolean
  colorBlindMode: boolean
  highContrast: boolean
  compactMode: boolean
  customProperties: Record<string, string>
}

export interface ThemeContextValue {
  theme: ThemeConfig
  themeId: string
  setTheme: (themeId: string) => void
  preferences: ThemePreferences
  updatePreferences: (preferences: Partial<ThemePreferences>) => void
  registerTheme: (theme: ThemeConfig) => void
  unregisterTheme: (themeId: string) => void
  getAvailableThemes: () => ThemeConfig[]
  createCustomTheme: (baseTheme: string, overrides: Partial<ThemeConfig>) => ThemeConfig
}