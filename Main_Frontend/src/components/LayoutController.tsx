/**
 * Layout Controller Component
 * Manages saved layouts and provides UI to switch between them
 */

import React, { useState, useEffect } from 'react'
import { useTabLayout } from '../core/tabs/TabLayoutManager'
import { cosmosConfigService } from '../services/cosmosConfigService'
import { toastManager } from './Toast'
import { Save, FolderOpen, Plus, Trash2, Check } from 'lucide-react'

interface SavedLayout {
  id: string
  name: string
  tabCount: number
  timestamp: string
  isActive?: boolean
}

export const LayoutController: React.FC = () => {
  const [showController, setShowController] = useState(false)
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>([])
  const [newLayoutName, setNewLayoutName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  
  const { 
    currentLayout, 
    saveCurrentLayout, 
    loadLayout,
    deleteLayout 
  } = useTabLayout()

  // Load saved layouts
  useEffect(() => {
    loadSavedLayouts()
  }, [])

  const loadSavedLayouts = async () => {
    try {
      const config = await cosmosConfigService.loadConfiguration()
      if (config?.layouts && Array.isArray(config.layouts)) {
        const layouts: SavedLayout[] = config.layouts.map((layout: any) => ({
          id: layout.id,
          name: layout.name,
          tabCount: layout.tabs?.length || 0,
          timestamp: layout.timestamp,
          isActive: layout.id === currentLayout?.id
        }))
        setSavedLayouts(layouts)
      }
    } catch (error) {
      console.error('Failed to load layouts:', error)
    }
  }

  const handleSaveLayout = async () => {
    if (!newLayoutName.trim()) {
      toastManager.show('Please enter a layout name', 'error')
      return
    }

    try {
      // Save current tabs as a new layout
      const newLayout = {
        id: `layout-${Date.now()}`,
        name: newLayoutName,
        tabs: currentLayout.tabs,
        timestamp: new Date().toISOString()
      }

      // Get existing config
      const config = await cosmosConfigService.loadConfiguration()
      const layouts = config?.layouts || []
      
      // Add new layout
      layouts.push(newLayout)
      
      // Save to Cosmos
      await cosmosConfigService.saveConfiguration({
        ...config,
        layouts: layouts
      })

      toastManager.show(`Layout "${newLayoutName}" saved`, 'success')
      setNewLayoutName('')
      setShowSaveDialog(false)
      loadSavedLayouts()
    } catch (error) {
      console.error('Failed to save layout:', error)
      toastManager.show('Failed to save layout', 'error')
    }
  }

  const handleLoadLayout = async (layoutId: string) => {
    const layout = savedLayouts.find(l => l.id === layoutId)
    if (!layout) return

    try {
      const config = await cosmosConfigService.loadConfiguration()
      const fullLayout = config?.layouts?.find((l: any) => l.id === layoutId)
      
      if (fullLayout?.tabs) {
        // Update current tabs with saved layout tabs
        await cosmosConfigService.saveConfiguration({
          ...config,
          tabs: fullLayout.tabs
        })
        
        // Reload the page to apply new layout
        window.location.reload()
        toastManager.show(`Loaded layout "${layout.name}"`, 'success')
      }
    } catch (error) {
      console.error('Failed to load layout:', error)
      toastManager.show('Failed to load layout', 'error')
    }
  }

  const handleDeleteLayout = async (layoutId: string) => {
    const layout = savedLayouts.find(l => l.id === layoutId)
    if (!layout) return

    if (!confirm(`Delete layout "${layout.name}"?`)) return

    try {
      const config = await cosmosConfigService.loadConfiguration()
      const layouts = config?.layouts?.filter((l: any) => l.id !== layoutId) || []
      
      await cosmosConfigService.saveConfiguration({
        ...config,
        layouts: layouts
      })

      toastManager.show(`Deleted layout "${layout.name}"`, 'success')
      loadSavedLayouts()
    } catch (error) {
      console.error('Failed to delete layout:', error)
      toastManager.show('Failed to delete layout', 'error')
    }
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setShowController(!showController)}
        className="fixed bottom-20 right-4 z-50 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-all"
        title="Layout Manager"
      >
        <FolderOpen className="w-5 h-5" />
      </button>

      {/* Controller Panel */}
      {showController && (
        <div className="fixed bottom-32 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Layout Manager</h3>
            <button
              onClick={() => setShowController(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Current Layout Info */}
          <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
            <div className="text-sm text-gray-600 dark:text-gray-400">Current Layout</div>
            <div className="font-medium">{currentLayout?.name || 'Default'}</div>
            <div className="text-xs text-gray-500">
              {currentLayout?.tabs?.length || 0} tabs
            </div>
          </div>

          {/* Save Current Layout */}
          <div className="mb-4">
            {showSaveDialog ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLayoutName}
                  onChange={(e) => setNewLayoutName(e.target.value)}
                  placeholder="Layout name..."
                  className="flex-1 px-2 py-1 border rounded text-sm"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveLayout()}
                />
                <button
                  onClick={handleSaveLayout}
                  className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setShowSaveDialog(false)
                    setNewLayoutName('')
                  }}
                  className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSaveDialog(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                <Save className="w-4 h-4" />
                Save Current Layout
              </button>
            )}
          </div>

          {/* Saved Layouts List */}
          <div>
            <h4 className="text-sm font-medium mb-2">Saved Layouts</h4>
            {savedLayouts.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">
                No saved layouts yet
              </div>
            ) : (
              <div className="space-y-2">
                {savedLayouts.map(layout => (
                  <div
                    key={layout.id}
                    className={`p-2 rounded border ${
                      layout.isActive 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{layout.name}</div>
                        <div className="text-xs text-gray-500">
                          {layout.tabCount} tabs • {new Date(layout.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleLoadLayout(layout.id)}
                          className="p-1 text-blue-500 hover:bg-blue-100 rounded"
                          title="Load layout"
                        >
                          <FolderOpen className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteLayout(layout.id)}
                          className="p-1 text-red-500 hover:bg-red-100 rounded"
                          title="Delete layout"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}