# GZC Intel App - Style Guide & Design System

## Theme System Architecture

### Core Theme Structure
```typescript
interface Theme {
  name: string
  // Core colors
  primary: string      // Main brand color
  secondary: string    // Supporting color
  accent: string       // Highlight color
  
  // Backgrounds
  background: string   // Main app background
  surface: string      // Card/panel backgrounds
  surfaceAlt: string   // Alternative surface color
  
  // Text colors
  text: string         // Primary text
  textSecondary: string // Secondary text
  textTertiary: string // Tertiary text
  
  // Borders
  border: string       // Standard borders
  borderLight: string  // Subtle borders
  
  // Status colors
  success: string      // Always GZC green
  danger: string       // Error states
  warning: string      // Warning states
  info: string         // Information
  muted: string        // Disabled/muted
}
```

### GZC Green Color System
```typescript
const GZC_GREEN = {
  base: '#7A9E65',      // Primary institutional green
  light: '#95BD78',     // 20% lighter
  lighter: '#ABD38F',   // 40% lighter
  dark: '#5B7C4B',      // 20% darker
  darker: '#436138',    // 40% darker
  // Opacity variants
  opacity90: 'E6',      // 90% opacity
  opacity80: 'CC',      // 80% opacity
  opacity60: '99',      // 60% opacity
  opacity40: '66',      // 40% opacity
  opacity20: '33',      // 20% opacity
  opacity10: '1A'       // 10% opacity
}
```

## Theme Catalog

### Dark Themes

#### 1. GZC Dark (Default)
- **Primary**: #7A9E65 (GZC institutional green)
- **Background**: #1A1A1A (softer black from port 3200)
- **Surface**: #2A2A2A, **SurfaceAlt**: #3A3A3A
- **Text**: #f8f6f0, **TextSecondary**: #c8c0b0
- **Use Case**: Professional dark theme for extended use

#### 2. Analytics Dark
- **Primary**: #7A9E65 (darker institutional green)
- **Background**: #181A1B (very dark for OLED screens)
- **Surface**: #23272E (charcoal for panels)
- **Text**: #FFFFFF (pure white for clarity)
- **Use Case**: Data visualization optimized

#### 3. Terminal Green
- **Primary**: #00FF41 (Matrix green)
- **Background**: #0A0A0A (pure black)
- **Text**: #E0E0E0 (light gray text, not green)
- **Use Case**: Bloomberg Terminal inspired

#### 4. Trading Operations
- **Primary**: #95BD78
- **Background**: #0a0a0a
- **Use Case**: High contrast trading

#### 5. Midnight Trading
- **Primary**: #8FB377 (softer GZC green for dark)
- **Background**: #0D0D0D (almost black)
- **Use Case**: Ultra dark for extended sessions

#### 6. Quantum Analytics
- **Primary**: #95BD78
- **Background**: #12141A (deep space blue-black)
- **Use Case**: Modern gradient theme

#### 7. Professional
- **Primary**: #95BD78
- **Background**: #0a1421 (deep sea blue background)
- **Surface**: #142236 (sea blue surface)
- **Use Case**: Sea blue theme for risk management

### Light Themes

#### 8. GZC Light
- **Primary**: GZC_GREEN.dark (darker green for light backgrounds)
- **Background**: #FAFAFA (soft white background)
- **Surface**: #FFFFFF (pure white for cards)
- **Text**: #1F2937 (charcoal text for excellent readability)
- **Use Case**: Clean professional light theme

#### 9. Arctic
- **Primary**: GZC_GREEN.dark (maintains institutional identity)
- **Background**: #F0F4F8 (cool blue-grey)
- **Surface**: #FFFFFF, **SurfaceAlt**: #E2E8F0
- **Text**: #1A202C (dark blue-grey)
- **Tab Styling**: Monochromatic with black overlay
  - Selected: `rgba(0, 0, 0, 0.05)` for slight darkening
  - Hover: `rgba(0, 0, 0, 0.02)` for subtle effect
- **Use Case**: Cool blue-grey professional theme

#### 10. Parchment
- **Primary**: #6B7280 (warm grey-silver)
- **Background**: #FAF9F7 (warm white with silver tone)
- **Surface**: #FFFFFF, **SurfaceAlt**: #F5F4F2
- **Text**: #2D3436 (charcoal with warm undertone)
- **Danger**: #E17055 (softer coral red for warmth)
- **Warning**: #FDCB6E (warm yellow)
- **Use Case**: Warm silver theme maintaining cozy feel

#### 11. Pearl
- **Primary**: #4A6FA5 (soft steel blue)
- **Background**: #FAFBFC (pearl white with cool tone)
- **Surface**: #FFFFFF, **SurfaceAlt**: #F0F3F7
- **Text**: #1E3A5F (dark blue text for readability)
- **TextSecondary**: #3D5875, **TextTertiary**: #5C7089
- **Use Case**: Soft pearl theme with blue accents

## Component Styling Patterns

### Professional Header
```typescript
// Logo color adaptation
color: theme.name.includes('Light') || theme.name === 'Arctic' || theme.name === 'Parchment' || theme.name === 'Pearl' 
  ? theme.text 
  : '#E0E0E0'  // Slightly less bright light grey for dark themes

// Tab backgrounds
background: activeTab === tab.id 
  ? theme.name === 'Institutional' 
    ? 'rgba(122, 158, 101, 0.1)' // Light theme gets light green tint
    : theme.name === 'Arctic'
    ? 'rgba(0, 0, 0, 0.05)' // Arctic gets monochromatic darkening
    : `${theme.primary}20` 
  : "transparent"
```

### Market Intel Panel
```typescript
// Height calculation for collapsed state
height: isCollapsed ? 'calc(100vh - 48px)' : '100%'

// Title and icon opacity for light themes
opacity: theme.name === 'GZC Light' || theme.name === 'Arctic' || theme.name === 'Parchment' || theme.name === 'Pearl' ? 0.9 : 1
```

### Theme Selector
```typescript
// Minimal design with glass morphism
padding: '4px 8px',
background: 'transparent',
border: 'none',
fontSize: '11px'

// Hover effects
onMouseEnter: backgroundColor: 'rgba(255, 255, 255, 0.05)'
```

### Documentation Mermaid Diagrams
```typescript
// Theme-aware mermaid configuration
themeVariables: {
  primaryColor: theme.surface,
  primaryTextColor: theme.text,
  primaryBorderColor: theme.primary,
  background: theme.surface,
  mainBkg: theme.surface,
  secondBkg: theme.surfaceAlt,
  textColor: theme.text,
  nodeTextColor: theme.text,
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: '14px',
  darkMode: isDarkTheme
}
```

## Design Principles

### Color Harmony
1. **Institutional Identity**: All themes maintain GZC green (#7A9E65) for success states
2. **Single Green Philosophy**: Use one green base with opacity variations rather than multiple greens
3. **Theme Character**: Arctic uses blue accents, Parchment uses warm silver, Pearl uses steel blue
4. **Monochromatic Approach**: Prefer brightness/opacity variations over color changes for interactions

### Typography
```typescript
fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

// Hierarchy
h1: { fontSize: '18px', fontWeight: '600', lineHeight: '24px' }
h2: { fontSize: '14px', fontWeight: '600', lineHeight: '20px' }
h3: { fontSize: '12px', fontWeight: '500', lineHeight: '16px' }
body: { fontSize: '11px', fontWeight: '400', lineHeight: '16px' }
label: { fontSize: '9px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }
```

### Spacing System
```typescript
spacing: {
  xs: '6px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px'
}
```

### Border Radius
```typescript
borderRadius: {
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px'
}
```

### Transitions
```typescript
transitions: {
  fast: 'all 0.15s ease',
  default: 'all 0.2s ease',
  slow: 'all 0.3s ease'
}
```

## Implementation Notes

### Theme Context
- **Provider**: `ThemeProvider` wraps entire app
- **Hook**: `useTheme()` for accessing current theme
- **Persistence**: `localStorage.getItem('gzc-intel-theme')`
- **CSS Variables**: Injected for instant switching

### Light Theme Detection
```typescript
const isLightTheme = theme.name.includes('Light') || 
                    theme.name === 'Arctic' || 
                    theme.name === 'Parchment' || 
                    theme.name === 'Pearl'
```

### Professional Standards
1. **No Hardcoded Colors**: Always use theme properties
2. **Accessibility**: Maintain proper contrast ratios
3. **Consistency**: Use shared config for common properties
4. **Performance**: CSS-in-JS with memoization
5. **Maintainability**: Clear theme structure and naming

## File Locations
- **Theme Definitions**: `/src/theme/themes.ts`
- **Theme Context**: `/src/contexts/ThemeContext.tsx`
- **Theme Selector**: `/src/components/ThemeSelector.tsx`
- **Legacy Theme**: `/src/theme/quantum.ts` (being phased out)

## Future Considerations
- Custom theme builder interface
- Theme import/export functionality
- Per-widget theme overrides
- Seasonal theme variations
- High contrast accessibility themes