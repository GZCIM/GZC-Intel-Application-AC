// Enhanced Tab Controller Interface
// Expandable edit interface for comprehensive tab and layout management

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Edit3, ChevronDown, ChevronRight, Plus, Save, Trash2, Copy, 
  Globe, User, Layers, Component, Settings, Link, RefreshCw,
  Server, Container, Cloud, CheckCircle, AlertCircle, XCircle
} from 'lucide-react'
import { 
  TabTemplate, ComponentRegistryEntry, LayoutCollection, ComponentLink,
  DEFAULT_COMPONENT_REGISTRY, EXAMPLE_EXTERNAL_COMPONENTS
} from './TabTemplate'
import { FeatherIconSelector, FeatherIcon } from './FeatherIconSelector'

interface TabControllerInterfaceProps {
  isOpen: boolean
  onClose: () => void
  onCreateTab: (template: TabTemplate) => void
  onSaveLayout: (name: string, scope: 'user' | 'global') => void
  currentUser: string
  editingTabId?: string | null
}

export function TabControllerInterface({ 
  isOpen, 
  onClose, 
  onCreateTab, 
  onSaveLayout,
  currentUser 
}: TabControllerInterfaceProps) {
  // State management
  const [activeSection, setActiveSection] = useState<'templates' | 'components' | 'layouts'>('templates')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['templates']))
  const [selectedScope, setSelectedScope] = useState<'user' | 'global'>('user')
  
  // Template creation state
  const [newTemplate, setNewTemplate] = useState<Partial<TabTemplate>>({
    name: '',
    icon: 'file-text',
    description: '',
    scope: 'user',
    tags: []
  })
  const [selectedComponent, setSelectedComponent] = useState<ComponentRegistryEntry | null>(null)
  const [showIconSelector, setShowIconSelector] = useState(false)
  
  // Layout management state
  const [layoutName, setLayoutName] = useState('')
  const [savedLayouts, setSavedLayouts] = useState<LayoutCollection[]>([])
  
  // Component registry state
  const [componentRegistry, setComponentRegistry] = useState<ComponentRegistryEntry[]>(
    [...DEFAULT_COMPONENT_REGISTRY, ...EXAMPLE_EXTERNAL_COMPONENTS]
  )
  const [componentFilter, setComponentFilter] = useState<'all' | 'local' | 'container' | 'k8s'>('all')

  // Mock data for saved layouts
  useEffect(() => {
    setSavedLayouts([
      {
        id: 'trading-workspace',
        name: 'Trading Workspace',
        description: 'Portfolio and trading terminal setup',
        tabs: [],
        scope: 'global',
        createdBy: 'admin',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        version: '1.0.0',
        tags: ['trading']
      },
      {
        id: 'analytics-dashboard',
        name: 'Analytics Dashboard',
        description: 'Comprehensive analytics and monitoring',
        tabs: [],
        scope: 'user',
        createdBy: currentUser,
        createdAt: '2025-01-02T00:00:00Z',
        updatedAt: '2025-01-02T00:00:00Z',
        version: '1.0.0',
        tags: ['analytics']
      }
    ])
  }, [currentUser])

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const handleCreateTemplate = () => {
    if (!newTemplate.name || !selectedComponent) return

    const componentLink: ComponentLink = {
      type: selectedComponent.type === 'local' ? 'registry' : 
            selectedComponent.type === 'container' ? 'external' : 'k8s',
      componentId: selectedComponent.id,
      ...(selectedComponent.k8sConfig && {
        endpoint: `${selectedComponent.k8sConfig.protocol}://${selectedComponent.k8sConfig.service}.${selectedComponent.k8sConfig.namespace}.svc.cluster.local:${selectedComponent.k8sConfig.port}`,
        namespace: selectedComponent.k8sConfig.namespace,
        service: selectedComponent.k8sConfig.service,
        port: selectedComponent.k8sConfig.port,
        path: selectedComponent.k8sConfig.path
      }),
      ...(selectedComponent.containerPort && {
        port: selectedComponent.containerPort
      }),
      authentication: selectedComponent.authentication,
      healthCheck: selectedComponent.healthCheck,
      metadata: {
        name: selectedComponent.name,
        version: selectedComponent.version,
        description: selectedComponent.description,
        category: selectedComponent.category,
        tags: selectedComponent.tags,
        author: selectedComponent.author
      }
    }

    const template: TabTemplate = {
      id: `tab-${Date.now()}`,
      name: newTemplate.name!,
      icon: newTemplate.icon!,
      description: newTemplate.description,
      componentLink,
      scope: selectedScope,
      createdBy: currentUser,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: newTemplate.tags
    }

    onCreateTab(template)
    
    // Reset form
    setNewTemplate({
      name: '',
      icon: 'file-text',
      description: '',
      scope: 'user',
      tags: []
    })
    setSelectedComponent(null)
    setShowIconSelector(false)
  }

  const handleSaveLayout = () => {
    if (!layoutName.trim()) return
    onSaveLayout(layoutName.trim(), selectedScope)
    setLayoutName('')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'loading': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <AlertCircle className="w-4 h-4 text-yellow-500" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'local': return <Component className="w-4 h-4 text-blue-500" />
      case 'container': return <Container className="w-4 h-4 text-green-500" />
      case 'k8s': return <Cloud className="w-4 h-4 text-purple-500" />
      default: return <Server className="w-4 h-4 text-gray-500" />
    }
  }

  const filteredComponents = componentRegistry.filter(comp => 
    componentFilter === 'all' || comp.type === componentFilter
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Edit3 className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Tab & Layout Controller
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Scope:</span>
                  <select
                    value={selectedScope}
                    onChange={(e) => setSelectedScope(e.target.value as 'user' | 'global')}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
                  >
                    <option value="user">User</option>
                    <option value="global">Global</option>
                  </select>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex h-[70vh]">
              {/* Left Sidebar - Section Navigation */}
              <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Controller Sections
                  </h3>
                  
                  {/* Templates Section */}
                  <div className="mb-2">
                    <button
                      onClick={() => toggleSection('templates')}
                      className="flex items-center justify-between w-full p-2 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        <span className="text-sm font-medium">Tab Templates</span>
                      </div>
                      {expandedSections.has('templates') ? 
                        <ChevronDown className="w-4 h-4" /> : 
                        <ChevronRight className="w-4 h-4" />
                      }
                    </button>
                    
                    <AnimatePresence>
                      {expandedSections.has('templates') && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="ml-6 mt-1 space-y-1"
                        >
                          <button
                            onClick={() => setActiveSection('templates')}
                            className={`block w-full text-left px-2 py-1 text-xs rounded ${
                              activeSection === 'templates' 
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                          >
                            Create Template
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Components Section */}
                  <div className="mb-2">
                    <button
                      onClick={() => toggleSection('components')}
                      className="flex items-center justify-between w-full p-2 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <div className="flex items-center gap-2">
                        <Component className="w-4 h-4" />
                        <span className="text-sm font-medium">Component Registry</span>
                      </div>
                      {expandedSections.has('components') ? 
                        <ChevronDown className="w-4 h-4" /> : 
                        <ChevronRight className="w-4 h-4" />
                      }
                    </button>
                    
                    <AnimatePresence>
                      {expandedSections.has('components') && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="ml-6 mt-1 space-y-1"
                        >
                          <button
                            onClick={() => setActiveSection('components')}
                            className={`block w-full text-left px-2 py-1 text-xs rounded ${
                              activeSection === 'components' 
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                          >
                            Browse Components
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Layouts Section */}
                  <div className="mb-2">
                    <button
                      onClick={() => toggleSection('layouts')}
                      className="flex items-center justify-between w-full p-2 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        <span className="text-sm font-medium">Layout Management</span>
                      </div>
                      {expandedSections.has('layouts') ? 
                        <ChevronDown className="w-4 h-4" /> : 
                        <ChevronRight className="w-4 h-4" />
                      }
                    </button>
                    
                    <AnimatePresence>
                      {expandedSections.has('layouts') && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="ml-6 mt-1 space-y-1"
                        >
                          <button
                            onClick={() => setActiveSection('layouts')}
                            className={`block w-full text-left px-2 py-1 text-xs rounded ${
                              activeSection === 'layouts' 
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                          >
                            Manage Layouts
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-hidden">
                {/* Tab Templates Section */}
                {activeSection === 'templates' && (
                  <div className="h-full flex flex-col">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Create Tab Template
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-6">
                        {/* Template Configuration */}
                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-700 dark:text-gray-300">Template Details</h4>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Template Name
                            </label>
                            <input
                              type="text"
                              value={newTemplate.name || ''}
                              onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="My Custom Tab"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Icon
                            </label>
                            <button
                              onClick={() => setShowIconSelector(true)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left flex items-center gap-2"
                            >
                              <FeatherIcon name={newTemplate.icon || 'file-text'} className="w-4 h-4" />
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {newTemplate.icon || 'Select icon'}
                              </span>
                            </button>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Description
                            </label>
                            <textarea
                              value={newTemplate.description || ''}
                              onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Description of what this tab does..."
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                            />
                          </div>
                        </div>

                        {/* Component Selection */}
                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-700 dark:text-gray-300">Component Selection</h4>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Component Type Filter
                            </label>
                            <select
                              value={componentFilter}
                              onChange={(e) => setComponentFilter(e.target.value as any)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                            >
                              <option value="all">All Components</option>
                              <option value="local">Local (Bundled)</option>
                              <option value="container">Container Apps</option>
                              <option value="k8s">Kubernetes Services</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Select Component
                            </label>
                            <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg">
                              {filteredComponents.map(component => (
                                <button
                                  key={component.id}
                                  onClick={() => setSelectedComponent(component)}
                                  className={`w-full p-3 text-left border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                    selectedComponent?.id === component.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      {getTypeIcon(component.type)}
                                      <span className="text-2xl">{component.icon}</span>
                                      <div>
                                        <div className="font-medium text-sm">{component.name}</div>
                                        <div className="text-xs text-gray-500">{component.category} • {component.version}</div>
                                      </div>
                                    </div>
                                    {getStatusIcon(component.status)}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Selected Component Details */}
                      {selectedComponent && (
                        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Selected Component</h5>
                          <div className="flex items-center gap-3 mb-2">
                            {getTypeIcon(selectedComponent.type)}
                            <span className="text-2xl">{selectedComponent.icon}</span>
                            <div>
                              <div className="font-medium">{selectedComponent.name}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">{selectedComponent.description}</div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedComponent.tags.map(tag => (
                              <span
                                key={tag}
                                className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Create Button */}
                      <div className="mt-6">
                        <button
                          onClick={handleCreateTemplate}
                          disabled={!newTemplate.name || !selectedComponent}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Create Tab Template
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Component Registry Section */}
                {activeSection === 'components' && (
                  <div className="h-full flex flex-col">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Component Registry
                      </h3>
                      
                      <div className="flex items-center gap-4 mb-4">
                        <select
                          value={componentFilter}
                          onChange={(e) => setComponentFilter(e.target.value as any)}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        >
                          <option value="all">All Types</option>
                          <option value="local">Local Components</option>
                          <option value="container">Container Apps</option>
                          <option value="k8s">Kubernetes Services</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredComponents.map(component => (
                          <div
                            key={component.id}
                            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                {getTypeIcon(component.type)}
                                <span className="text-2xl">{component.icon}</span>
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-white">{component.name}</h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{component.category} • v{component.version}</p>
                                </div>
                              </div>
                              {getStatusIcon(component.status)}
                            </div>
                            
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{component.description}</p>
                            
                            <div className="flex flex-wrap gap-1 mb-3">
                              {component.tags.slice(0, 3).map(tag => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {component.tags.length > 3 && (
                                <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                                  +{component.tags.length - 3}
                                </span>
                              )}
                            </div>
                            
                            {component.type === 'k8s' && component.k8sConfig && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                <div>Namespace: {component.k8sConfig.namespace}</div>
                                <div>Service: {component.k8sConfig.service}:{component.k8sConfig.port}</div>
                              </div>
                            )}
                            
                            {component.type === 'container' && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                <div>Image: {component.containerImage}</div>
                                <div>Port: {component.containerPort}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Layout Management Section */}
                {activeSection === 'layouts' && (
                  <div className="h-full flex flex-col">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Layout Management
                      </h3>
                      
                      {/* Save Current Layout */}
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
                        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Save Current Layout</h4>
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            value={layoutName}
                            onChange={(e) => setLayoutName(e.target.value)}
                            placeholder="Layout name..."
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                          />
                          <button
                            onClick={handleSaveLayout}
                            disabled={!layoutName.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium"
                          >
                            <Save className="w-4 h-4" />
                            Save as {selectedScope === 'global' ? 'Global' : 'User'}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Saved Layouts */}
                    <div className="flex-1 overflow-y-auto p-6">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Saved Layouts</h4>
                      <div className="space-y-3">
                        {savedLayouts.map(layout => (
                          <div
                            key={layout.id}
                            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {layout.scope === 'global' ? 
                                  <Globe className="w-5 h-5 text-blue-500" /> :
                                  <User className="w-5 h-5 text-green-500" />
                                }
                                <div>
                                  <h5 className="font-medium text-gray-900 dark:text-white">{layout.name}</h5>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{layout.description}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {layout.scope} • by {layout.createdBy} • v{layout.version}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              </div>
                            </div>
                            
                            {layout.tags && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {layout.tags.map(tag => (
                                  <span
                                    key={tag}
                                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      
      {/* Feather Icon Selector */}
      <FeatherIconSelector
        selectedIcon={newTemplate.icon || 'file-text'}
        onSelectIcon={(iconName) => setNewTemplate(prev => ({ ...prev, icon: iconName }))}
        isOpen={showIconSelector}
        onClose={() => setShowIconSelector(false)}
      />
    </AnimatePresence>
  )
}