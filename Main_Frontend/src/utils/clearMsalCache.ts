/**
 * Clear MSAL cache from localStorage to fix quota exceeded errors
 * This should be run once on app startup to clean up old cache data
 */

export function clearMsalCache() {
  try {
    // Get all localStorage keys
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.includes('msal')) {
        keysToRemove.push(key)
      }
    }
    
    // Remove all MSAL-related keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      console.log(`🧹 Cleared MSAL cache key: ${key}`)
    })
    
    if (keysToRemove.length > 0) {
      console.log(`✅ Cleared ${keysToRemove.length} MSAL cache entries from localStorage`)
    }
    
    // Also clear any debug logs to free up more space
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key && (key.includes('debug-logs') || key.includes('console-logs'))) {
        localStorage.removeItem(key)
        console.log(`🧹 Cleared debug log: ${key}`)
      }
    }
    
  } catch (error) {
    console.error('Failed to clear MSAL cache:', error)
  }
}

/**
 * Get current storage usage information
 */
export function getStorageInfo() {
  let totalSize = 0
  const breakdown: Record<string, number> = {}
  
  // Analyze localStorage
  for (let key in localStorage) {
    const value = localStorage[key]
    const size = new Blob([value]).size
    totalSize += size
    
    // Categorize by prefix
    const prefix = key.split('.')[0] || key.substring(0, 20)
    breakdown[prefix] = (breakdown[prefix] || 0) + size
  }
  
  // Sort by size
  const sorted = Object.entries(breakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
  
  return {
    totalSize,
    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    itemCount: localStorage.length,
    topConsumers: sorted.map(([key, size]) => ({
      key,
      size,
      sizeMB: (size / 1024 / 1024).toFixed(2)
    }))
  }
}