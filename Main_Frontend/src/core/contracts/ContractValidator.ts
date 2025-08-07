import { ComponentContract, ComponentRegistryEntry } from './ComponentContract'

/**
 * PROFESSIONAL CONTRACT VALIDATOR
 * 
 * Ensures all components meet professional standards
 * Prevents deployment of non-compliant components
 */

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  score: number // 0-100 compliance score
}

export class ContractValidator {
  
  /**
   * Validate complete component contract
   */
  static validateContract(contract: ComponentContract): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    let score = 100
    
    // Validate metadata
    const metadataResult = this.validateMetadata(contract.metadata)
    errors.push(...metadataResult.errors)
    warnings.push(...metadataResult.warnings)
    score -= metadataResult.penaltyPoints
    
    // Validate capabilities
    const capabilitiesResult = this.validateCapabilities(contract.capabilities)
    errors.push(...capabilitiesResult.errors)
    warnings.push(...capabilitiesResult.warnings)
    score -= capabilitiesResult.penaltyPoints
    
    // Validate lifecycle
    const lifecycleResult = this.validateLifecycle(contract.lifecycle)
    errors.push(...lifecycleResult.errors)
    warnings.push(...lifecycleResult.warnings)
    score -= lifecycleResult.penaltyPoints
    
    // Validate data contract
    const dataResult = this.validateDataContract(contract.dataContract)
    errors.push(...dataResult.errors)
    warnings.push(...dataResult.warnings)
    score -= dataResult.penaltyPoints
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score)
    }
  }
  
  /**
   * Validate component metadata
   */
  private static validateMetadata(metadata: any): { errors: string[]; warnings: string[]; penaltyPoints: number } {
    const errors: string[] = []
    const warnings: string[] = []
    let penaltyPoints = 0
    
    // Required fields
    if (!metadata.id) {
      errors.push('Component ID is required')
      penaltyPoints += 20
    }
    
    if (!metadata.name) {
      errors.push('Component name is required')
      penaltyPoints += 20
    }
    
    if (!metadata.displayName) {
      errors.push('Component display name is required')
      penaltyPoints += 10
    }
    
    if (!metadata.version) {
      errors.push('Component version is required')
      penaltyPoints += 15
    }
    
    if (!metadata.category) {
      errors.push('Component category is required')
      penaltyPoints += 15
    }
    
    if (!metadata.description) {
      warnings.push('Component description is missing')
      penaltyPoints += 5
    }
    
    // Version format validation
    if (metadata.version && !/^\d+\.\d+\.\d+$/.test(metadata.version)) {
      warnings.push('Version should follow semantic versioning (x.y.z)')
      penaltyPoints += 5
    }
    
    // Category validation
    const validCategories = ['trading', 'analytics', 'portfolio', 'market-data', 'admin', 'docs']
    if (metadata.category && !validCategories.includes(metadata.category)) {
      errors.push(`Invalid category. Must be one of: ${validCategories.join(', ')}`)
      penaltyPoints += 10
    }
    
    return { errors, warnings, penaltyPoints }
  }
  
  /**
   * Validate component capabilities
   */
  private static validateCapabilities(capabilities: any): { errors: string[]; warnings: string[]; penaltyPoints: number } {
    const errors: string[] = []
    const warnings: string[] = []
    let penaltyPoints = 0
    
    if (!capabilities) {
      errors.push('Component capabilities are required')
      return { errors, warnings, penaltyPoints: 50 }
    }
    
    // Sizing validation
    if (!capabilities.sizing) {
      errors.push('Sizing capabilities are required')
      penaltyPoints += 20
    } else {
      if (typeof capabilities.sizing.resizable !== 'boolean') {
        errors.push('Sizing.resizable must be boolean')
        penaltyPoints += 10
      }
      
      if (typeof capabilities.sizing.responsive !== 'boolean') {
        warnings.push('Sizing.responsive should be defined')
        penaltyPoints += 5
      }
    }
    
    // Modes validation
    if (!capabilities.modes) {
      errors.push('Interaction modes are required')
      penaltyPoints += 20
    } else {
      const modeKeys = ['standalone', 'widget', 'embedded', 'modal']
      const hasAnyMode = modeKeys.some(key => capabilities.modes[key] === true)
      
      if (!hasAnyMode) {
        errors.push('Component must support at least one interaction mode')
        penaltyPoints += 15
      }
    }
    
    // Performance validation
    if (!capabilities.performance) {
      warnings.push('Performance characteristics should be defined')
      penaltyPoints += 10
    } else {
      const validComplexity = ['low', 'medium', 'high']
      if (!validComplexity.includes(capabilities.performance.renderComplexity)) {
        warnings.push('Invalid render complexity level')
        penaltyPoints += 5
      }
      
      const validMemory = ['light', 'moderate', 'heavy']
      if (!validMemory.includes(capabilities.performance.memoryUsage)) {
        warnings.push('Invalid memory usage level')
        penaltyPoints += 5
      }
    }
    
    return { errors, warnings, penaltyPoints }
  }
  
  /**
   * Validate component lifecycle
   */
  private static validateLifecycle(lifecycle: any): { errors: string[]; warnings: string[]; penaltyPoints: number } {
    const errors: string[] = []
    const warnings: string[] = []
    let penaltyPoints = 0
    
    if (!lifecycle) {
      errors.push('Component lifecycle is required')
      return { errors, warnings, penaltyPoints: 30 }
    }
    
    // Required lifecycle methods
    const requiredMethods = ['initialize', 'onMount', 'onResize', 'onUnmount']
    
    for (const method of requiredMethods) {
      if (typeof lifecycle[method] !== 'function') {
        errors.push(`Lifecycle method '${method}' is required`)
        penaltyPoints += 10
      }
    }
    
    // Optional but recommended methods
    const recommendedMethods = ['onError', 'onDataUpdate']
    
    for (const method of recommendedMethods) {
      if (typeof lifecycle[method] !== 'function') {
        warnings.push(`Lifecycle method '${method}' is recommended`)
        penaltyPoints += 2
      }
    }
    
    return { errors, warnings, penaltyPoints }
  }
  
  /**
   * Validate data contract
   */
  private static validateDataContract(dataContract: any): { errors: string[]; warnings: string[]; penaltyPoints: number } {
    const errors: string[] = []
    const warnings: string[] = []
    let penaltyPoints = 0
    
    if (!dataContract) {
      errors.push('Data contract is required')
      return { errors, warnings, penaltyPoints: 25 }
    }
    
    // Validate inputs
    if (!Array.isArray(dataContract.inputs)) {
      errors.push('Data contract inputs must be an array')
      penaltyPoints += 15
    } else {
      dataContract.inputs.forEach((input: any, index: number) => {
        if (!input.id) {
          errors.push(`Input ${index}: ID is required`)
          penaltyPoints += 5
        }
        
        if (!input.type) {
          errors.push(`Input ${index}: Type is required`)
          penaltyPoints += 5
        }
        
        if (typeof input.required !== 'boolean') {
          warnings.push(`Input ${index}: Required flag should be boolean`)
          penaltyPoints += 2
        }
      })
    }
    
    // Validate outputs
    if (!Array.isArray(dataContract.outputs)) {
      errors.push('Data contract outputs must be an array')
      penaltyPoints += 15
    }
    
    return { errors, warnings, penaltyPoints }
  }
  
  /**
   * Validate complete registry entry
   */
  static validateRegistryEntry(entry: ComponentRegistryEntry): ValidationResult {
    const contractResult = this.validateContract(entry.contract)
    
    // Additional registry-specific validations
    const errors = [...contractResult.errors]
    const warnings = [...contractResult.warnings]
    let score = contractResult.score
    
    if (!entry.component) {
      errors.push('Component implementation is required')
      score -= 20
    }
    
    if (!entry.loader) {
      errors.push('Component loader is required')
      score -= 15
    }
    
    if (!entry.status) {
      warnings.push('Component status should be defined')
      score -= 5
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score)
    }
  }
  
  /**
   * Generate compliance report
   */
  static generateComplianceReport(contract: ComponentContract): string {
    const result = this.validateContract(contract)
    
    let report = `Component Compliance Report\n`
    report += `Component: ${contract.metadata.name} v${contract.metadata.version}\n`
    report += `Score: ${result.score}/100\n\n`
    
    if (result.errors.length > 0) {
      report += `ERRORS (${result.errors.length}):\n`
      result.errors.forEach((error, index) => {
        report += `  ${index + 1}. ${error}\n`
      })
      report += '\n'
    }
    
    if (result.warnings.length > 0) {
      report += `WARNINGS (${result.warnings.length}):\n`
      result.warnings.forEach((warning, index) => {
        report += `  ${index + 1}. ${warning}\n`
      })
      report += '\n'
    }
    
    if (result.valid) {
      report += '✅ Component meets professional standards\n'
    } else {
      report += '❌ Component does not meet professional standards\n'
    }
    
    return report
  }
}