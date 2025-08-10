/**
 * Log File Writer Service
 * Persists debug panel logs to filesystem for analysis
 */

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug' | 'critical'
  message: string
  data?: any
  source?: string
}

class LogFileWriter {
  private static instance: LogFileWriter
  private logBuffer: LogEntry[] = []
  private flushInterval: number = 5000 // Flush every 5 seconds
  private maxBufferSize: number = 100
  private intervalId: NodeJS.Timeout | null = null
  private sessionId: string
  
  private constructor() {
    this.sessionId = `session-${Date.now()}`
    this.startAutoFlush()
    
    // Listen for page unload to flush logs
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush()
      })
    }
  }
  
  static getInstance(): LogFileWriter {
    if (!LogFileWriter.instance) {
      LogFileWriter.instance = new LogFileWriter()
    }
    return LogFileWriter.instance
  }
  
  addLog(entry: LogEntry) {
    this.logBuffer.push(entry)
    
    // Auto-flush if buffer is full
    if (this.logBuffer.length >= this.maxBufferSize) {
      this.flush()
    }
  }
  
  private startAutoFlush() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
    
    this.intervalId = setInterval(() => {
      if (this.logBuffer.length > 0) {
        this.flush()
      }
    }, this.flushInterval)
  }
  
  private flush() {
    if (this.logBuffer.length === 0) return
    
    const logs = [...this.logBuffer]
    this.logBuffer = []
    
    // Send to backend API endpoint
    this.sendToBackend(logs)
    
    // Also save to localStorage as backup
    this.saveToLocalStorage(logs)
  }
  
  private async sendToBackend(logs: LogEntry[]) {
    // DISABLED: Backend endpoint not available in production
    // Skip API call to prevent 404 errors flooding console
    console.debug('Debug logging disabled for production deployment')
    
    // Save to localStorage as backup
    this.saveToLocalStorage(logs)
  }
  
  private saveToLocalStorage(logs: LogEntry[]) {
    try {
      const key = `debug-logs-${this.sessionId}`
      const existingLogs = localStorage.getItem(key)
      const allLogs = existingLogs ? JSON.parse(existingLogs) : []
      allLogs.push(...logs)
      
      // Keep only last 1000 logs in localStorage
      const trimmedLogs = allLogs.slice(-1000)
      localStorage.setItem(key, JSON.stringify(trimmedLogs))
      
      // Also create a downloadable version
      this.createDownloadableLog(trimmedLogs)
    } catch (error) {
      console.error('Failed to save logs to localStorage:', error)
    }
  }
  
  private createDownloadableLog(logs: LogEntry[]) {
    try {
      const logText = logs.map(log => {
        const time = new Date(log.timestamp).toLocaleTimeString()
        const level = log.level.toUpperCase().padEnd(8)
        const message = log.message
        const data = log.data ? `\n  Data: ${JSON.stringify(log.data, null, 2)}` : ''
        return `[${time}] ${level} ${message}${data}`
      }).join('\n')
      
      // Store as data URL for export button
      const dataUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(logText)}`
      sessionStorage.setItem('debug-logs-export', dataUrl)
    } catch (error) {
      console.error('Failed to create downloadable log:', error)
    }
  }
  
  exportLogs(): string {
    // Get all logs from current session
    const key = `debug-logs-${this.sessionId}`
    const logs = localStorage.getItem(key)
    
    if (!logs) {
      return JSON.stringify({ sessionId: this.sessionId, logs: [] }, null, 2)
    }
    
    return JSON.stringify({ 
      sessionId: this.sessionId,
      exportTime: new Date().toISOString(),
      logs: JSON.parse(logs) 
    }, null, 2)
  }
  
  downloadLogs() {
    const content = this.exportLogs()
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debug-logs-${this.sessionId}-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  clearLogs() {
    this.logBuffer = []
    const key = `debug-logs-${this.sessionId}`
    localStorage.removeItem(key)
    sessionStorage.removeItem('debug-logs-export')
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.flush()
  }
}

export const logFileWriter = LogFileWriter.getInstance()