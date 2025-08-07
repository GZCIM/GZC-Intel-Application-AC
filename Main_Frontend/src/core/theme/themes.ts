import { ThemeConfig } from './types'

export const professionalTheme: ThemeConfig = {
  id: 'professional',
  name: 'Professional',
  description: 'Clean, modern theme for professional trading environments',
  category: 'professional',
  colors: {
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#0ea5e9',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem'
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem'
  },
  borderRadius: {
    none: '0',
    sm: '0.25rem',
    base: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px'
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
  },
  animations: {
    transition: 'all 0.2s ease-in-out',
    duration: {
      fast: '0.1s',
      normal: '0.2s',
      slow: '0.3s'
    }
  }
}

export const institutionalTheme: ThemeConfig = {
  id: 'institutional',
  name: 'Institutional',
  description: 'Sophisticated theme for institutional trading platforms',
  category: 'institutional',
  colors: {
    primary: '#1e40af',
    secondary: '#374151',
    accent: '#059669',
    background: '#f9fafb',
    surface: '#ffffff',
    text: '#111827',
    textSecondary: '#6b7280',
    border: '#d1d5db',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    info: '#2563eb'
  },
  typography: {
    fontFamily: '"Source Sans Pro", "Helvetica Neue", sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem'
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem'
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px'
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
  },
  animations: {
    transition: 'all 0.15s ease-in-out',
    duration: {
      fast: '0.1s',
      normal: '0.15s',
      slow: '0.25s'
    }
  }
}

export const enterpriseTheme: ThemeConfig = {
  id: 'enterprise',
  name: 'Enterprise',
  description: 'Premium theme for enterprise financial platforms',
  category: 'enterprise',
  colors: {
    primary: '#7c3aed',
    secondary: '#4b5563',
    accent: '#06b6d4',
    background: '#fefefe',
    surface: '#f8fafc',
    text: '#0f172a',
    textSecondary: '#475569',
    border: '#e2e8f0',
    success: '#059669',
    warning: '#ea580c',
    error: '#dc2626',
    info: '#0ea5e9'
  },
  typography: {
    fontFamily: '"IBM Plex Sans", "SF Pro Display", sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem'
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem'
  },
  borderRadius: {
    none: '0',
    sm: '0.25rem',
    base: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.25rem',
    full: '9999px'
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
  },
  animations: {
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    duration: {
      fast: '0.15s',
      normal: '0.3s',
      slow: '0.45s'
    }
  }
}

export const defaultThemes = new Map([
  [professionalTheme.id, professionalTheme],
  [institutionalTheme.id, institutionalTheme],
  [enterpriseTheme.id, enterpriseTheme]
])