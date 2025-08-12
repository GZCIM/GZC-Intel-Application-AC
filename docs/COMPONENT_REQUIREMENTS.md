# Component Development Requirements for GZC Intel Application AC

## Executive Summary
This document defines the technical requirements, patterns, and standards for building components that are compatible with the GZC Intel Application AC ecosystem. Components built following these specifications can be developed as standalone applications and later integrated as tabs within the main application.

## 1. Technology Stack

### Core Dependencies (Required)
```json
{
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.6.3",
    "@azure/msal-browser": "^4.14.0",
    "@azure/msal-react": "^3.0.14",
    "framer-motion": "^12.23.0",
    "axios": "^1.10.0",
    "uuid": "^11.1.0"
  }
}
```

### UI Libraries (As Needed)
```json
{
  "dependencies": {
    "lucide-react": "^0.525.0",
    "react-grid-layout": "^1.5.2",
    "@tanstack/react-table": "^8.21.3",
    "react-datepicker": "^8.4.0"
  }
}
```

### Data Visualization (As Needed)
```json
{
  "dependencies": {
    "lightweight-charts": "^5.0.8",
    "plotly.js-dist-min": "^3.0.3",
    "react-plotly.js": "^2.6.0",
    "d3": "^7.9.0"
  }
}
```

### WebSocket & Real-time (As Needed)
```json
{
  "dependencies": {
    "react-use-websocket": "^4.13.0",
    "socket.io-client": "^4.8.1"
  }
}
```

### Build Tools (Required)
```json
{
  "devDependencies": {
    "@vitejs/plugin-react": "^4.5.2",
    "vite": "^7.0.0",
    "typescript": "~5.8.3",
    "tailwindcss": "^3.4.17",
    "@tailwindcss/forms": "^0.5.10",
    "@tailwindcss/typography": "^0.5.16"
  }
}
```

## 2. Component Interface Specification

### 2.1 Component Metadata Interface
Every component MUST implement the following metadata structure:

```typescript
export interface ComponentMeta {
  id: string                    // Unique identifier (e.g., 'fred-data-dashboard')
  name: string                   // Internal name
  displayName: string            // User-facing name
  category: string               // Category (financial, visualization, data, analytics)
  subcategory?: string           // Optional subcategory
  description: string            // Clear description of functionality
  thumbnail?: string             // Optional preview image
  defaultSize: { w: number; h: number }  // Default grid units (12 column grid)
  minSize: { w: number; h: number }      // Minimum size constraints
  maxSize?: { w: number; h: number }     // Optional maximum size
  tags: string[]                 // Searchable tags
  complexity: 'simple' | 'medium' | 'complex'
  dependencies?: string[]        // External API dependencies
  props?: Record<string, any>   // Default props
  quality: 'basic' | 'standard' | 'enhanced' | 'professional'
  source: 'internal' | 'external'
}
```

### 2.2 Component Props Interface
All components MUST accept these standard props:

```typescript
interface BaseComponentProps {
  // Required props
  instanceId: string           // Unique instance identifier
  isEditMode: boolean          // Whether component is in edit mode
  
  // Optional props
  theme?: 'light' | 'dark'     // Theme mode
  onRemove?: () => void        // Handler for removal
  onPropsUpdate?: (props: Record<string, any>) => void  // Props update handler
  containerSize?: { width: number; height: number }      // Container dimensions
  
  // Custom props specific to component
  [key: string]: any
}
```

### 2.3 Component Export Pattern
Components MUST use this export pattern:

```typescript
// ComponentName.tsx
import React from 'react'
import { BaseComponentProps } from '@/types/components'

export interface ComponentNameProps extends BaseComponentProps {
  // Add component-specific props here
  dataSource?: string
  refreshInterval?: number
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  instanceId,
  isEditMode,
  theme = 'light',
  // ... other props
}) => {
  // Component implementation
  return (
    <div className="component-container">
      {/* Component content */}
    </div>
  )
}

// Default export for dynamic import
export default ComponentName

// Optional: Export metadata
export const metadata: ComponentMeta = {
  id: 'component-name',
  name: 'ComponentName',
  displayName: 'Component Display Name',
  // ... rest of metadata
}
```

## 3. Styling Requirements

### 3.1 Icon Library
Use **Lucide React** as the standard icon library:

```typescript
import { TrendingUp, BarChart2, Database, Activity, Layout } from 'lucide-react'

// Icon usage with consistent sizing
<TrendingUp className="w-4 h-4 text-primary" />
```

Icon categories matching component categories:
- **Financial**: `TrendingUp`, `DollarSign`, `Briefcase`, `PieChart`
- **Visualization**: `BarChart2`, `LineChart`, `Activity`, `TrendingDown`
- **Data**: `Database`, `Server`, `HardDrive`, `Cloud`
- **Layout**: `Layout`, `Grid`, `Columns`, `Square`
- **Analytics**: `Activity`, `Zap`, `Target`, `Award`

### 3.2 Tailwind CSS Configuration
Use the standard GZC theme configuration:

```javascript
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // GZC Brand Colors
        primary: '#8FB377',      // GZC Dark Green
        secondary: '#7A9E65',    
        success: '#ABD38F',      // GZC Light Green
        danger: '#DD8B8B',       // GZC Red Alert
        warning: '#E6D690',
        info: '#8BB4DD',
        
        // Theme Colors (use CSS variables)
        background: 'var(--theme-background)',
        surface: 'var(--theme-surface)',
        text: 'var(--theme-text)',
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ]
}
```

### 3.3 GZC Dark Theme (Default)
The primary theme is **GZC Dark** with these specifications:

```typescript
const GZC_DARK_THEME = {
  name: 'GZC Dark',
  // Core colors
  primary: '#7A9E65',        // Primary institutional green
  secondary: '#95BD78',      // Lighter green
  accent: '#ABD38F',         // Lightest green accent
  
  // Backgrounds
  background: '#1A1A1A',     // Main background
  surface: '#2A2A2A',        // Card/panel background
  surfaceAlt: '#3A3A3A',     // Alternative surface
  
  // Text colors
  text: '#f8f6f0',           // Primary text
  textSecondary: '#c8c0b0',  // Secondary text
  textTertiary: '#9a9488',   // Tertiary text
  
  // Borders
  border: '#3a3632',         // Standard border
  borderLight: '#3a363266',  // Light border with opacity
  
  // Status colors
  success: '#95BD78',        // Success green
  danger: '#D69A82',         // Error/danger
  warning: '#E6D690',        // Warning yellow
  info: '#8BB4DD',           // Info blue
  
  // Typography (compact for trading)
  fontSize: {
    h1: '18px',
    h2: '14px', 
    h3: '12px',
    body: '11px',
    small: '10px',
    tiny: '9px'
  }
}
```

### 3.4 Theme Provider Integration
All components MUST support the ThemeProvider:

```typescript
import { ThemeProvider } from '@/contexts/ThemeContext'
import { useTheme } from '@/contexts/ThemeContext'

// Wrap your app
<ThemeProvider defaultTheme="gzc-dark">
  <App />
</ThemeProvider>

// Use in components
const MyComponent = () => {
  const { currentTheme, themeName, setTheme } = useTheme()
  
  return (
    <div style={{
      backgroundColor: currentTheme.surface,
      color: currentTheme.text,
      borderColor: currentTheme.border
    }}>
      {/* Component content */}
    </div>
  )
}
```

### 3.5 CSS Variables
Components must use CSS variables for dynamic theming:

```css
/* Applied by ThemeProvider to :root */
--theme-primary: #7A9E65;
--theme-secondary: #95BD78;
--theme-accent: #ABD38F;
--theme-background: #1A1A1A;
--theme-surface: #2A2A2A;
--theme-surface-alt: #3A3A3A;
--theme-text: #f8f6f0;
--theme-text-secondary: #c8c0b0;
--theme-text-tertiary: #9a9488;
--theme-border: #3a3632;
--theme-success: #95BD78;
--theme-danger: #D69A82;
--theme-warning: #E6D690;
--theme-info: #8BB4DD;
```

### 3.6 Theme-Aware Component Styling
```typescript
// Use Tailwind with CSS variables
const containerClass = `
  bg-[var(--theme-surface)]
  text-[var(--theme-text)]
  border border-[var(--theme-border)]
  rounded-lg shadow-sm
`

// Or use theme object directly
const { currentTheme } = useTheme()
const dynamicStyles = {
  backgroundColor: currentTheme.surface,
  color: currentTheme.text,
  borderColor: currentTheme.border
}
```

### 3.7 Available Themes
Components should support all standard themes:
- **gzc-dark** (default) - Standard GZC dark theme
- **analytics-dark** - Optimized for data visualization
- **terminal-green** - Bloomberg Terminal inspired
- **trading-ops** - Dark theme for trading
- **midnight-trading** - Ultra dark for extended sessions
- **institutional** - Light theme with GZC colors
- **arctic** - Cool blue-grey light theme

### 3.8 Responsive Design Requirements
- Mobile-first approach using Tailwind breakpoints
- Minimum supported width: 320px
- Breakpoints: `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`

## 4. Animation & Motion Requirements

### 4.1 Framer Motion (Required)
All components MUST use **Framer Motion** for animations:

```typescript
import { motion, AnimatePresence } from 'framer-motion'

// Basic component animation
const ComponentAnimation = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.2 }}
  >
    {/* Component content */}
  </motion.div>
)
```

### 4.2 Standard Animation Patterns

#### Entry/Exit Animations
```typescript
// Fade in/out
const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
}

// Slide animations
const slideVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1 },
  exit: { x: 20, opacity: 0 }
}

// Scale animations
const scaleVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 }
}
```

#### List Animations
```typescript
const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
}

// Usage
<motion.ul variants={listVariants} initial="hidden" animate="visible">
  {items.map(item => (
    <motion.li key={item.id} variants={itemVariants}>
      {item.content}
    </motion.li>
  ))}
</motion.ul>
```

#### Modal/Overlay Animations
```typescript
<AnimatePresence>
  {isOpen && (
    <motion.div
      className="fixed inset-0 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="modal-content"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 400 }}
      >
        {/* Modal content */}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

### 4.3 Gesture Animations
```typescript
// Hover effects
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
>
  Click Me
</motion.button>

// Drag interactions
<motion.div
  drag
  dragConstraints={{ left: 0, right: 300, top: 0, bottom: 300 }}
  dragElastic={0.2}
  whileDrag={{ scale: 1.1 }}
/>
```

### 4.4 Performance Guidelines
- Use `layout` prop for smooth layout animations
- Implement `AnimatePresence` for exit animations
- Use `layoutId` for shared element transitions
- Minimize re-renders with `motion.memo`
- Use CSS transforms over position changes

### 4.5 Transition Timing
```typescript
const transitions = {
  fast: { duration: 0.15 },      // Quick interactions
  default: { duration: 0.2 },    // Standard transitions
  slow: { duration: 0.3 },       // Complex animations
  spring: {                      // Natural motion
    type: "spring",
    stiffness: 400,
    damping: 25
  }
}
```

## 5. State Management Patterns

### 5.1 Local State
- Use React hooks (useState, useReducer) for component-local state
- Implement proper error boundaries

### 5.2 Global State Access
Components can access these global contexts:

```typescript
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/hooks/useAuth'
import { useQuotes } from '@/contexts/QuoteContext'
```

### 5.3 Data Persistence
For persistent state, use the database service:

```typescript
import { databaseService } from '@/services/databaseService'

// Save component state
await databaseService.saveComponentState(instanceId, state)

// Load component state
const state = await databaseService.getComponentState(instanceId)
```

## 5. Authentication & Authorization

### 5.1 MSAL Integration
All API calls MUST include Azure AD authentication:

```typescript
import { useAuth } from '@/hooks/useAuth'

const MyComponent = () => {
  const { getAccessToken } = useAuth()
  
  const fetchData = async () => {
    const token = await getAccessToken()
    const response = await fetch('/api/data', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
  }
}
```

### 5.2 User Context
Access user information via:

```typescript
import { useUserClaims } from '@/hooks/useAuth'

const claims = useUserClaims()
// claims.email, claims.name, claims.roles, etc.
```

## 6. API Communication Standards

### 6.1 Backend Endpoints
- Main Gateway API: `http://localhost:5300` (development)
- WebSocket endpoints: `/ws_esp`, `/ws_rfs`, `/ws_execution`
- All endpoints require Bearer token authentication

### 6.2 Error Handling
```typescript
try {
  const response = await apiCall()
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }
} catch (error) {
  console.error('Component API Error:', error)
  // Display user-friendly error
  setError('Unable to load data. Please try again.')
}
```

### 6.3 Loading States
Always implement loading indicators:

```typescript
const [loading, setLoading] = useState(true)
const [data, setData] = useState(null)
const [error, setError] = useState(null)
```

## 7. Component Lifecycle

### 7.1 Initialization
```typescript
useEffect(() => {
  // Initialize component
  loadSavedState()
  connectToDataSources()
  
  return () => {
    // Cleanup
    disconnectDataSources()
    saveState()
  }
}, [instanceId])
```

### 7.2 Edit Mode Handling
```typescript
useEffect(() => {
  if (isEditMode) {
    // Disable interactions
    // Show edit overlay
  } else {
    // Enable full functionality
  }
}, [isEditMode])
```

### 7.3 Responsive Updates
```typescript
useEffect(() => {
  const handleResize = () => {
    // Adjust component layout
  }
  
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])
```

## 8. Performance Requirements

### 8.1 Bundle Size
- Component bundle should not exceed 500KB (gzipped)
- Use code splitting for large dependencies
- Lazy load heavy visualizations

### 8.2 Rendering Performance
- Use React.memo for expensive components
- Implement virtualization for large lists
- Debounce user inputs and API calls

### 8.3 Memory Management
- Clean up event listeners and subscriptions
- Avoid memory leaks in WebSocket connections
- Implement proper error boundaries

## 9. Testing Requirements

### 9.1 Unit Tests
```typescript
import { render, screen } from '@testing-library/react'
import { ComponentName } from './ComponentName'

describe('ComponentName', () => {
  it('renders without crashing', () => {
    render(<ComponentName instanceId="test" isEditMode={false} />)
    expect(screen.getByTestId('component-name')).toBeInTheDocument()
  })
})
```

### 9.2 Integration Tests
- Test API integration with real test servers
- Test authentication flows
- Test state persistence

## 10. Deployment Configuration

### 10.1 Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3500,
    proxy: {
      '/api': {
        target: 'http://localhost:5300',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react']
        }
      }
    }
  }
})
```

### 10.2 Docker Configuration
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

## 11. Integration Checklist

Before integrating a standalone component into the main application:

- [ ] Component follows the standard interface specification
- [ ] All props are properly typed with TypeScript
- [ ] Component handles edit mode correctly
- [ ] Authentication is implemented for API calls
- [ ] Error boundaries are in place
- [ ] Loading states are implemented
- [ ] Component is responsive (mobile-first)
- [ ] Dark mode is supported
- [ ] Component state can be persisted
- [ ] Bundle size is optimized
- [ ] Component is tested
- [ ] Metadata is complete and accurate
- [ ] Component can be dynamically imported
- [ ] No hardcoded URLs or credentials
- [ ] Proper cleanup in useEffect hooks

## 12. Example Component Structure

```
fred-data-dashboard/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx         # Main component
│   │   ├── DataTable.tsx         # Sub-component
│   │   └── Charts.tsx            # Sub-component
│   ├── hooks/
│   │   ├── useAuth.ts           # Auth hook (shared)
│   │   └── useFredData.ts       # Custom hook
│   ├── services/
│   │   ├── api.ts               # API service
│   │   └── websocket.ts         # WebSocket service
│   ├── types/
│   │   └── index.ts             # TypeScript types
│   └── index.tsx                # Export point
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## 13. Migration Path

### From Standalone to Integrated:

1. **Ensure Compliance**: Verify component meets all requirements
2. **Add to Inventory**: Register in ComponentInventory.ts
3. **Create Import Map**: Add to ComponentRenderer componentMap
4. **Test Integration**: Verify in development environment
5. **Update Documentation**: Add to component catalog
6. **Deploy**: Follow standard deployment process

## 14. Support & Resources

- **Documentation**: `/docs/` directory in main repository
- **Example Components**: See `/Main_Frontend/src/components/`
- **Component Template**: Use `portfolio` component as reference
- **Style Guide**: Follow existing component patterns
- **Testing Utils**: Available in `/Main_Frontend/src/utils/test-utils.ts`

---

## Appendix A: Common Pitfalls to Avoid

1. **Don't hardcode API endpoints** - Use environment variables
2. **Don't skip authentication** - All API calls need tokens
3. **Don't ignore edit mode** - Components must handle this state
4. **Don't use absolute positioning** - Use grid system
5. **Don't forget cleanup** - Memory leaks will cause issues
6. **Don't bypass error boundaries** - Handle errors gracefully
7. **Don't ignore responsive design** - Mobile support is required
8. **Don't skip TypeScript** - Type safety is mandatory

## Appendix B: Quick Start Template

```bash
# Create new component project
npx create-vite@latest my-component --template react-ts
cd my-component

# Install required dependencies
npm install react-router-dom @azure/msal-browser @azure/msal-react \
  framer-motion axios uuid lucide-react

# Install dev dependencies
npm install -D tailwindcss @tailwindcss/forms @tailwindcss/typography \
  @types/react @types/react-dom

# Copy configuration files from main project
cp ../GZC-Intel-Application-AC/Main_Frontend/tailwind.config.js .
cp ../GZC-Intel-Application-AC/Main_Frontend/tsconfig.json .
cp ../GZC-Intel-Application-AC/Main_Frontend/vite.config.ts .

# Start development
npm run dev
```

---

**Last Updated**: 2025-08-11  
**Version**: 1.0.0  
**Maintained By**: GZC Engineering Team