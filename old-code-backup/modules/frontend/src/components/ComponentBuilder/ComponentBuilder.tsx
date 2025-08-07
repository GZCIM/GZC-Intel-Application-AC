import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import { ComponentPreview } from './ComponentPreview'
import { CodeEditor } from './CodeEditor'
import { ComponentTester } from './ComponentTester'

interface ComponentTemplate {
  name: string
  description: string
  code: string
  category: 'widget' | 'chart' | 'data' | 'utility' | 'layout'
}

const COMPONENT_TEMPLATES: ComponentTemplate[] = [
  {
    name: 'Basic Widget',
    category: 'widget',
    description: 'Simple widget with theme support',
    code: `import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'

export const MyWidget: React.FC<{ title?: string }> = ({ title = 'My Widget' }) => {
  const { currentTheme: theme } = useTheme()
  
  return (
    <div style={{
      padding: '20px',
      backgroundColor: theme.surface,
      border: \`1px solid \${theme.border}\`,
      borderRadius: '8px',
      color: theme.text
    }}>
      <h3 style={{ margin: 0, color: theme.primary }}>{title}</h3>
      <p style={{ marginTop: '10px', color: theme.textSecondary }}>
        Widget content goes here
      </p>
    </div>
  )
}`
  },
  {
    name: 'Live Data Display',
    category: 'data',
    description: 'Component with live data updates',
    code: `import React, { useState, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'

export const LiveData: React.FC = () => {
  const { currentTheme: theme } = useTheme()
  const [value, setValue] = useState(0)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setValue(prev => prev + (Math.random() - 0.5) * 10)
    }, 1000)
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div style={{
      padding: '16px',
      backgroundColor: theme.surface,
      borderRadius: '8px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.primary }}>
        {value.toFixed(2)}
      </div>
      <div style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '4px' }}>
        Live Value
      </div>
    </div>
  )
}`
  },
  {
    name: 'Mini Chart',
    category: 'chart',
    description: 'Simple line chart component',
    code: `import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'

export const MiniChart: React.FC<{ data?: number[] }> = ({ 
  data = [10, 25, 15, 30, 20, 35, 25, 40] 
}) => {
  const { currentTheme: theme } = useTheme()
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min
  
  return (
    <div style={{
      padding: '16px',
      backgroundColor: theme.surface,
      borderRadius: '8px'
    }}>
      <svg width="100%" height="60" viewBox="0 0 100 60">
        <polyline
          fill="none"
          stroke={theme.primary}
          strokeWidth="2"
          points={data.map((value, i) => 
            \`\${(i / (data.length - 1)) * 100},\${60 - ((value - min) / range) * 50}\`
          ).join(' ')}
        />
      </svg>
    </div>
  )
}`
  }
]

export const ComponentBuilder: React.FC = () => {
  const { currentTheme: theme } = useTheme()
  const [selectedTemplate, setSelectedTemplate] = useState(COMPONENT_TEMPLATES[0])
  const [componentCode, setComponentCode] = useState(selectedTemplate.code)
  const [componentName, setComponentName] = useState('MyComponent')
  const [isPreviewMode, setIsPreviewMode] = useState(true)
  const [exportFormat, setExportFormat] = useState<'registry' | 'file' | 'both'>('registry')

  const handleTemplateSelect = (template: ComponentTemplate) => {
    setSelectedTemplate(template)
    setComponentCode(template.code)
  }

  const handleExport = () => {
    // Generate the component export
    const exportCode = generateExportCode(componentName, componentCode)
    
    if (exportFormat === 'registry' || exportFormat === 'both') {
      // Add to registry
      console.log('Adding to registry:', componentName)
      // This will be implemented to actually update the registry
    }
    
    if (exportFormat === 'file' || exportFormat === 'both') {
      // Download as file
      const blob = new Blob([exportCode], { type: 'text/typescript' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${componentName}.tsx`
      a.click()
    }
  }

  const generateExportCode = (name: string, code: string) => {
    return `// Auto-generated component from Component Builder
${code}

// Registry export
export default ${name}`
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: theme.background
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: `1px solid ${theme.border}`,
        backgroundColor: theme.surface
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: theme.text }}>Component Builder</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              style={{
                padding: '6px 12px',
                backgroundColor: theme.primary,
                color: theme.background,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {isPreviewMode ? 'Code' : 'Preview'}
            </button>
            <button
              onClick={handleExport}
              style={{
                padding: '6px 12px',
                backgroundColor: theme.success,
                color: theme.background,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar - Templates */}
        <div style={{
          width: '250px',
          borderRight: `1px solid ${theme.border}`,
          padding: '16px',
          overflowY: 'auto',
          backgroundColor: theme.surface
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: theme.text, fontSize: '14px' }}>
            Templates
          </h3>
          {COMPONENT_TEMPLATES.map((template) => (
            <motion.div
              key={template.name}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTemplateSelect(template)}
              style={{
                padding: '12px',
                marginBottom: '8px',
                backgroundColor: selectedTemplate.name === template.name 
                  ? `${theme.primary}20` 
                  : theme.background,
                border: `1px solid ${
                  selectedTemplate.name === template.name 
                    ? theme.primary 
                    : theme.border
                }`,
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: '500', color: theme.text }}>
                {template.name}
              </div>
              <div style={{ fontSize: '11px', color: theme.textSecondary, marginTop: '4px' }}>
                {template.description}
              </div>
              <div style={{
                display: 'inline-block',
                padding: '2px 6px',
                backgroundColor: `${theme.primary}20`,
                borderRadius: '4px',
                fontSize: '10px',
                color: theme.primary,
                marginTop: '6px'
              }}>
                {template.category}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Editor/Preview Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Component Name Input */}
          <div style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${theme.border}`,
            backgroundColor: theme.surface
          }}>
            <input
              type="text"
              value={componentName}
              onChange={(e) => setComponentName(e.target.value)}
              placeholder="Component Name"
              style={{
                width: '300px',
                padding: '6px 12px',
                backgroundColor: theme.background,
                border: `1px solid ${theme.border}`,
                borderRadius: '4px',
                color: theme.text,
                fontSize: '13px'
              }}
            />
          </div>

          {/* Content Area */}
          <div style={{ flex: 1, padding: '16px', overflow: 'auto' }}>
            {isPreviewMode ? (
              <ComponentPreview code={componentCode} name={componentName} />
            ) : (
              <CodeEditor
                code={componentCode}
                onChange={setComponentCode}
                language="typescript"
              />
            )}
          </div>

          {/* Export Options */}
          <div style={{
            padding: '16px',
            borderTop: `1px solid ${theme.border}`,
            backgroundColor: theme.surface
          }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: theme.textSecondary }}>
                Export to:
              </span>
              {(['registry', 'file', 'both'] as const).map((format) => (
                <label
                  key={format}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: theme.text
                  }}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value={format}
                    checked={exportFormat === format}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                  />
                  {format.charAt(0).toUpperCase() + format.slice(1)}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Testing Panel */}
        <div style={{
          width: '300px',
          borderLeft: `1px solid ${theme.border}`,
          backgroundColor: theme.surface
        }}>
          <ComponentTester code={componentCode} name={componentName} />
        </div>
      </div>
    </div>
  )
}