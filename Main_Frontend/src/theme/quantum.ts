// Quantum Theme - Exact replica from port 3000
export const quantumTheme = {
  // Core colors with warm undertones
  primary: '#95BD78',         // GZC Mid Green
  secondary: '#95BD78CC',     // 80% opacity
  accent: '#95BD7866',        // 40% opacity
  
  // Dark backgrounds with subtle brown undertones
  background: '#1A1A1A',      // Softer black from port 3200
  surface: '#2A2A2A',         // Surface from port 3200
  surfaceAlt: '#3A3A3A',      // Lighter surface from port 3200
  
  // Text colors with warm tones
  text: '#f8f6f0E6',          // Warm off-white, 90% opacity
  textSecondary: '#c8c0b0CC', // Lighter warm gray, 80% opacity
  textTertiary: '#9a948899',  // Even lighter warm gray, 60% opacity
  
  // Border colors
  border: '#3a3632',          // Warm dark border
  borderLight: '#3a363280',   // 50% opacity
  
  // Status colors
  success: '#A8CC88',         // Softer green
  danger: '#D69A82',          // Warmer red
  warning: '#95BD7866',       // Same as accent
  muted: '#9a948899',         // Muted text color
  
  // Special effects
  gradient: 'linear-gradient(135deg, #95BD78, #A8CC88)',
  headerColor: '#95BD78',
  
  // Typography
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
  
  // Spacing
  spacing: {
    xs: '6px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px'
  },
  
  // Border radius
  borderRadius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px'
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  },
  
  // Transitions
  transitions: {
    fast: 'all 0.15s ease',
    default: 'all 0.2s ease',
    slow: 'all 0.3s ease'
  }
}