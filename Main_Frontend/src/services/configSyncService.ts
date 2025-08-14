/**
 * Configuration Sync Service
 * Ensures consistent configuration across browsers and sessions
 */

import { cosmosConfigService } from './cosmosConfigService'
import { toastManager } from '../components/Toast'

interface SyncStatus {
  lastSync: string
  version: string
  conflicts: any[]
}

class ConfigSyncService {
  private syncInterval: NodeJS.Timer | null = null
  private lastKnownHash: string = ''
  
  /**
   * Start automatic sync
   */
  startAutoSync(intervalMs: number = 300000) { // Changed to 5 minutes (300000ms) instead of 30 seconds
    this.stopAutoSync()
    
    // Don't do initial sync - only sync when user explicitly saves
    // this.syncNow()
    
    // Disable automatic sync completely - only sync on explicit save/logout
    // this.syncInterval = setInterval(() => {
    //   this.syncNow()
    // }, intervalMs)
    
    // Disable visibility change sync
    // document.addEventListener('visibilitychange', () => {
    //   if (!document.hidden) {
    //     this.syncNow()
    //   }
    // })
    
    // Disable online sync too - only sync on explicit save
    // window.addEventListener('online', () => {
    //   this.syncNow()
    // })
  }
  
  /**
   * Stop automatic sync
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }
  
  /**
   * Perform sync now
   */
  async syncNow() {
    try {
      const config = await cosmosConfigService.loadConfiguration()
      
      if (!config) {
        console.log('No remote config to sync')
        return
      }
      
      // Check if config has changed
      const currentHash = this.hashConfig(config)
      if (currentHash === this.lastKnownHash) {
        console.log('Config unchanged, skipping sync')
        return
      }
      
      // Check version
      const localVersion = localStorage.getItem('config-version') || '1.0'
      const remoteVersion = config.version || '1.0'
      
      if (remoteVersion > localVersion) {
        console.log(`Updating from version ${localVersion} to ${remoteVersion}`)
        
        // Trigger UI update
        window.dispatchEvent(new CustomEvent('config-updated', {
          detail: config
        }))
        
        // Update local version
        localStorage.setItem('config-version', remoteVersion)
        this.lastKnownHash = currentHash
        
        // Show notification
        toastManager.show('Configuration synced from cloud', 'info')
      }
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }
  
  /**
   * Hash configuration for change detection
   */
  private hashConfig(config: any): string {
    const relevant = {
      tabs: config.tabs?.map((t: any) => ({
        id: t.id,
        name: t.name,
        components: t.components?.length || 0
      })),
      theme: config.preferences?.theme
    }
    return JSON.stringify(relevant)
  }
  
  /**
   * Resolve conflicts between local and remote
   */
  async resolveConflicts(local: any, remote: any): Promise<any> {
    // Simple strategy: remote wins for now
    // Could be enhanced with user choice
    console.log('Conflict detected, using remote version')
    return remote
  }
  
  /**
   * Force push local config to remote
   */
  async forcePush(config: any) {
    try {
      await cosmosConfigService.saveConfiguration({
        ...config,
        version: '2.0',
        timestamp: new Date().toISOString(),
        forcePush: true
      })
      
      toastManager.show('Configuration pushed to cloud', 'success')
    } catch (error) {
      console.error('Force push failed:', error)
      toastManager.show('Failed to push configuration', 'error')
      throw error
    }
  }
}

export const configSyncService = new ConfigSyncService()