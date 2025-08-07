// Error monitoring utilities for development
export class ErrorMonitor {
  private static errors: Array<{
    timestamp: Date
    type: string
    message: string
    stack?: string
    component?: string
  }> = []

  static init() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.logError({
        type: 'global-error',
        message: event.message,
        stack: event.error?.stack,
        component: event.filename
      })
    })

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        type: 'unhandled-rejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack
      })
    })

    // React error boundary hook
    if (typeof window !== 'undefined' && window.React) {
      const originalError = console.error
      console.error = (...args) => {
        if (args[0]?.includes?.('React')) {
          this.logError({
            type: 'react-error',
            message: args.join(' ')
          })
        }
        originalError.apply(console, args)
      }
    }
  }

  static logError(error: {
    type: string
    message: string
    stack?: string
    component?: string
  }) {
    const errorEntry = {
      timestamp: new Date(),
      ...error
    }
    
    this.errors.push(errorEntry)
    
    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100)
    }

    // Log to console with formatting
    console.group(`🚨 ${error.type}`)
    console.error('Message:', error.message)
    if (error.component) console.error('Component:', error.component)
    if (error.stack) console.error('Stack:', error.stack)
    console.groupEnd()

    // Save to localStorage for persistence
    try {
      localStorage.setItem('error-monitor-log', JSON.stringify(this.errors))
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  static getErrors() {
    return this.errors
  }

  static clearErrors() {
    this.errors = []
    localStorage.removeItem('error-monitor-log')
  }

  static getErrorSummary() {
    const summary: Record<string, number> = {}
    this.errors.forEach(error => {
      summary[error.type] = (summary[error.type] || 0) + 1
    })
    return summary
  }
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  ErrorMonitor.init()
}