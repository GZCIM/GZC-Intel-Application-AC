// Enhanced Component Loader with Template Support
// Handles component loading from registry, external services, and K8s

import React, { Suspense, lazy, ComponentType, useState, useEffect } from 'react'
import { useTabLayout } from './TabLayoutManager'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import { ComponentLink, TabTemplate } from './TabTemplate'
import { FeatherIcon } from '../../components/icons/FeatherIcon'
import { TabContainer } from '../../components/TabContainer'
import { TabEditButton } from '../../components/TabEditButton'
// GridTabWrapper removed - all components render directly
import { 
  componentRegistry, 
  COMPONENT_NAMES
} from './componentRegistry'

// External Component Wrapper - Handles external/K8s components
interface ExternalComponentWrapperProps {
  componentLink: ComponentLink
  template?: TabTemplate
}

function ExternalComponentWrapper({ componentLink, template }: ExternalComponentWrapperProps) {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [healthCheckStatus, setHealthCheckStatus] = useState<'checking' | 'healthy' | 'unhealthy'>('checking')

  useEffect(() => {
    // Health check for external components
    const performHealthCheck = async () => {
      if (!componentLink.healthCheck?.enabled) {
        setHealthCheckStatus('healthy')
        return
      }

      try {
        setHealthCheckStatus('checking')
        const healthUrl = `${componentLink.endpoint}${componentLink.healthCheck.endpoint}`
        
        // Create AbortController for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), componentLink.healthCheck.timeout || 5000)
        
        const response = await fetch(healthUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(componentLink.authentication?.headers || {})
          }
        })
        
        clearTimeout(timeoutId)

        if (response.ok) {
          setHealthCheckStatus('healthy')
          setStatus('connected')
        } else {
          throw new Error(`Health check failed: ${response.status} ${response.statusText}`)
        }
      } catch (error) {
        setHealthCheckStatus('unhealthy')
        setErrorMessage(error instanceof Error ? error.message : 'Health check failed')
        setStatus('error')
      }
    }

    performHealthCheck()

    // Set up periodic health checks
    if (componentLink.healthCheck?.enabled && componentLink.healthCheck.interval) {
      const interval = setInterval(performHealthCheck, componentLink.healthCheck.interval)
      return () => clearInterval(interval)
    }
  }, [componentLink])

  const handleRetry = () => {
    setStatus('loading')
    setErrorMessage('')
    // Trigger health check
    setTimeout(() => {
      window.location.reload() // Simple retry - could be more sophisticated
    }, 1000)
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 animate-spin">
            <FeatherIcon name="refresh-cw" size={32} color="#3B82F6" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Connecting to {template?.name || 'External Component'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {componentLink.type === 'k8s' ? 'Connecting to Kubernetes service...' : 'Connecting to external service...'}
          </p>
          <div className="mt-4 text-xs text-gray-400">
            <div>Endpoint: {componentLink.endpoint}</div>
            {componentLink.namespace && <div>Namespace: {componentLink.namespace}</div>}
            {componentLink.service && <div>Service: {componentLink.service}</div>}
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 mx-auto mb-4">
            <FeatherIcon name="alert-triangle" size={48} color="#EF4444" />
          </div>
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
            Connection Failed
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Unable to connect to {template?.name || 'external component'}
          </p>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            <div>Type: {componentLink.type}</div>
            <div>Endpoint: {componentLink.endpoint}</div>
            {componentLink.namespace && <div>Namespace: {componentLink.namespace}</div>}
          </div>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  // Render iframe for external components
  const iframeUrl = componentLink.path ? 
    `${componentLink.endpoint}${componentLink.path}` : 
    componentLink.endpoint

  return (
    <div className="h-full flex flex-col">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            healthCheckStatus === 'healthy' ? 'bg-green-500' :
            healthCheckStatus === 'checking' ? 'bg-yellow-500' :
            'bg-red-500'
          }`} />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {template?.name || componentLink.componentId}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {componentLink.type === 'k8s' ? 'Kubernetes' : 'External'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {healthCheckStatus === 'checking' && (
            <div className="w-4 h-4 animate-spin">
              <FeatherIcon name="refresh-cw" size={16} color="#3B82F6" />
            </div>
          )}
          {healthCheckStatus === 'healthy' && (
            <FeatherIcon name="check-circle" size={16} color="#10B981" />
          )}
          <a
            href={iframeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Open in new tab"
          >
            <FeatherIcon name="external-link" size={16} color="#6B7280" />
          </a>
        </div>
      </div>

      {/* Component iframe */}
      <div className="flex-1 relative">
        <iframe
          src={iframeUrl}
          className="w-full h-full border-0"
          title={template?.name || componentLink.componentId}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
          loading="lazy"
          onLoad={() => setStatus('connected')}
          onError={() => setStatus('error')}
        />
      </div>
    </div>
  )
}

// Fallback component for unregistered components
const UnknownComponent = ({ componentId }: { componentId: string }) => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="w-12 h-12 mx-auto mb-4">
        <FeatherIcon name="server" size={48} color="#9CA3AF" />
      </div>
      <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
        Component Not Found
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-500">
        Component "{componentId}" is not registered in the component registry.
      </p>
    </div>
  </div>
)

// Loading component
const LoadingComponent = ({ name }: { name: string }) => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="w-8 h-8 mx-auto mb-4 animate-spin">
        <FeatherIcon name="refresh-cw" size={32} color="#3B82F6" />
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">Loading {name}...</p>
    </div>
  </div>
)

// Error fallback component
const ErrorFallback = ({ error, componentName }: { error: Error; componentName: string }) => (
  <div className="flex items-center justify-center h-full">
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
      <div className="w-8 h-8 mx-auto mb-4">
        <FeatherIcon name="alert-triangle" size={32} color="#EF4444" />
      </div>
      <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
        Error Loading {componentName}
      </h3>
      <p className="text-sm text-red-600 dark:text-red-400 mb-4">
        {error.message}
      </p>
      <details className="text-xs text-red-500 dark:text-red-400">
        <summary className="cursor-pointer">Error Details</summary>
        <pre className="mt-2 whitespace-pre-wrap">{error.stack}</pre>
      </details>
    </div>
  </div>
)

export function EnhancedComponentLoader() {
  const { currentLayout, activeTabId, updateTab, saveCurrentLayout, updateTabGridLayout, toggleTabGridLayout } = useTabLayout()
  
  console.log('EnhancedComponentLoader: Rendering', { currentLayout, activeTabId })
  
  if (!currentLayout || !activeTabId) {
    console.log('EnhancedComponentLoader: No layout or activeTabId')
    return null
  }
  
  const activeTab = currentLayout.tabs.find(tab => tab.id === activeTabId)
  console.log('EnhancedComponentLoader: Active tab', activeTab)
  
  if (!activeTab) {
    console.log('EnhancedComponentLoader: No active tab found')
    return null
  }

  const handleChangeComponent = (newComponentId: string) => {
    updateTab(activeTabId, { component: newComponentId })
  }

  const handleSaveLayout = () => {
    // Save the current layout configuration
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
    saveCurrentLayout(`Layout ${timestamp}`)
  }

  const handleUpdateTabTitle = (shortName: string, fullName: string) => {
    updateTab(activeTabId, { 
      name: shortName, // Short name for the tab menu
      props: { 
        ...activeTab.props, 
        fullName: fullName // Full name for the header
      }
    })
  }

  const handleGridLayoutChange = (layouts: any) => {
    updateTabGridLayout(activeTabId, layouts)
  }

  // Check if this tab has a component link (from template)
  const componentLink = activeTab.props?.componentLink as ComponentLink | undefined
  const template = activeTab.props?.template as TabTemplate | undefined

  // Handle external/K8s components
  if (componentLink && (componentLink.type === 'external' || componentLink.type === 'k8s')) {
    return (
      <ErrorBoundary
        fallback={<ErrorFallback error={new Error('External component crashed')} componentName={activeTab.name} />}
      >
        <ExternalComponentWrapper componentLink={componentLink} template={template} />
      </ErrorBoundary>
    )
  }

  // Handle registry components (local and registry-based)
  console.log('EnhancedComponentLoader: Looking for component', activeTab.component)
  console.log('EnhancedComponentLoader: Full registry:', Object.keys(componentRegistry))
  console.log('EnhancedComponentLoader: Active tab details:', JSON.stringify(activeTab))
  
  // Fix old dynamic component IDs
  let componentId = activeTab.component
  if (componentId && componentId.startsWith('UserTab_')) {
    console.log('EnhancedComponentLoader: Fixing old component ID:', componentId, '-> UserTabContainer')
    componentId = 'UserTabContainer'
    // Update the tab to fix it permanently
    updateTab(activeTabId, { component: componentId })
  }
  
  const componentLoader = componentRegistry[componentId]
  
  if (!componentLoader) {
    console.log('EnhancedComponentLoader: Component not found in registry', componentId)
    return <UnknownComponent componentId={componentId} />
  }
  
  console.log('EnhancedComponentLoader: Component loader found, creating lazy component')
  
  // Wrap the loader to catch errors
  const Component = lazy(async () => {
    try {
      console.log('EnhancedComponentLoader: Loading component:', componentId)
      const module = await componentLoader()
      console.log('EnhancedComponentLoader: Component loaded successfully:', componentId, module)
      return module
    } catch (error) {
      console.error('EnhancedComponentLoader: Failed to load component module:', componentId, error)
      throw error
    }
  })
  
  const componentName = COMPONENT_NAMES[componentId] || componentId
  
  // Render all components with edit/save button for user-created tabs
  console.log('EnhancedComponentLoader: Rendering component directly:', componentId)
  
  // Return the component wrapped in error boundary
  return (
    <div className="h-full w-full" key={`${activeTab.id}-${componentId}`}>
      <ErrorBoundary>
        <Suspense fallback={<LoadingComponent name={activeTab.name} />}>
          <div className="h-full w-full relative" style={{ height: '100%', width: '100%' }}>
            {/* Edit/Save Button for User-Created Tabs */}
            {activeTab.closable && (
              <TabEditButton tabId={activeTab.id} />
            )}
            <Component {...(activeTab.props || {})} tabId={activeTab.id} type={activeTab.type} />
          </div>
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}

// Re-export registry functions are in componentRegistry.ts, not here

