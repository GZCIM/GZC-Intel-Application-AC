// Utility functions for tab management and component operations
// Provides simple interfaces for adding tabs programmatically

// DynamicTabTemplate removed

// Global tab management utilities
export class TabManager {
  private static addTabFunction: ((tab: any) => void) | null = null

  // Set the add tab function (called by TabLayoutProvider)
  static setAddTabFunction(addTab: (tab: any) => void) {
    this.addTabFunction = addTab
  }

  // Add component by name (user-friendly interface)
  static addComponent(componentName: string, customOptions?: {
    tabName?: string
    icon?: string
    props?: Record<string, any>
  }): { success: boolean; message: string } {
    if (!this.addTabFunction) {
      return {
        success: false,
        message: 'Tab system not initialized. Please wait for the application to load.'
      }
    }

    // Dynamic component addition removed
    return {
      success: false,
      message: 'Dynamic component addition not implemented in professional architecture'
    }
  }

  // List all available components
  static listAvailableComponents(): string[] {
    return ['Portfolio'] // Only Portfolio available
  }

  // Search components by category
  static getComponentsByCategory(category: string): string[] {
    return category === 'portfolio' ? ['Portfolio'] : []
  }

  // Get component info
  static getComponentInfo(componentName: string) {
    const template = componentName.toLowerCase().includes('portfolio') ? 
      { 
        name: 'Portfolio', 
        category: 'portfolio',
        description: 'Portfolio management component',
        tags: ['finance', 'portfolio'],
        icon: 'briefcase'
      } : null
    
    if (!template) {
      return null
    }

    return {
      name: template.name,
      description: template.description,
      category: template.category,
      tags: template.tags,
      icon: template.icon
    }
  }
}

// Console helper functions for development
declare global {
  interface Window {
    addTab: (componentName: string, options?: any) => any
    listComponents: () => string[]
    componentInfo: (name: string) => any
    tabHelp: () => void
  }
}

// Development console helpers
export function setupConsoleHelpers() {
  if (typeof window !== 'undefined') {
    // Quick add function
    window.addTab = (componentName: string, options?: any) => {
      const result = TabManager.addComponent(componentName, options)
      console.log(result.success ? '✅' : '❌', result.message)
      return result
    }

    // List all components
    window.listComponents = () => {
      const components = TabManager.listAvailableComponents()
      console.log('📦 Available Components:')
      components.forEach((name, index) => {
        console.log(`  ${index + 1}. ${name}`)
      })
      return components
    }

    // Get component info
    window.componentInfo = (name: string) => {
      const info = TabManager.getComponentInfo(name)
      if (info) {
        console.log(`📋 ${info.name}`)
        console.log(`   ${info.description}`)
        console.log(`   Category: ${info.category}`)
        console.log(`   Tags: ${info.tags?.join(', ') || 'none'}`)
        console.log(`   Icon: ${info.icon}`)
      } else {
        console.log(`❌ Component not found: ${name}`)
      }
      return info
    }

    // Help function
    window.tabHelp = () => {
      console.log('🚀 Tab Management Console Commands:')
      console.log('  addTab("component name")           - Add a new tab')
      console.log('  addTab("name", {tabName: "..."})   - Add with custom name')
      console.log('  addTab("name", {icon: "🚀"})       - Add with custom icon')
      console.log('  listComponents()                   - Show all available components')
      console.log('  componentInfo("name")              - Get component details')
      console.log('  tabHelp()                          - Show this help')
      console.log('')
      console.log('Examples:')
      console.log('  addTab("Portfolio")')
      console.log('  addTab("FRED Dashboard", {tabName: "Economics", icon: "📊"})')
      console.log('  addTab("Knowledge Graph")')
    }

    console.log('🚀 Tab management console helpers loaded!')
    console.log('Type tabHelp() for available commands')
  }
}

// React hook for using tab management in components
import { useState, useEffect } from 'react'

export function useTabManager() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Check if tab manager is ready
    const checkReady = () => {
      setIsReady(TabManager['addTabFunction'] !== null)
    }
    
    checkReady()
    const interval = setInterval(checkReady, 100)
    
    return () => clearInterval(interval)
  }, [])

  return {
    isReady,
    addComponent: TabManager.addComponent,
    listComponents: TabManager.listAvailableComponents,
    getComponentsByCategory: TabManager.getComponentsByCategory,
    getComponentInfo: TabManager.getComponentInfo
  }
}

// Quick shorthand functions for common operations
export const quickTab = {
  // Add common components quickly
  portfolio: () => TabManager.addComponent('Portfolio'),
  trading: () => TabManager.addComponent('Trading Terminal'),
  dashboard: () => TabManager.addComponent('Main Dashboard'),
  fred: () => TabManager.addComponent('FRED Economic Data'),
  knowledge: () => TabManager.addComponent('Knowledge Graph Explorer'),
  housing: () => TabManager.addComponent('Housing Market Monitor'),
  yield: () => TabManager.addComponent('G10 Yield Curve Animator'),
  volatility: () => TabManager.addComponent('FX Volatility Surface'),
  components: () => TabManager.addComponent('Component Library'),
  docs: () => TabManager.addComponent('Documentation')
}

// Export for console access
if (typeof window !== 'undefined') {
  (window as any).quickTab = quickTab
}