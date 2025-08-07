import { ComponentManifest, RegisteredComponent, ComponentRegistryState, ComponentLoadResult } from './types'

export class ComponentRegistry {
  private state: ComponentRegistryState = {
    components: new Map(),
    loading: new Set(),
    errors: new Map(),
    categories: {}
  }

  private listeners: Set<(state: ComponentRegistryState) => void> = new Set()

  // Subscribe to registry state changes
  subscribe(listener: (state: ComponentRegistryState) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.state))
  }

  // Get current state
  getState(): ComponentRegistryState {
    return { ...this.state }
  }

  // Get all registered components
  getComponents(): RegisteredComponent[] {
    return Array.from(this.state.components.values())
  }

  // Get component by ID
  getComponent(id: string): RegisteredComponent | undefined {
    return this.state.components.get(id)
  }

  // Get components by category
  getComponentsByCategory(category: string): RegisteredComponent[] {
    return this.getComponents().filter(comp => comp.manifest.category === category)
  }

  // Check if component is registered
  isRegistered(id: string): boolean {
    return this.state.components.has(id)
  }

  // Check if component is loading
  isLoading(id: string): boolean {
    return this.state.loading.has(id)
  }

  // Register a component with manifest
  async registerComponent(manifest: ComponentManifest, moduleFactory: () => Promise<any>): Promise<ComponentLoadResult> {
    const { id } = manifest

    // Check if already registered
    if (this.isRegistered(id)) {
      return { success: false, error: `Component ${id} is already registered` }
    }

    // Check if currently loading
    if (this.isLoading(id)) {
      return { success: false, error: `Component ${id} is currently loading` }
    }

    try {
      // Mark as loading
      this.state.loading.add(id)
      this.notify()

      // Load the module
      const module = await moduleFactory()

      // Validate module exports
      if (!module || !module[manifest.exports.component]) {
        throw new Error(`Module does not export component: ${manifest.exports.component}`)
      }

      // Create registered component
      const registeredComponent: RegisteredComponent = {
        manifest,
        module,
        status: 'ready',
        loadedAt: new Date()
      }

      // Add to registry
      this.state.components.set(id, registeredComponent)
      this.state.loading.delete(id)
      this.state.errors.delete(id)

      // Update categories
      if (!this.state.categories[manifest.category]) {
        this.state.categories[manifest.category] = []
      }
      this.state.categories[manifest.category].push(id)

      this.notify()

      return { success: true, component: registeredComponent }
    } catch (error) {
      // Handle loading error
      this.state.loading.delete(id)
      this.state.errors.set(id, error instanceof Error ? error.message : 'Unknown error')
      
      // Create error component entry
      const errorComponent: RegisteredComponent = {
        manifest,
        module: null,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        loadedAt: new Date()
      }

      this.state.components.set(id, errorComponent)
      this.notify()

      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Unregister a component
  unregisterComponent(id: string): boolean {
    const component = this.state.components.get(id)
    if (!component) return false

    // Remove from registry
    this.state.components.delete(id)
    this.state.errors.delete(id)
    
    // Remove from category
    const category = component.manifest.category
    if (this.state.categories[category]) {
      this.state.categories[category] = this.state.categories[category].filter(compId => compId !== id)
      if (this.state.categories[category].length === 0) {
        delete this.state.categories[category]
      }
    }

    this.notify()
    return true
  }

  // Load component from manifest file
  async loadFromManifest(manifestUrl: string): Promise<ComponentLoadResult> {
    try {
      const response = await fetch(manifestUrl)
      if (!response.ok) {
        throw new Error(`Failed to load manifest: ${response.statusText}`)
      }

      const manifest: ComponentManifest = await response.json()
      
      // Create module factory that loads the actual component
      const moduleFactory = async () => {
        const moduleUrl = new URL(manifest.exports.component, manifestUrl).href
        return await import(moduleUrl)
      }

      return await this.registerComponent(manifest, moduleFactory)
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to load manifest' 
      }
    }
  }

  // Get registry statistics
  getStats() {
    const components = this.getComponents()
    const ready = components.filter(c => c.status === 'ready').length
    const loading = this.state.loading.size
    const errors = components.filter(c => c.status === 'error').length

    return {
      total: components.length,
      ready,
      loading,
      errors,
      categories: Object.keys(this.state.categories).length
    }
  }

  // Clear all components
  clear() {
    this.state.components.clear()
    this.state.loading.clear()
    this.state.errors.clear()
    this.state.categories = {}
    this.notify()
  }
}

// Global registry instance
export const componentRegistry = new ComponentRegistry()