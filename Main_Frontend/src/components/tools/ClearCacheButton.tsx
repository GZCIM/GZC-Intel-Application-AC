import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export const ClearCacheButton: React.FC = () => {
  const [isClearing, setIsClearing] = useState(false)

  const clearCache = async () => {
    setIsClearing(true)
    
    try {
      // Clear browser cache
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }
      
      // Clear localStorage cache
      const keysToKeep = ['tabLayouts', 'userPreferences', 'theme']
      Object.keys(localStorage).forEach(key => {
        if (!keysToKeep.includes(key) && key.startsWith('cache_')) {
          localStorage.removeItem(key)
        }
      })
      
      // Clear sessionStorage
      sessionStorage.clear()
      
      toast.success('Cache cleared successfully! Refreshing page...')
      
      // Force hard reload after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 1500)
      
    } catch (error) {
      console.error('Failed to clear cache:', error)
      toast.error('Failed to clear cache. Please try manual refresh (Ctrl+Shift+R)')
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <Button
      onClick={clearCache}
      disabled={isClearing}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      {isClearing ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      {isClearing ? 'Clearing...' : 'Clear Cache'}
    </Button>
  )
}