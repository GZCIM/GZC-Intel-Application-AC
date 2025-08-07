import React from 'react'
import { ComponentContract, ComponentRegistryEntry } from '../contracts/ComponentContract'
import { ContractValidator } from '../contracts/ContractValidator'

/**
 * PROFESSIONAL COMPONENT REGISTRY
 * 
 * Manages components with full contract validation
 * Enforces professional standards for all components
 */

export class ProfessionalComponentRegistry {
  private static registry = new Map<string, ComponentRegistryEntry>()
  private static initPromise: Promise<void> | null = null

  /**
   * Register a component with contract validation
   */
  static async registerComponent(
    id: string, 
    contract: ComponentContract,
    loader: () => Promise<{ default: React.ComponentType<any> }>
  ): Promise<{ success: boolean; message: string; score?: number }> {
    
    // Validate contract first
    const validation = ContractValidator.validateContract(contract)
    
    if (!validation.valid) {
      console.error(`❌ Component registration failed for ${id}:`, validation.errors)
      return {
        success: false,
        message: `Contract validation failed: ${validation.errors.join(', ')}`,
        score: validation.score
      }
    }

    // Load component to verify it exists
    try {
      const { default: component } = await loader()
      
      const entry: ComponentRegistryEntry = {
        contract,
        component,
        loader,
        status: 'available',
        dependencies: []
      }

      // Validate complete registry entry
      const entryValidation = ContractValidator.validateRegistryEntry(entry)
      
      if (!entryValidation.valid) {
        console.error(`❌ Registry entry validation failed for ${id}:`, entryValidation.errors)
        return {
          success: false,
          message: `Registry validation failed: ${entryValidation.errors.join(', ')}`,
          score: entryValidation.score
        }
      }

      this.registry.set(id, entry)
      
      console.log(`✅ Component ${id} registered successfully (score: ${validation.score}/100)`)
      
      if (validation.warnings.length > 0) {
        console.warn(`⚠️ Component ${id} warnings:`, validation.warnings)
      }

      return {
        success: true,
        message: `Component registered successfully with score ${validation.score}/100`,
        score: validation.score
      }
      
    } catch (error) {
      console.error(`❌ Failed to load component ${id}:`, error)
      return {
        success: false,
        message: `Failed to load component: ${error}`
      }
    }
  }

  /**
   * Get component by ID
   */
  static getComponent(id: string): ComponentRegistryEntry | null {
    return this.registry.get(id) || null
  }

  /**
   * Get all components
   */
  static getAllComponents(): Map<string, ComponentRegistryEntry> {
    return new Map(this.registry)
  }

  /**
   * Get components by category
   */
  static getComponentsByCategory(category: string): ComponentRegistryEntry[] {
    return Array.from(this.registry.values()).filter(
      entry => entry.contract.metadata.category === category
    )
  }

  /**
   * Search components
   */
  static searchComponents(query: string): ComponentRegistryEntry[] {
    const searchTerm = query.toLowerCase()
    
    return Array.from(this.registry.values()).filter(entry => {
      const metadata = entry.contract.metadata
      return (
        metadata.name.toLowerCase().includes(searchTerm) ||
        metadata.displayName.toLowerCase().includes(searchTerm) ||
        metadata.description.toLowerCase().includes(searchTerm) ||
        metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      )
    })
  }

  /**
   * Get component capabilities
   */
  static getComponentCapabilities(id: string) {
    const entry = this.registry.get(id)
    return entry?.contract.capabilities || null
  }

  /**
   * Check if component supports mode
   */
  static supportsMode(id: string, mode: 'standalone' | 'widget' | 'embedded' | 'modal'): boolean {
    const entry = this.registry.get(id)
    return entry?.contract.capabilities.modes[mode] || false
  }

  /**
   * Get performance characteristics
   */
  static getPerformanceInfo(id: string) {
    const entry = this.registry.get(id)
    return entry?.contract.capabilities.performance || null
  }

  /**
   * Validate component props
   */
  static validateComponentProps(id: string, props: any): { valid: boolean; errors: string[] } {
    const entry = this.registry.get(id)
    
    if (!entry) {
      return { valid: false, errors: [`Component ${id} not found`] }
    }

    if (entry.contract.validateProps) {
      return entry.contract.validateProps(props)
    }

    return { valid: true, errors: [] }
  }

  /**
   * Get compatibility matrix
   */
  static getCompatibilityMatrix(id: string) {
    const entry = this.registry.get(id)
    return entry?.compatibilityMatrix || null
  }

  /**
   * Generate registry report
   */
  static generateRegistryReport(): string {
    const components = Array.from(this.registry.entries())
    
    let report = `Professional Component Registry Report\n`
    report += `Generated: ${new Date().toISOString()}\n`
    report += `Components: ${components.length}\n\n`

    // Component summary
    const categories = new Map<string, number>()
    let totalScore = 0
    let validComponents = 0

    components.forEach(([id, entry]) => {
      const category = entry.contract.metadata.category
      categories.set(category, (categories.get(category) || 0) + 1)
      
      const validation = ContractValidator.validateContract(entry.contract)
      if (validation.valid) {
        validComponents++
      }
      totalScore += validation.score
    })

    report += `Categories:\n`
    Array.from(categories.entries()).forEach(([category, count]) => {
      report += `  ${category}: ${count}\n`
    })
    report += '\n'

    report += `Quality Metrics:\n`
    report += `  Valid Components: ${validComponents}/${components.length}\n`
    report += `  Average Score: ${(totalScore / components.length).toFixed(1)}/100\n`
    report += `  Compliance Rate: ${((validComponents / components.length) * 100).toFixed(1)}%\n\n`

    // Component details
    report += `Component Details:\n`
    components.forEach(([id, entry]) => {
      const validation = ContractValidator.validateContract(entry.contract)
      const status = validation.valid ? '✅' : '❌'
      report += `  ${status} ${entry.contract.metadata.displayName} (${id}) - ${validation.score}/100\n`
    })

    return report
  }

  /**
   * Initialize registry with professional components
   */
  static async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = this._doInitialize()
    return this.initPromise
  }

  private static async _doInitialize(): Promise<void> {
    console.log('🚀 Initializing Professional Component Registry...')

    // Register professional example component
    // TODO: Re-enable when ProfessionalComponentExample is created
    // await this.registerComponent(
    //   'professional-example',
    //   ProfessionalComponentContract,
    //   () => import('../../components/ProfessionalComponentExample')
    // )

    // Register test dashboard
    await this.registerComponent(
      'test-dashboard',
      {
        metadata: {
          id: 'test-dashboard',
          name: 'TestDashboard',
          displayName: 'Test Dashboard',
          version: '1.0.0',
          category: 'docs',
          description: 'Architecture validation component',
          icon: 'monitor',
          tags: ['test', 'validation'],
          lastUpdated: '2025-07-05'
        },
        capabilities: {
          sizing: {
            minWidth: 200,
            minHeight: 150,
            resizable: true,
            responsive: true
          },
          modes: {
            standalone: true,
            widget: true,
            embedded: false,
            modal: false
          },
          data: {
            realTime: false,
            historical: false,
            userSpecific: false,
            external: false,
            cached: true
          },
          performance: {
            renderComplexity: 'low',
            memoryUsage: 'light',
            cpuIntensive: false,
            networkIntensive: false
          },
          layout: {
            scrollable: false,
            fixedPosition: false,
            overlay: false
          }
        },
        lifecycle: {
          initialize: async () => {},
          onMount: async () => {},
          onResize: async () => {},
          onUnmount: async () => {}
        },
        dataContract: {
          inputs: [],
          outputs: []
        },
        config: {
          settings: {}
        }
      },
      () => import('../../components/EmptyTab').then(m => ({ default: () => m.EmptyTab({ title: 'Test Dashboard' }) }))
    )

    console.log('✅ Professional Component Registry initialized')
    console.log(this.generateRegistryReport())
  }

  /**
   * Cleanup registry
   */
  static cleanup(): void {
    this.registry.clear()
    this.initPromise = null
    console.log('🧹 Professional Component Registry cleaned up')
  }
}

// Initialize registry on import
ProfessionalComponentRegistry.initialize()

export default ProfessionalComponentRegistry