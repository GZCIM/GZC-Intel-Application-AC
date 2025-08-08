// Utility to clear corrupt localStorage data
export function clearCorruptStorage() {
  const keysToCheck = [
    'gzc-intel-theme',
    'gzc-intel-user',
    'gzc-intel-layouts',
    'gzc-intel-current-layout',
    'gzc-intel-active-layout',
    'gzc-platform-view-memory'
  ]

  let hasCorruption = false

  for (const key of keysToCheck) {
    try {
      const value = localStorage.getItem(key)
      if (value) {
        // Try to parse to check if valid JSON
        JSON.parse(value)
      }
    } catch (error) {
      console.warn(`Corrupt localStorage key "${key}", removing...`, error)
      localStorage.removeItem(key)
      hasCorruption = true
    }
  }

  // Also check for user-specific keys
  const allKeys = Object.keys(localStorage)
  for (const key of allKeys) {
    if (key.includes('gzc-intel') || key.includes('dynamic-canvas') || key.includes('static-canvas')) {
      try {
        const value = localStorage.getItem(key)
        if (value && value !== 'null' && value !== 'undefined') {
          JSON.parse(value)
        }
      } catch (error) {
        console.warn(`Corrupt localStorage key "${key}", removing...`, error)
        localStorage.removeItem(key)
        hasCorruption = true
      }
    }
  }

  if (hasCorruption) {
    console.log('Cleared corrupt localStorage data. Page will reload.')
    window.location.reload()
  }
}

// Add global function for manual clearing
;(window as any).clearAllStorage = () => {
  localStorage.clear()
  sessionStorage.clear()
  console.log('All storage cleared. Refreshing...')
  window.location.reload()
}