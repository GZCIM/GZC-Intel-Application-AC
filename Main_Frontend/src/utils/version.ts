/**
 * Application Version Information
 * Dynamically generated based on current date/time
 */

// Generate dynamic version based on current date/time
const generateDynamicVersion = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  
  return `v${year}${month}${day}-${hours}${minutes}${seconds}`
}

// Get version - always dynamic unless explicitly set in env
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || generateDynamicVersion()

// Build timestamp - current date
export const BUILD_TIMESTAMP = new Date().toISOString().slice(0, 10).replace(/-/g, '')

// Get formatted version string - simplified for display
export const getVersionString = (): string => {
  // Always generate fresh version for display
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  
  return `v${year}${month}${day}`
}

// Get deployment information
export const getDeploymentInfo = () => {
  const [datePart, timePart] = APP_VERSION.replace('v', '').split('-')
  
  if (datePart && timePart) {
    // Format: v20250807-215452 -> "2025-08-07 21:54:52"
    const year = datePart.slice(0, 4)
    const month = datePart.slice(4, 6)
    const day = datePart.slice(6, 8)
    const hour = timePart.slice(0, 2)
    const minute = timePart.slice(2, 4)
    const second = timePart.slice(4, 6)
    
    return {
      version: APP_VERSION,
      buildDate: `${year}-${month}-${day}`,
      buildTime: `${hour}:${minute}:${second}`,
      timestamp: new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`)
    }
  }
  
  return {
    version: APP_VERSION,
    buildDate: BUILD_TIMESTAMP,
    buildTime: 'unknown',
    timestamp: new Date()
  }
}