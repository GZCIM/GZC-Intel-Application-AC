import React, { Component, ReactNode } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../theme/themes';

interface Props {
  children: ReactNode;
  componentName?: string;
  theme?: Theme;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorCount: number;
}

// Wrapper component to provide theme to the class component
export const EnhancedErrorBoundary: React.FC<Omit<Props, 'theme'>> = (props) => {
  const { currentTheme: theme } = useTheme();
  
  if (!theme) {
    // Fallback to basic error boundary without theme
    return <EnhancedErrorBoundaryClass {...props} />;
  }
  
  return <EnhancedErrorBoundaryClass {...props} theme={theme} />;
};

class EnhancedErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Component Error:', {
      component: this.props.componentName,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));
  }

  render() {
    const theme = this.props.theme;
    
    if (this.state.hasError && this.state.error) {
      // Use theme if available, otherwise use fallback colors
      const styles = {
        container: {
          padding: '20px',
          margin: '20px',
          background: theme?.surface || '#2A2A2A',
          border: `2px solid ${theme?.danger || '#D69A82'}`,
          borderRadius: '8px',
          color: theme?.text || '#f8f6f0'
        },
        heading: {
          color: theme?.danger || '#D69A82',
          marginBottom: '10px'
        },
        errorBox: {
          background: theme?.background || '#1A1A1A',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '10px',
          fontSize: '14px'
        },
        summary: {
          cursor: 'pointer',
          color: theme?.primary || '#95BD78'
        },
        pre: {
          background: theme?.background || '#1A1A1A',
          padding: '10px',
          borderRadius: '4px',
          fontSize: '11px',
          overflow: 'auto',
          maxHeight: '200px'
        },
        count: {
          fontSize: '12px',
          color: theme?.textSecondary || '#c8c0b0CC'
        },
        button: {
          marginTop: '10px',
          padding: '8px 16px',
          background: theme?.primary || '#95BD78',
          color: theme?.text || '#f8f6f0',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }
      };
      
      return (
        <div style={styles.container}>
          <h2 style={styles.heading}>
            🚨 Component Error{this.props.componentName ? `: ${this.props.componentName}` : ''}
          </h2>
          
          <div style={styles.errorBox}>
            <strong>Error:</strong> {this.state.error.message}
          </div>
          
          <details style={{ marginBottom: '10px' }}>
            <summary style={styles.summary}>
              Stack Trace
            </summary>
            <pre style={styles.pre}>
              {this.state.error.stack}
            </pre>
          </details>
          
          {this.state.errorInfo && (
            <details style={{ marginBottom: '10px' }}>
              <summary style={styles.summary}>
                Component Stack
              </summary>
              <pre style={styles.pre}>
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          
          <div style={styles.count}>
            Error count: {this.state.errorCount}
          </div>
          
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.reload();
            }}
            style={styles.button}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}