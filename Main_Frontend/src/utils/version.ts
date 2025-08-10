/**
 * Application Version Information
 * Dynamically set from environment or build process
 */

// Get version from environment variable (set during build) or use timestamp
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || `v${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '').slice(0, 15)}`

// Build timestamp
export const BUILD_TIMESTAMP = new Date().toISOString().slice(0, 10).replace(/-/g, '')

// Get formatted version string
export const getVersionString = (): string => {
  const buildDate = APP_VERSION.split('-')[0]?.replace('v', '') || BUILD_TIMESTAMP
  const buildTime = APP_VERSION.split('-')[1] || 'latest'
  
  return `Version: ${APP_VERSION} | Build: ${buildDate}`
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