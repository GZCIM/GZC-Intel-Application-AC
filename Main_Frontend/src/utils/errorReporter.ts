// Error reporting utility that captures browser errors and sends them to backend
export class ErrorReporter {
  private static instance: ErrorReporter
  private errors: any[] = []
  private reportEndpoint = '/api/errors'
  
  private constructor() {
    this.setupErrorHandlers()
    this.setupConsoleInterception()
  }
  
  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter()
    }
    return ErrorReporter.instance
  }
  
  private setupErrorHandlers() {
    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.logError({
        type: 'error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString()
      })
    })
    
    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        type: 'unhandledRejection',
        reason: event.reason,
        stack: event.reason?.stack,
        timestamp: new Date().toISOString()
      })
    })
  }
  
  private setupConsoleInterception() {
    const originalError = console.error
    const originalWarn = console.warn
    
    console.error = (...args: any[]) => {
      this.logError({
        type: 'console.error',
        message: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '),
        timestamp: new Date().toISOString()
      })
      originalError.apply(console, args)
    }
    
    console.warn = (...args: any[]) => {
      this.logError({
        type: 'console.warn',
        message: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '),
        timestamp: new Date().toISOString()
      })
      originalWarn.apply(console, args)
    }
  }
  
  private logError(error: any) {
    this.errors.push(error)
    
    // Keep only last 100 errors in memory
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100)
    }
    
    // Store in localStorage for persistence
    localStorage.setItem('errorLog', JSON.stringify(this.errors))
    
    // Send to backend (debounced)
    this.sendToBackend(error)
  }
  
  private sendToBackend(error: any) {
    // Only send critical errors immediately
    if (error.type === 'error' || error.type === 'unhandledRejection') {
      fetch(this.reportEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {
        // Silently fail if backend is unavailable
      })
    }
  }
  
  getErrors(): any[] {
    return this.errors
  }
  
  clearErrors() {
    this.errors = []
    localStorage.removeItem('errorLog')
  }
  
  downloadErrorLog() {
    const blob = new Blob([JSON.stringify(this.errors, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `error-log-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  ErrorReporter.getInstance()
}