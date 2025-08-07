// GZC Intel Theme System
export interface Theme {
  name: string
  // Core colors
  primary: string
  secondary: string
  accent: string
  
  // Backgrounds
  background: string
  surface: string
  surfaceAlt: string
  
  // Text colors
  text: string
  textSecondary: string
  textTertiary: string
  
  // Borders
  border: string
  borderLight: string
  
  // Status colors
  success: string
  danger: string
  warning: string
  info: string
  muted: string
  
  // Special effects
  gradient: string
  headerColor: string
  
  // Typography
  typography: {
    fontFamily: string
    h1: { fontSize: string; fontWeight: string; lineHeight: string }
    h2: { fontSize: string; fontWeight: string; lineHeight: string }
    h3: { fontSize: string; fontWeight: string; lineHeight: string }
    h4: { fontSize: string; fontWeight: string; lineHeight: string }
    body: { fontSize: string; fontWeight: string; lineHeight: string }
    bodySmall: { fontSize: string; fontWeight: string; lineHeight: string }
    bodyTiny: { fontSize: string; fontWeight: string; lineHeight: string }
    label: {
      fontSize: string
      fontWeight: string
      lineHeight: string
      textTransform: 'uppercase'
      letterSpacing: string
    }
  }
  
  // Spacing
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
    xxl: string
  }
  
  // Border radius
  borderRadius: {
    sm: string
    md: string
    lg: string
    xl: string
  }
  
  // Shadows
  shadows: {
    sm: string
    md: string
    lg: string
    xl: string
  }
  
  // Transitions
  transitions: {
    fast: string
    default: string
    slow: string
  }
}

// Standardized GZC Green System
const GZC_GREEN = {
  base: '#7A9E65',      // Primary institutional green
  light: '#95BD78',     // 20% lighter
  lighter: '#ABD38F',   // 40% lighter
  dark: '#5B7C4B',      // 20% darker
  darker: '#436138',    // 40% darker
  // Opacity variants (use with base color)
  opacity90: 'E6',      // 90% opacity
  opacity80: 'CC',      // 80% opacity
  opacity60: '99',      // 60% opacity
  opacity40: '66',      // 40% opacity
  opacity20: '33',      // 20% opacity
  opacity10: '1A'       // 10% opacity
}

// Shared configuration for all themes
const sharedConfig = {
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { fontSize: '18px', fontWeight: '600', lineHeight: '24px' },
    h2: { fontSize: '14px', fontWeight: '600', lineHeight: '20px' },
    h3: { fontSize: '12px', fontWeight: '500', lineHeight: '16px' },
    h4: { fontSize: '11px', fontWeight: '500', lineHeight: '14px' },
    body: { fontSize: '11px', fontWeight: '400', lineHeight: '16px' },
    bodySmall: { fontSize: '10px', fontWeight: '400', lineHeight: '14px' },
    bodyTiny: { fontSize: '9px', fontWeight: '400', lineHeight: '12px' },
    label: {
      fontSize: '9px',
      fontWeight: '500',
      lineHeight: '12px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px'
    }
  },
  spacing: {
    xs: '6px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px'
  },
  borderRadius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px'
  },
  transitions: {
    fast: 'all 0.15s ease',
    default: 'all 0.2s ease',
    slow: 'all 0.3s ease'
  }
}

export const themes: Record<string, Theme> = {
  // GZC Dark - Current dark theme (improved from quantum)
  'gzc-dark': {
    name: 'GZC Dark',
    primary: GZC_GREEN.base,
    secondary: GZC_GREEN.light,
    accent: GZC_GREEN.lighter,
    background: '#1A1A1A',
    surface: '#2A2A2A',
    surfaceAlt: '#3A3A3A',
    text: '#f8f6f0',
    textSecondary: '#c8c0b0',
    textTertiary: '#9a9488',
    border: '#3a3632',
    borderLight: '#3a3632' + GZC_GREEN.opacity40,
    success: GZC_GREEN.light,
    danger: '#D69A82',
    warning: '#E6D690',
    info: '#8BB4DD',
    muted: '#9a9488',
    gradient: `linear-gradient(135deg, ${GZC_GREEN.base} 0%, ${GZC_GREEN.light} 100%)`,
    headerColor: GZC_GREEN.base,
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
    },
    ...sharedConfig
  },
  
  // Analytics Dark - Optimized for data visualization
  'analytics-dark': {
    name: 'Analytics Dark',
    primary: '#7A9E65',       // Darker institutional green
    secondary: '#95BD78',     // Standard GZC green
    accent: '#ABD38F',        // Light green for highlights
    background: '#181A1B',    // Very dark for OLED screens
    surface: '#23272E',       // Charcoal for panels
    surfaceAlt: '#2F3136',    // Slightly lighter
    text: '#FFFFFF',          // Pure white for clarity
    textSecondary: '#B9BFC7', // Light gray
    textTertiary: '#8E9297',  // Medium gray
    border: '#3A3A3A',        // Subtle borders
    borderLight: '#3A3A3A80',
    success: '#C6F4D6',       // Light green for positive
    danger: '#F87171',        // Soft red
    warning: '#FCD34D',       // Amber warning
    info: '#60A5FA',          // Sky blue
    muted: '#6B7280',
    gradient: 'linear-gradient(135deg, #7A9E65 0%, #95BD78 100%)',
    headerColor: '#7A9E65',
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6)'
    },
    ...sharedConfig
  },
  
  // Terminal Green - Inspired by Bloomberg Terminal
  'terminal-green': {
    name: 'Terminal Green',
    primary: '#00FF41',       // Matrix green
    secondary: '#95BD78',     // GZC green secondary
    accent: '#ABD38F',        // Light accent
    background: '#0A0A0A',    // Pure black
    surface: '#141414',       // Near black
    surfaceAlt: '#1F1F1F',    // Dark surface
    text: '#E0E0E0',          // Light gray text (not green)
    textSecondary: '#B0B0B0', // Medium gray
    textTertiary: '#808080',  // Darker gray
    border: '#00FF4133',      // Green border with opacity
    borderLight: '#00FF411A',
    success: '#00FF41',
    danger: '#FF0033',        // Red for contrast
    warning: '#FFB800',       // Amber
    info: '#00B8FF',          // Cyan
    muted: '#666666',
    gradient: 'linear-gradient(135deg, #00FF41 0%, #95BD78 100%)',
    headerColor: '#00FF41',
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 255, 65, 0.1)',
      md: '0 4px 6px -1px rgba(0, 255, 65, 0.15)',
      lg: '0 10px 15px -3px rgba(0, 255, 65, 0.2)',
      xl: '0 20px 25px -5px rgba(0, 255, 65, 0.25)'
    },
    ...sharedConfig
  },

  // Trading Operations - Dark theme for trading (from port 3000)
  'trading-ops': {
    name: 'Trading Operations',
    primary: '#95BD78',
    secondary: '#95BD78CC',
    accent: '#95BD7866',
    background: '#0a0a0a',
    surface: '#1a1a1a',
    surfaceAlt: '#2a2a2a',
    text: '#ffffff',
    textSecondary: '#b0b0b0',
    textTertiary: '#808080',
    border: '#3a3a3a',
    borderLight: '#3a3a3a80',
    success: '#ABD38F',
    danger: '#DD8B8B',
    warning: '#95BD7866',
    info: '#0288d1',
    muted: '#666666',
    gradient: 'linear-gradient(135deg, #95BD78CC 0%, #95BD7866 100%)',
    headerColor: '#8FB377',
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
    },
    ...sharedConfig
  },

  // Professional - Sea blue theme for risk management
  'professional': {
    name: 'Professional',
    primary: '#95BD78',
    secondary: '#95BD78CC',
    accent: '#95BD7866',
    background: '#0a1421',     // Deep sea blue background
    surface: '#142236',        // Sea blue surface
    surfaceAlt: '#1c3048',     // Lighter sea blue
    text: '#ffffff',
    textSecondary: '#a8c5d8',  // Light blue-grey
    textTertiary: '#7a97b0',   // Medium blue-grey
    border: '#2a4058',         // Sea blue border
    borderLight: '#2a405880',
    success: '#ABD38F',
    danger: '#DD8B8B',
    warning: '#95BD7866',
    info: '#4db8e8',           // Bright sea blue for info
    muted: '#5a7a90',          // Muted sea blue
    gradient: 'linear-gradient(135deg, #95BD78CC 0%, #95BD7866 100%)',
    headerColor: '#4db8e8',    // Sea blue header
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
    },
    ...sharedConfig
  },
  
  // Midnight Trading - Ultra dark for extended sessions
  'midnight-trading': {
    name: 'Midnight Trading',
    primary: '#8FB377',       // Softer GZC green for dark
    secondary: '#7A9E65',     // Darker green
    accent: '#C6F4D6',        // Light green accent
    background: '#0D0D0D',    // Almost black
    surface: '#1A1A1A',       // Very dark surface
    surfaceAlt: '#262626',    // Slightly lighter
    text: '#E5E5E5',          // Off-white for less strain
    textSecondary: '#A3A3A3', // Medium gray
    textTertiary: '#737373',  // Darker gray
    border: '#404040',        // Subtle border
    borderLight: '#40404080',
    success: '#4ADE80',       // Modern green
    danger: '#EF4444',        // Modern red
    warning: '#F59E0B',       // Modern amber
    info: '#3B82F6',          // Modern blue
    muted: '#525252',
    gradient: 'linear-gradient(135deg, #8FB377 0%, #7A9E65 100%)',
    headerColor: '#8FB377',
    shadows: {
      sm: '0 1px 3px 0 rgba(0, 0, 0, 0.5)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.6)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.7)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.8)'
    },
    ...sharedConfig
  },
  
  // Quantum Analytics - Modern gradient theme
  'quantum-analytics': {
    name: 'Quantum Analytics',
    primary: '#95BD78',
    secondary: '#7A9E65',
    accent: '#ABD38F',
    background: '#12141A',    // Deep space blue-black
    surface: '#1C1E26',       // Dark blue-gray
    surfaceAlt: '#262833',    // Lighter blue-gray
    text: '#F0F0F0',          // Bright white
    textSecondary: '#B8BCC8', // Blue-tinted gray
    textTertiary: '#8B91A1',  // Darker blue-gray
    border: '#2E3141',        // Blue-tinted border
    borderLight: '#2E314180',
    success: '#95BD78',       // GZC green
    danger: '#FF6B6B',        // Coral red
    warning: '#FFD93D',       // Bright yellow
    info: '#4ECDC4',          // Teal
    muted: '#5C6370',
    gradient: 'linear-gradient(135deg, #95BD78 0%, #4ECDC4 50%, #7A9E65 100%)',
    headerColor: '#95BD78',
    shadows: {
      sm: '0 2px 4px 0 rgba(0, 0, 0, 0.3)',
      md: '0 6px 8px -1px rgba(0, 0, 0, 0.4)',
      lg: '0 12px 16px -3px rgba(0, 0, 0, 0.5)',
      xl: '0 24px 32px -5px rgba(0, 0, 0, 0.6)'
    },
    ...sharedConfig
  },

  // GZC Light - Light theme with optimized GZC colors
  'institutional': {
    name: 'GZC Light',
    primary: GZC_GREEN.dark,      // Darker green for light backgrounds
    secondary: GZC_GREEN.base,    
    accent: GZC_GREEN.light,      
    background: '#FAFAFA',        // Soft white background
    surface: '#FFFFFF',           // Pure white for cards
    surfaceAlt: '#F5F5F5',        // Light grey surface
    text: '#1F2937',              // Charcoal text for excellent readability
    textSecondary: '#4B5563',     // Medium grey
    textTertiary: '#6B7280',      // Lighter grey
    border: '#E5E7EB',            // Subtle border
    borderLight: '#F3F4F6',       // Very light border
    success: GZC_GREEN.dark,      
    danger: '#DC2626',            // Clear red
    warning: '#D97706',           // Amber warning
    info: '#2563EB',              // Clear blue
    muted: '#9CA3AF',             // Muted grey
    gradient: `linear-gradient(135deg, ${GZC_GREEN.dark} 0%, ${GZC_GREEN.base} 100%)`,
    headerColor: GZC_GREEN.dark,
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.10)'
    },
    ...sharedConfig
  },
  
  // Arctic - Cool blue-grey light theme
  'arctic': {
    name: 'Arctic',
    primary: GZC_GREEN.dark,      // Back to GZC green
    secondary: GZC_GREEN.base,
    accent: GZC_GREEN.light,
    background: '#F0F4F8',        // Cool blue-grey
    surface: '#FFFFFF',
    surfaceAlt: '#E2E8F0',        // Blue-grey surface
    text: '#1A202C',              // Dark blue-grey
    textSecondary: '#4A5568',
    textTertiary: '#718096',
    border: '#CBD5E0',            // Blue-grey border
    borderLight: '#E2E8F0',
    success: GZC_GREEN.base,
    danger: '#F56565',
    warning: '#ED8936',
    info: '#4299E1',
    muted: '#A0AEC0',
    gradient: `linear-gradient(135deg, ${GZC_GREEN.dark} 0%, ${GZC_GREEN.base} 100%)`,
    headerColor: GZC_GREEN.dark,
    shadows: {
      sm: '0 1px 3px rgba(0, 0, 0, 0.12)',
      md: '0 4px 6px rgba(0, 0, 0, 0.15)',
      lg: '0 10px 20px rgba(0, 0, 0, 0.15)',
      xl: '0 25px 50px rgba(0, 0, 0, 0.15)'
    },
    ...sharedConfig
  },
  
  // Parchment - Warm silver theme
  'parchment': {
    name: 'Parchment',
    primary: '#6B7280',           // Warm grey-silver
    secondary: '#8B95A6',         // Lighter silver-blue
    accent: '#A5AFBF',            // Light silver
    background: '#FAF9F7',        // Warm white with silver tone
    surface: '#FFFFFF',
    surfaceAlt: '#F5F4F2',        // Warm silver-grey
    text: '#2D3436',              // Charcoal with warm undertone
    textSecondary: '#4A5255',
    textTertiary: '#636E72',
    border: '#DDD9D5',            // Warm silver border
    borderLight: '#EDEBE8',
    success: GZC_GREEN.base,      // Keep GZC green for success
    danger: '#E17055',            // Softer coral red
    warning: '#FDCB6E',           // Warm yellow
    info: '#74B9FF',              // Soft blue
    muted: '#95A3A6',
    gradient: 'linear-gradient(135deg, #6B7280 0%, #A5AFBF 100%)',
    headerColor: '#6B7280',
    shadows: {
      sm: '0 1px 2px rgba(45, 52, 54, 0.06)',
      md: '0 3px 6px rgba(45, 52, 54, 0.10)',
      lg: '0 8px 16px rgba(45, 52, 54, 0.12)',
      xl: '0 16px 32px rgba(45, 52, 54, 0.15)'
    },
    ...sharedConfig
  },
  
  // Pearl - Soft pearl light theme with blue accents
  'pearl': {
    name: 'Pearl',
    primary: '#4A6FA5',           // Soft steel blue
    secondary: '#6B8EBF',         // Lighter steel blue
    accent: '#8BA6D0',            // Light blue accent
    background: '#FAFBFC',        // Pearl white with cool tone
    surface: '#FFFFFF',
    surfaceAlt: '#F0F3F7',        // Light pearl grey
    text: '#1E3A5F',              // Dark blue text
    textSecondary: '#3D5875',
    textTertiary: '#5C7089',
    border: '#D6E0E9',            // Light blue-grey
    borderLight: '#E7EEF4',
    success: GZC_GREEN.base,      // Keep GZC green for success
    danger: '#E57373',
    warning: '#FFB74D',
    info: '#64B5F6',
    muted: '#90A4AE',
    gradient: 'linear-gradient(135deg, #4A6FA5 0%, #8BA6D0 100%)',
    headerColor: '#4A6FA5',
    shadows: {
      sm: '0 2px 4px rgba(74, 111, 165, 0.08)',
      md: '0 4px 8px rgba(74, 111, 165, 0.12)',
      lg: '0 12px 24px rgba(74, 111, 165, 0.16)',
      xl: '0 24px 48px rgba(74, 111, 165, 0.20)'
    },
    ...sharedConfig
  }
}

// Export the default theme
export const defaultTheme = themes['gzc-dark']