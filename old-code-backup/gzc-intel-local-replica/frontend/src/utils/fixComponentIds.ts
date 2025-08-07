/**
 * Fix component IDs in persisted layouts
 * Migrates old dynamic IDs to fixed component names
 */

export function fixComponentIds() {
  try {
    // Fix layouts
    const layoutsStr = localStorage.getItem('gzc-intel-layouts')
    if (layoutsStr) {
      const layouts = JSON.parse(layoutsStr)
      let modified = false
      
      layouts.forEach((layout: any) => {
        layout.tabs.forEach((tab: any) => {
          // Fix old dynamic UserTab IDs
          if (tab.component && tab.component.startsWith('UserTab_')) {
            console.log(`Fixing component ID: ${tab.component} -> UserTabContainer`)
            tab.component = 'UserTabContainer'
            modified = true
          }
        })
      })
      
      if (modified) {
        localStorage.setItem('gzc-intel-layouts', JSON.stringify(layouts))
        console.log('Fixed component IDs in layouts')
      }
    }
    
    // Fix current layout
    const currentLayoutStr = localStorage.getItem('gzc-intel-current-layout')
    if (currentLayoutStr) {
      const currentLayout = JSON.parse(currentLayoutStr)
      let modified = false
      
      if (currentLayout.tabs) {
        currentLayout.tabs.forEach((tab: any) => {
          if (tab.component && tab.component.startsWith('UserTab_')) {
            console.log(`Fixing component ID in current layout: ${tab.component} -> UserTabContainer`)
            tab.component = 'UserTabContainer'
            modified = true
          }
        })
        
        if (modified) {
          localStorage.setItem('gzc-intel-current-layout', JSON.stringify(currentLayout))
          console.log('Fixed component IDs in current layout')
        }
      }
    }
    
    // Also check app state
    const appStateStr = localStorage.getItem('gzc-intel-app-state')
    if (appStateStr) {
      const appState = JSON.parse(appStateStr)
      let modified = false
      
      if (appState.tabs && appState.tabs.layouts) {
        appState.tabs.layouts.forEach((layout: any) => {
          layout.tabs.forEach((tab: any) => {
            if (tab.component && tab.component.startsWith('UserTab_')) {
              console.log(`Fixing component ID in app state: ${tab.component} -> UserTabContainer`)
              tab.component = 'UserTabContainer'
              modified = true
            }
          })
        })
        
        if (modified) {
          localStorage.setItem('gzc-intel-app-state', JSON.stringify(appState))
          console.log('Fixed component IDs in app state')
        }
      }
    }
    
    return true
  } catch (error) {
    console.error('Error fixing component IDs:', error)
    return false
  }
}

// Auto-fix on import
fixComponentIds()