/**
 * Global flags that persist across Hot Module Replacement (HMR) reloads
 * These are stored on the window object to survive component reloads during development
 */

declare global {
  interface Window {
    __GLOBAL_CONFIG_LOADED__?: boolean
  }
}

export const getGlobalConfigLoaded = (): boolean => {
  return window.__GLOBAL_CONFIG_LOADED__ || false
}

export const setGlobalConfigLoaded = (loaded: boolean): void => {
  window.__GLOBAL_CONFIG_LOADED__ = loaded
  console.log('🔒 Global config loaded flag set to:', loaded)
}

export const resetGlobalConfigLoaded = (): void => {
  window.__GLOBAL_CONFIG_LOADED__ = false
  console.log('🔄 Global config loaded flag reset')
}