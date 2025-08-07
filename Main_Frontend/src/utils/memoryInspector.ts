// Memory Inspector Utility
// Provides console helpers for checking both memory systems

export const memoryInspector = {
  // Check local view memory
  checkViewMemory: () => {
    const memory = localStorage.getItem('gzc-platform-view-memory')
    if (memory) {
      try {
        const parsed = JSON.parse(memory)
        console.group('📊 View Memory System')
        console.log('Current Theme:', parsed.theme?.currentTheme || 'Not set')
        console.log('Theme System Data:', parsed.theme?.themeSystem || 'Not initialized')
        console.log('Full Memory:', parsed)
        console.groupEnd()
        return parsed
      } catch (e) {
        console.error('❌ Failed to parse view memory:', e)
      }
    } else {
      console.log('📭 No view memory found')
    }
  },

  // Check theme persistence
  checkThemeStorage: () => {
    const theme = localStorage.getItem('gzc-intel-theme')
    const layouts = localStorage.getItem('gzc-intel-layouts')
    const activeLayout = localStorage.getItem('gzc-intel-active-layout')
    
    console.group('🎨 Theme Storage System')
    console.log('Current Theme:', theme || 'Not set')
    console.log('Saved Layouts:', layouts ? JSON.parse(layouts) : 'None')
    console.log('Active Layout:', activeLayout || 'default')
    console.groupEnd()
    
    return { theme, layouts, activeLayout }
  },

  // Check theme system comprehensive status
  checkThemeSystem: () => {
    console.group('🏗️ Theme System Status')
    
    // Check if style guide exists
    fetch('/STYLE_GUIDE.md')
      .then(response => {
        console.log('✅ Style Guide:', response.ok ? 'Available' : 'Not found')
      })
      .catch(() => console.log('❌ Style Guide: Not accessible'))
    
    // Check theme definitions
    console.log('Theme Definitions: /src/theme/themes.ts')
    console.log('Theme Context: /src/contexts/ThemeContext.tsx')
    console.log('Theme Selector: /src/components/ThemeSelector.tsx')
    
    // Check current theme application
    const root = document.documentElement
    const currentPrimary = root.style.getPropertyValue('--theme-primary')
    console.log('Applied Primary Color:', currentPrimary || 'Not applied')
    console.log('Theme Data Attribute:', root.getAttribute('data-theme') || 'Not set')
    
    console.groupEnd()
  },

  // Full memory report
  fullReport: () => {
    console.group('🔍 Complete Memory System Report')
    memoryInspector.checkViewMemory()
    memoryInspector.checkThemeStorage()
    memoryInspector.checkThemeSystem()
    console.groupEnd()
  },

  // Clear all memory (development use)
  clearAllMemory: () => {
    if (confirm('⚠️ This will clear ALL stored data. Continue?')) {
      localStorage.removeItem('gzc-platform-view-memory')
      localStorage.removeItem('gzc-intel-theme')
      localStorage.removeItem('gzc-intel-layouts')
      localStorage.removeItem('gzc-intel-active-layout')
      console.log('🧹 All memory cleared. Refresh to reset to defaults.')
    }
  },

  // Initialize theme system manually
  initializeThemeSystem: () => {
    const themeSystemData = {
      currentTheme: 'gzc-dark',
      themeSystem: {
        availableThemes: [
          'gzc-dark', 'analytics-dark', 'terminal-green', 'trading-ops', 
          'midnight-trading', 'quantum-analytics', 'professional',
          'institutional', 'arctic', 'parchment', 'pearl'
        ],
        gzcGreenSystem: {
          base: '#7A9E65',
          light: '#95BD78',
          dark: '#5B7C4B',
          opacityVariants: ['E6', 'CC', '99', '66', '33', '1A']
        },
        lightThemeDetection: ['institutional', 'arctic', 'parchment', 'pearl'],
        componentStyling: {
          logoColorLogic: 'Light themes: theme.text | Dark themes: #E0E0E0',
          tabBackgroundLogic: 'Arctic: rgba(0,0,0,0.05) | Others: theme.primary + 20',
          arcticMonochromaticApproach: 'Selected: rgba(0,0,0,0.05) | Hover: rgba(0,0,0,0.02)'
        },
        designPrinciples: {
          singleGreenPhilosophy: 'Use GZC green base with opacity variations, not multiple greens',
          institutionalIdentity: 'All themes maintain GZC green #7A9E65 for success states',
          monochromaticInteractions: 'Prefer brightness/opacity over color changes for interactions'
        },
        fileLocations: {
          themeDefinitions: '/src/theme/themes.ts',
          themeContext: '/src/contexts/ThemeContext.tsx',
          themeSelector: '/src/components/ThemeSelector.tsx',
          styleGuide: '/STYLE_GUIDE.md'
        }
      }
    };

    const currentMemory = localStorage.getItem('gzc-platform-view-memory')
    let memory = {}
    
    if (currentMemory) {
      try {
        memory = JSON.parse(currentMemory)
      } catch (e) {
        console.warn('Failed to parse existing memory, creating new')
      }
    }

    memory = {
      ...memory,
      theme: {
        ...(memory as any).theme,
        ...themeSystemData
      }
    }

    localStorage.setItem('gzc-platform-view-memory', JSON.stringify(memory))
    console.log('✅ Theme system initialized in view memory')
  }
}

// Make available globally in development
if (typeof window !== 'undefined') {
  (window as any).memoryInspector = memoryInspector
  console.log('🔧 Memory Inspector available: Use memoryInspector.fullReport() to check system status')
}