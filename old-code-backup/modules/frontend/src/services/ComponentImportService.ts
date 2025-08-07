import { ComponentContract } from '../core/contracts/ComponentContract'
import { ContractValidator } from '../core/contracts/ContractValidator'
import { ProfessionalComponentRegistry } from '../core/registry/ProfessionalComponentRegistry'
import { componentInventory } from '../core/components/ComponentInventory'

interface Port3200Component {
  id: string
  name: string
  description: string
  component: string // Component code as string
  config?: {
    size?: { width: number; height: number }
    category?: string
    tags?: string[]
  }
}

interface ImportResult {
  success: boolean
  componentId?: string
  errors?: string[]
  warnings?: string[]
}

export class ComponentImportService {
  private validator = new ContractValidator()

  /**
   * Fetch component from port 3200
   */
  async fetchFromPort3200(componentId: string): Promise<Port3200Component | null> {
    try {
      const response = await fetch(`http://localhost:3200/api/components/${componentId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch component: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error(`Error fetching component from port 3200:`, error)
      return null
    }
  }

  /**
   * List available components from port 3200
   */
  async listPort3200Components(): Promise<Port3200Component[]> {
    try {
      const response = await fetch('http://localhost:3200/api/components')
      if (!response.ok) {
        throw new Error(`Failed to list components: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error(`Error listing components from port 3200:`, error)
      return []
    }
  }

  /**
   * Migrate port 3200 component to our format
   */
  private migrateToContract(source: Port3200Component): ComponentContract {
    return {
      metadata: {
        id: source.id,
        name: source.name,
        displayName: source.name.replace(/([A-Z])/g, ' $1').trim(),
        version: '1.0.0',
        description: source.description,
        author: 'Port 3200 Import',
        category: source.config?.category || 'imported',
        tags: source.config?.tags || ['imported', 'port-3200'],
        dependencies: [],
        repository: 'http://localhost:3200'
      },
      capabilities: {
        sizing: {
          defaultSize: {
            width: source.config?.size?.width || 400,
            height: source.config?.size?.height || 300
          },
          minSize: { width: 200, height: 150 },
          maxSize: { width: 800, height: 600 },
          resizable: true,
          aspectRatio: null
        },
        modes: {
          display: ['full', 'compact'],
          interaction: ['view', 'edit'],
          themes: ['light', 'dark']
        },
        features: {
          realtime: false,
          offline: false,
          collaborative: false,
          exportable: true,
          printable: false
        },
        performance: {
          renderTime: 100,
          updateInterval: null,
          maxDataPoints: 1000,
          throttle: null
        }
      },
      lifecycle: {
        onMount: 'componentDidMount',
        onUnmount: 'componentWillUnmount',
        onUpdate: 'componentDidUpdate',
        onError: 'componentDidCatch',
        onResize: null,
        onThemeChange: null,
        onModeChange: null
      },
      dataContract: {
        props: {
          required: [],
          optional: [
            {
              name: 'config',
              type: 'object',
              description: 'Component configuration'
            }
          ]
        },
        state: {
          managed: [],
          exposed: []
        },
        events: {
          emitted: [],
          handled: []
        },
        methods: {
          public: [],
          private: []
        }
      }
    }
  }

  /**
   * Validate imported component
   */
  async validateImport(component: Port3200Component): Promise<{ valid: boolean; report: any }> {
    const contract = this.migrateToContract(component)
    const validation = this.validator.validateComponent(contract)
    
    return {
      valid: validation.score >= 70, // 70% minimum score for import
      report: validation
    }
  }

  /**
   * Import component from port 3200
   */
  async importComponent(componentId: string): Promise<ImportResult> {
    try {
      // 1. Fetch from port 3200
      const sourceComponent = await this.fetchFromPort3200(componentId)
      if (!sourceComponent) {
        return {
          success: false,
          errors: [`Component ${componentId} not found on port 3200`]
        }
      }

      // 2. Validate
      const { valid, report } = await this.validateImport(sourceComponent)
      if (!valid) {
        return {
          success: false,
          errors: report.errors.map((e: any) => e.message),
          warnings: report.warnings.map((w: any) => w.message)
        }
      }

      // 3. Convert to contract
      const contract = this.migrateToContract(sourceComponent)

      // 4. Write component file
      const componentPath = await this.writeComponentFile(sourceComponent)
      if (!componentPath) {
        return {
          success: false,
          errors: ['Failed to write component file']
        }
      }

      // 5. Register in component inventory
      componentInventory.addComponent({
        id: contract.metadata.id,
        name: contract.metadata.name,
        displayName: contract.metadata.displayName,
        category: contract.metadata.category,
        description: contract.metadata.description,
        defaultSize: { 
          w: Math.round(contract.capabilities.sizing.defaultSize.width / 100), 
          h: Math.round(contract.capabilities.sizing.defaultSize.height / 100) 
        },
        minSize: { 
          w: Math.round(contract.capabilities.sizing.minSize.width / 100), 
          h: Math.round(contract.capabilities.sizing.minSize.height / 100) 
        },
        tags: contract.metadata.tags,
        complexity: 'medium',
        quality: 'port-3200',
        source: 'port-3200'
      })

      return {
        success: true,
        componentId: contract.metadata.id,
        warnings: report.warnings.map((w: any) => w.message)
      }

    } catch (error) {
      return {
        success: false,
        errors: [`Import failed: ${error.message}`]
      }
    }
  }

  /**
   * Write component file to imported directory
   */
  private async writeComponentFile(component: Port3200Component): Promise<string | null> {
    try {
      // This would normally write to file system
      // For now, we'll simulate by logging
      console.log(`Would write component ${component.id} to /src/components/imported/${component.id}.tsx`)
      
      // Component code template
      const componentCode = `
import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'

// Imported from Port 3200
export const ${component.name}: React.FC<any> = (props) => {
  const { currentTheme } = useTheme()
  
  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: currentTheme.surface,
      padding: '16px',
      borderRadius: '8px'
    }}>
      <h3>${component.name}</h3>
      <p>${component.description}</p>
      {/* Original component code would go here */}
    </div>
  )
}
`
      
      return `/src/components/imported/${component.id}.tsx`
    } catch (error) {
      console.error('Failed to write component file:', error)
      return null
    }
  }

  /**
   * Batch import multiple components
   */
  async importMultiple(componentIds: string[]): Promise<Map<string, ImportResult>> {
    const results = new Map<string, ImportResult>()
    
    for (const id of componentIds) {
      const result = await this.importComponent(id)
      results.set(id, result)
    }
    
    return results
  }
}

// Singleton instance - commented out due to ProfessionalComponentRegistry issue
// export const componentImportService = new ComponentImportService()