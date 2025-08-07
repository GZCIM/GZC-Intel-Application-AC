import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-6 bg-red-50 border border-red-200 rounded-md">
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              Component Error
            </h2>
            <p className="text-red-600 mb-4">
              Something went wrong loading this component.
            </p>
            <details className="text-sm text-red-500">
              <summary>Error Details</summary>
              <pre className="mt-2 whitespace-pre-wrap">
                {this.state.error?.message}
              </pre>
            </details>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )
      )
    }

    return this.props.children
  }
}