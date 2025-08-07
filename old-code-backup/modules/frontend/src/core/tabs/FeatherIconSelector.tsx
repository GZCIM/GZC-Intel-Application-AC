// Feather Icon Selector Component
// Provides a visual grid selector for Feather icons from the public directory

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, X } from 'lucide-react'

interface FeatherIconSelectorProps {
  selectedIcon: string
  onSelectIcon: (iconName: string) => void
  isOpen: boolean
  onClose: () => void
}

// Predefined list of available Feather icons with categories
const FEATHER_ICONS = [
  // Navigation & UI
  { name: 'home', category: 'navigation' },
  { name: 'menu', category: 'navigation' },
  { name: 'search', category: 'navigation' },
  { name: 'settings', category: 'navigation' },
  { name: 'grid', category: 'navigation' },
  { name: 'layout', category: 'navigation' },
  { name: 'sidebar', category: 'navigation' },
  { name: 'layers', category: 'navigation' },
  
  // Business & Finance
  { name: 'briefcase', category: 'business' },
  { name: 'dollar-sign', category: 'business' },
  { name: 'credit-card', category: 'business' },
  { name: 'trending-up', category: 'business' },
  { name: 'trending-down', category: 'business' },
  { name: 'bar-chart', category: 'business' },
  { name: 'bar-chart-2', category: 'business' },
  { name: 'pie-chart', category: 'business' },
  
  // Data & Analytics
  { name: 'database', category: 'data' },
  { name: 'server', category: 'data' },
  { name: 'activity', category: 'data' },
  { name: 'cpu', category: 'data' },
  { name: 'hard-drive', category: 'data' },
  { name: 'monitor', category: 'data' },
  { name: 'terminal', category: 'data' },
  { name: 'code', category: 'data' },
  
  // Communication
  { name: 'mail', category: 'communication' },
  { name: 'message-circle', category: 'communication' },
  { name: 'message-square', category: 'communication' },
  { name: 'phone', category: 'communication' },
  { name: 'video', category: 'communication' },
  { name: 'mic', category: 'communication' },
  { name: 'users', category: 'communication' },
  { name: 'user', category: 'communication' },
  
  // Files & Documents
  { name: 'file', category: 'files' },
  { name: 'file-text', category: 'files' },
  { name: 'folder', category: 'files' },
  { name: 'book', category: 'files' },
  { name: 'book-open', category: 'files' },
  { name: 'archive', category: 'files' },
  { name: 'clipboard', category: 'files' },
  { name: 'copy', category: 'files' },
  
  // Actions
  { name: 'edit', category: 'actions' },
  { name: 'edit-2', category: 'actions' },
  { name: 'edit-3', category: 'actions' },
  { name: 'save', category: 'actions' },
  { name: 'download', category: 'actions' },
  { name: 'upload', category: 'actions' },
  { name: 'share', category: 'actions' },
  { name: 'copy', category: 'actions' },
  
  // Status & Alerts
  { name: 'check', category: 'status' },
  { name: 'check-circle', category: 'status' },
  { name: 'x', category: 'status' },
  { name: 'x-circle', category: 'status' },
  { name: 'alert-circle', category: 'status' },
  { name: 'alert-triangle', category: 'status' },
  { name: 'info', category: 'status' },
  { name: 'help-circle', category: 'status' },
  
  // Media & Entertainment
  { name: 'play', category: 'media' },
  { name: 'pause', category: 'media' },
  { name: 'stop-circle', category: 'media' },
  { name: 'music', category: 'media' },
  { name: 'video', category: 'media' },
  { name: 'camera', category: 'media' },
  { name: 'image', category: 'media' },
  { name: 'film', category: 'media' },
  
  // Tools & Utilities
  { name: 'tool', category: 'tools' },
  { name: 'scissors', category: 'tools' },
  { name: 'pen-tool', category: 'tools' },
  { name: 'compass', category: 'tools' },
  { name: 'target', category: 'tools' },
  { name: 'crosshair', category: 'tools' },
  { name: 'sliders', category: 'tools' },
  { name: 'filter', category: 'tools' },
  
  // Weather & Nature
  { name: 'sun', category: 'weather' },
  { name: 'moon', category: 'weather' },
  { name: 'cloud', category: 'weather' },
  { name: 'wind', category: 'weather' },
  { name: 'droplet', category: 'weather' },
  { name: 'umbrella', category: 'weather' },
  { name: 'zap', category: 'weather' },
  { name: 'thermometer', category: 'weather' },
  
  // Transportation
  { name: 'truck', category: 'transport' },
  { name: 'navigation', category: 'transport' },
  { name: 'map', category: 'transport' },
  { name: 'map-pin', category: 'transport' },
  { name: 'anchor', category: 'transport' },
  { name: 'airplay', category: 'transport' },
  
  // Technology
  { name: 'smartphone', category: 'tech' },
  { name: 'tablet', category: 'tech' },
  { name: 'wifi', category: 'tech' },
  { name: 'bluetooth', category: 'tech' },
  { name: 'radio', category: 'tech' },
  { name: 'cast', category: 'tech' },
  { name: 'tv', category: 'tech' },
  { name: 'monitor', category: 'tech' }
]

const CATEGORIES = [
  'all',
  'navigation',
  'business', 
  'data',
  'communication',
  'files',
  'actions',
  'status',
  'media',
  'tools',
  'weather',
  'transport',
  'tech'
]

export function FeatherIconSelector({ selectedIcon, onSelectIcon, isOpen, onClose }: FeatherIconSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [iconPreviewCache, setIconPreviewCache] = useState<Record<string, string>>({})

  // Filter icons based on search and category
  const filteredIcons = FEATHER_ICONS.filter(icon => {
    const matchesSearch = icon.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || icon.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Preload icon SVGs for display
  useEffect(() => {
    filteredIcons.forEach(icon => {
      if (!iconPreviewCache[icon.name]) {
        fetch(`/feather/${icon.name}.svg`)
          .then(response => response.text())
          .then(svgContent => {
            setIconPreviewCache(prev => ({
              ...prev,
              [icon.name]: svgContent
            }))
          })
          .catch(error => {
            console.warn(`Failed to load icon: ${icon.name}`, error)
          })
      }
    })
  }, [filteredIcons, iconPreviewCache])

  const handleIconSelect = (iconName: string) => {
    onSelectIcon(iconName)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Select Feather Icon
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search icons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              {CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          {/* Current Selection */}
          {selectedIcon && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>Current:</span>
              <div className="flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                {iconPreviewCache[selectedIcon] && (
                  <div 
                    className="w-4 h-4"
                    dangerouslySetInnerHTML={{ __html: iconPreviewCache[selectedIcon] }}
                  />
                )}
                <span>{selectedIcon}</span>
              </div>
            </div>
          )}
        </div>

        {/* Icon Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-8 gap-2">
            {filteredIcons.map(icon => (
              <button
                key={icon.name}
                onClick={() => handleIconSelect(icon.name)}
                className={`p-3 rounded-lg border transition-all hover:shadow-md ${
                  selectedIcon === icon.name
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                title={icon.name}
              >
                {iconPreviewCache[icon.name] ? (
                  <div 
                    className="w-6 h-6 mx-auto text-gray-700 dark:text-gray-300"
                    dangerouslySetInnerHTML={{ __html: iconPreviewCache[icon.name] }}
                  />
                ) : (
                  <div className="w-6 h-6 mx-auto bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                )}
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {icon.name}
                </div>
              </button>
            ))}
          </div>
          
          {filteredIcons.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2" />
              <p>No icons found matching your criteria</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{filteredIcons.length} icons available</span>
            <span>Click an icon to select</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// Helper function to get icon SVG content
export function getFeatherIconSvg(iconName: string): Promise<string> {
  return fetch(`/feather/${iconName}.svg`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Icon not found: ${iconName}`)
      }
      return response.text()
    })
}

// Helper function to create icon display component
export function FeatherIcon({ name, className = "w-4 h-4" }: { name: string; className?: string }) {
  const [svgContent, setSvgContent] = React.useState<string>('')
  
  React.useEffect(() => {
    getFeatherIconSvg(name)
      .then(setSvgContent)
      .catch(() => {
        // Fallback to a default icon or empty
        setSvgContent('')
      })
  }, [name])
  
  if (!svgContent) {
    return <div className={`${className} bg-gray-200 dark:bg-gray-700 rounded animate-pulse`} />
  }
  
  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  )
}