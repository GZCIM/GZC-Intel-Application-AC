import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { debugLogger } from '../../utils/debugLogger';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode;
  componentName?: string;
  showError?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class ComponentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { componentName = 'Unknown' } = this.props;
    
    // Log to our debug logger
    debugLogger.critical(`Component Error in ${componentName}`, {
      componentName,
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId
    }, error);

    // Send to Sentry with additional context
    Sentry.withScope((scope) => {
      scope.setTag('component', componentName);
      scope.setContext('componentError', {
        componentName,
        errorBoundary: true,
        errorId: this.state.errorId,
        componentStack: errorInfo.componentStack
      });
      scope.setLevel('error');
      Sentry.captureException(error);
    });

    // Update state with error info
    this.setState({ errorInfo });

    // Log component stack for debugging
    console.error(`
🔴 Component Error Boundary Triggered
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Component: ${componentName}
Error ID: ${this.state.errorId}
Message: ${error.message}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Component Stack:
${errorInfo.componentStack}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error Stack:
${error.stack}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  }

  handleReset = () => {
    debugLogger.info('Error boundary reset', {
      componentName: this.props.componentName,
      errorId: this.state.errorId
    });
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  render() {
    const { hasError, error, errorInfo, errorId } = this.state;
    const { children, fallback, componentName, showError = true } = this.props;

    if (hasError && error && errorInfo) {
      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback(error, errorInfo)}</>;
      }

      // Default error display
      if (!showError) {
        return (
          <div style={{
            padding: '20px',
            background: '#ff000010',
            border: '2px solid #ff0000',
            borderRadius: '8px',
            margin: '10px'
          }}>
            <h3 style={{ color: '#ff0000', margin: '0 0 10px 0' }}>
              Component Failed to Load
            </h3>
            <p style={{ margin: '0 0 10px 0' }}>
              Component: {componentName || 'Unknown'}
            </p>
            <button
              onClick={this.handleReset}
              style={{
                padding: '5px 10px',
                background: '#ff0000',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        );
      }

      // Detailed error display for debugging
      return (
        <div style={{
          padding: '20px',
          background: '#1a1a1a',
          border: '2px solid #ff0000',
          borderRadius: '8px',
          margin: '10px',
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#ffffff'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ color: '#ff0000', margin: '0 0 10px 0' }}>
              🔴 Component Error Detected
            </h2>
            <div style={{ background: '#2a2a2a', padding: '10px', borderRadius: '4px' }}>
              <div><strong>Component:</strong> {componentName || 'Unknown'}</div>
              <div><strong>Error ID:</strong> {errorId}</div>
              <div><strong>Time:</strong> {new Date().toLocaleString()}</div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#ff9900', margin: '0 0 10px 0' }}>Error Message</h3>
            <pre style={{
              background: '#2a2a2a',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '100px'
            }}>
              {error.message}
            </pre>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#ff9900', margin: '0 0 10px 0' }}>Component Stack</h3>
            <pre style={{
              background: '#2a2a2a',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '200px',
              fontSize: '10px'
            }}>
              {errorInfo.componentStack}
            </pre>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#ff9900', margin: '0 0 10px 0' }}>Error Stack</h3>
            <pre style={{
              background: '#2a2a2a',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '200px',
              fontSize: '10px'
            }}>
              {error.stack}
            </pre>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '8px 16px',
                background: '#ff0000',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🔄 Retry Component
            </button>
            <button
              onClick={() => debugLogger.downloadLogs()}
              style={{
                padding: '8px 16px',
                background: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              📥 Download Debug Logs
            </button>
            <button
              onClick={() => {
                const logs = debugLogger.getLogs({ level: 'error' });
                console.table(logs);
              }}
              style={{
                padding: '8px 16px',
                background: '#666666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              📋 Show Errors in Console
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> {
  return (props: P) => (
    <ComponentErrorBoundary componentName={componentName || Component.displayName || Component.name}>
      <Component {...props} />
    </ComponentErrorBoundary>
  );
}