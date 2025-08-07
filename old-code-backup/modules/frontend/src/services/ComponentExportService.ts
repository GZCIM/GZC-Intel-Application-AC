import { ComponentContract } from '../core/contracts/ComponentContract'
import { componentInventory, ComponentMeta } from '../core/components/ComponentInventory'

interface ExportFormat {
  id: string
  name: string
  displayName: string
  description: string
  version: string
  source: string
  contract: ComponentContract
  implementation: {
    path: string
    dependencies: string[]
  }
  metadata: ComponentMeta
}

export class ComponentExportService {
  /**
   * Export component in a format compatible with other ports
   */
  async exportComponent(componentId: string): Promise<ExportFormat | null> {
    const meta = componentInventory.getComponent(componentId)
    if (!meta) {
      console.error(`Component ${componentId} not found`)
      return null
    }

    // Build export format
    const exportData: ExportFormat = {
      id: meta.id,
      name: meta.name,
      displayName: meta.displayName,
      description: meta.description,
      version: '1.0.0',
      source: 'port-3500',
      contract: this.buildContract(meta),
      implementation: {
        path: `/components/widgets/${meta.name}.tsx`,
        dependencies: meta.dependencies || []
      },
      metadata: meta
    }

    return exportData
  }

  /**
   * Build component contract from metadata
   */
  private buildContract(meta: ComponentMeta): ComponentContract {
    return {
      metadata: {
        id: meta.id,
        name: meta.name,
        displayName: meta.displayName,
        version: '1.0.0',
        description: meta.description,
        author: 'GZC Intel App',
        category: meta.category,
        tags: meta.tags,
        dependencies: meta.dependencies || [],
        repository: 'http://localhost:3500'
      },
      capabilities: {
        sizing: {
          defaultSize: {
            width: meta.defaultSize.w * 100,
            height: meta.defaultSize.h * 100
          },
          minSize: {
            width: meta.minSize.w * 100,
            height: meta.minSize.h * 100
          },
          maxSize: meta.maxSize ? {
            width: meta.maxSize.w * 100,
            height: meta.maxSize.h * 100
          } : null,
          resizable: meta.canResize !== false,
          aspectRatio: null
        },
        modes: {
          display: ['full', 'compact'],
          interaction: ['view', 'edit'],
          themes: ['light', 'dark']
        },
        features: {
          realtime: meta.tags.includes('real-time'),
          offline: false,
          collaborative: false,
          exportable: true,
          printable: false
        },
        performance: {
          renderTime: 100,
          updateInterval: meta.tags.includes('real-time') ? 1000 : null,
          maxDataPoints: 1000,
          throttle: null
        }
      },
      lifecycle: {
        onMount: 'useEffect',
        onUnmount: 'cleanup',
        onUpdate: 'deps',
        onError: 'errorBoundary',
        onResize: meta.canResize ? 'handleResize' : null,
        onThemeChange: 'useTheme',
        onModeChange: null
      },
      dataContract: {
        props: {
          required: [],
          optional: Object.entries(meta.props || {}).map(([name, defaultValue]) => ({
            name,
            type: typeof defaultValue,
            description: `${name} property`,
            default: defaultValue
          }))
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
   * Export component as standalone package
   */
  async exportAsPackage(componentId: string): Promise<{ 
    packageJson: any, 
    componentCode: string,
    readme: string 
  } | null> {
    const exportData = await this.exportComponent(componentId)
    if (!exportData) return null

    const packageJson = {
      name: `@gzc-intel/${exportData.id}`,
      version: exportData.version,
      description: exportData.description,
      main: 'index.js',
      types: 'index.d.ts',
      exports: {
        '.': './index.js',
        './contract': './contract.json'
      },
      peerDependencies: {
        'react': '^18.0.0',
        'react-dom': '^18.0.0'
      },
      dependencies: exportData.implementation.dependencies.reduce((acc, dep) => {
        acc[dep] = '*'
        return acc
      }, {} as Record<string, string>),
      gzcIntel: {
        componentId: exportData.id,
        source: exportData.source,
        quality: exportData.metadata.quality,
        contract: exportData.contract
      }
    }

    const readme = `# ${exportData.displayName}

${exportData.description}

## Installation

\`\`\`bash
npm install @gzc-intel/${exportData.id}
\`\`\`

## Usage

\`\`\`tsx
import { ${exportData.name} } from '@gzc-intel/${exportData.id}'

function App() {
  return <${exportData.name} />
}
\`\`\`

## Component Contract

- **Category**: ${exportData.metadata.category}
- **Tags**: ${exportData.metadata.tags.join(', ')}
- **Quality**: ${exportData.metadata.quality}
- **Source**: ${exportData.source}

## Props

${exportData.contract.dataContract.props.optional.map(prop => 
  `- **${prop.name}** (${prop.type}): ${prop.description}`
).join('\n')}
`

    const componentCode = await this.getComponentSource(componentId)

    return {
      packageJson,
      componentCode: componentCode || '// Component implementation',
      readme
    }
  }

  /**
   * Get component source code
   */
  private async getComponentSource(componentId: string): Promise<string | null> {
    // In a real implementation, this would read the actual component file
    // For now, return a template
    return `import React from 'react'

export const Component: React.FC = (props) => {
  // Component implementation
  return <div>Component ${componentId}</div>
}`
  }

  /**
   * Export multiple components
   */
  async exportMultiple(componentIds: string[]): Promise<Map<string, ExportFormat>> {
    const exports = new Map<string, ExportFormat>()
    
    for (const id of componentIds) {
      const exportData = await this.exportComponent(id)
      if (exportData) {
        exports.set(id, exportData)
      }
    }
    
    return exports
  }

  /**
   * Generate export manifest for sharing
   */
  async generateManifest(componentIds: string[]): Promise<{
    version: string
    timestamp: string
    source: string
    components: ExportFormat[]
  }> {
    const components: ExportFormat[] = []
    
    for (const id of componentIds) {
      const exportData = await this.exportComponent(id)
      if (exportData) {
        components.push(exportData)
      }
    }

    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      source: 'port-3500',
      components
    }
  }
}

// Singleton instance
export const componentExportService = new ComponentExportService()