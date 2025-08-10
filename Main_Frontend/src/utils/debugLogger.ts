import * as Sentry from '@sentry/react';
import { logFileWriter } from './logFileWriter';

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  category: string;
  message: string;
  data?: any;
  error?: Error;
  stack?: string;
}

class DebugLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private listeners: Set<(log: LogEntry) => void> = new Set();
  private isProduction = import.meta.env.PROD;

  constructor() {
    this.setupGlobalErrorHandlers();
    this.setupConsoleInterceptors();
    this.setupReactErrorHandling();
  }

  private setupGlobalErrorHandlers() {
    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.critical('Unhandled Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      }, event.error);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.critical('Unhandled Promise Rejection', {
        reason: event.reason,
        promise: event.promise
      }, event.reason);
    });
  }

  private setupConsoleInterceptors() {
    // Intercept console methods to capture all logs
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };

    console.log = (...args) => {
      this.info('Console Log', { args });
      originalConsole.log(...args);
    };

    console.warn = (...args) => {
      this.warn('Console Warning', { args });
      originalConsole.warn(...args);
    };

    console.error = (...args) => {
      this.error('Console Error', { args });
      originalConsole.error(...args);
    };

    console.debug = (...args) => {
      this.debug('Console Debug', { args });
      originalConsole.debug(...args);
    };
  }

  private setupReactErrorHandling() {
    // React 19 specific error handling
    if (typeof window !== 'undefined' && window.React) {
      const originalError = console.error;
      console.error = (...args) => {
        // Capture React component errors
        if (args[0]?.includes?.('React') || args[0]?.includes?.('Component')) {
          this.error('React Error', {
            args,
            stack: new Error().stack
          });
        }
        originalError(...args);
      };
    }
  }

  private createLogEntry(
    level: LogEntry['level'],
    category: string,
    message: string,
    data?: any,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      error,
      stack: error?.stack || new Error().stack
    };

    // Store log
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Send to file writer for persistence
    logFileWriter.addLog({
      timestamp: entry.timestamp,
      level: entry.level,
      message: `[${entry.category}] ${entry.message}`,
      data: entry.data,
      source: entry.category
    });

    // Notify listeners
    this.listeners.forEach(listener => listener(entry));

    // Send to Sentry based on level
    if (level === 'error' || level === 'critical') {
      Sentry.captureException(error || new Error(message), {
        level: level === 'critical' ? 'fatal' : 'error',
        tags: { category },
        extra: data
      });
    } else if (level === 'warn') {
      Sentry.captureMessage(message, 'warning');
    }

    return entry;
  }

  debug(message: string, data?: any) {
    return this.createLogEntry('debug', 'Debug', message, data);
  }

  info(message: string, data?: any) {
    return this.createLogEntry('info', 'Info', message, data);
  }

  warn(message: string, data?: any) {
    return this.createLogEntry('warn', 'Warning', message, data);
  }

  error(message: string, data?: any, error?: Error) {
    return this.createLogEntry('error', 'Error', message, data, error);
  }

  critical(message: string, data?: any, error?: Error) {
    return this.createLogEntry('critical', 'Critical', message, data, error);
  }

  // Component specific logging
  componentLoad(componentName: string, success: boolean, error?: Error, metadata?: any) {
    const level = success ? 'info' : 'error';
    const message = success 
      ? `Component loaded: ${componentName}`
      : `Component failed to load: ${componentName}`;
    
    const logData = {
      componentName,
      success,
      metadata,
      ...(!success && { 
        errorMessage: error?.message,
        errorStack: error?.stack
      })
    };

    this.createLogEntry(level, 'ComponentLoader', message, logData, error);
    
    // Add breadcrumb for Sentry
    Sentry.addBreadcrumb({
      category: 'component',
      message,
      level: success ? 'info' : 'error',
      data: logData
    });
  }

  // Network logging
  networkRequest(url: string, method: string, status?: number, error?: Error) {
    const success = status && status >= 200 && status < 300;
    const level = error ? 'error' : success ? 'info' : 'warn';
    
    const logData = {
      url,
      method,
      status,
      success,
      error: error?.message
    };

    this.createLogEntry(level, 'Network', `${method} ${url} - ${status || 'Failed'}`, logData, error);
  }

  // Get all logs
  getLogs(filter?: { level?: LogEntry['level'], category?: string }): LogEntry[] {
    if (!filter) return [...this.logs];
    
    return this.logs.filter(log => {
      if (filter.level && log.level !== filter.level) return false;
      if (filter.category && !log.category.includes(filter.category)) return false;
      return true;
    });
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }

  // Subscribe to log updates
  subscribe(listener: (log: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Export logs as JSON
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Download logs as file
  downloadLogs() {
    const blob = new Blob([this.exportLogs()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Singleton instance
export const debugLogger = new DebugLogger();

// Export for easy access
export const logComponentLoad = debugLogger.componentLoad.bind(debugLogger);
export const logNetworkRequest = debugLogger.networkRequest.bind(debugLogger);
export const logError = debugLogger.error.bind(debugLogger);
export const logCritical = debugLogger.critical.bind(debugLogger);