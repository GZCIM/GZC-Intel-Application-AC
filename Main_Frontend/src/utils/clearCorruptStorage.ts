// Utility to clear corrupt localStorage data and handle quota issues
export function clearCorruptStorage() {
  // Check total localStorage size first
  let totalSize = 0
  const sizeByKey: Record<string, number> = {}
  
  try {
    for (let key in localStorage) {
      const value = localStorage[key]
      const size = new Blob([value]).size
      totalSize += size
      sizeByKey[key] = size
    }
    
    console.log(`Total localStorage usage: ${(totalSize / 1024 / 1024).toFixed(2)} MB`)
    
    // If over 4MB, clean up largest items
    if (totalSize > 4 * 1024 * 1024) {
      console.warn('localStorage is near quota limit, cleaning up...')
      
      // Sort keys by size
      const sortedKeys = Object.entries(sizeByKey)
        .sort((a, b) => b[1] - a[1])
      
      // Remove largest non-essential items
      for (const [key, size] of sortedKeys) {
        // Skip critical auth/user keys unless they're huge
        if (key.includes('msal') && size < 100000) continue
        if (key === 'gzc-intel-user' && size < 50000) continue
        
        // Remove old/large items
        if (size > 100000 || key.includes('-old') || key.includes('backup')) {
          console.log(`Removing large/old key: ${key} (${(size / 1024).toFixed(1)} KB)`)
          localStorage.removeItem(key)
          totalSize -= size
          
          // Stop when under 3MB
          if (totalSize < 3 * 1024 * 1024) break
        }
      }
    }
  } catch (e) {
    console.error('Error checking localStorage size:', e)
  }

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
    // Check if we've already tried to clear corruption recently
    const lastClearAttempt = sessionStorage.getItem('last-corruption-clear')
    const now = Date.now()
    
    if (lastClearAttempt) {
      const timeSinceLast = now - parseInt(lastClearAttempt)
      // If we cleared less than 5 seconds ago, don't reload again to prevent infinite loop
      if (timeSinceLast < 5000) {
        console.error('Corruption persists after clear. Skipping reload to prevent loop.')
        return
      }
    }
    
    // Store timestamp of this clear attempt
    sessionStorage.setItem('last-corruption-clear', now.toString())
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