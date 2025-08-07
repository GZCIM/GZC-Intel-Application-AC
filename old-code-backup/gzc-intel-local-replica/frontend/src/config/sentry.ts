import * as Sentry from '@sentry/react';

export function initSentry() {
  // Only initialize in production or if explicitly enabled
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      // Performance Monitoring
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in production, 100% in development
      
      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% of sessions will be recorded
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors will be recorded
      
      // Environment
      environment: import.meta.env.MODE,
      
      // Release tracking
      release: import.meta.env.VITE_APP_VERSION || 'unknown',
      
      // Filter local errors in development
      beforeSend(event, hint) {
        // Filter out local development errors if needed
        if (import.meta.env.DEV && event.exception) {
          const error = hint.originalException;
          // Skip React hydration errors in development
          if (error?.message?.includes('Hydration')) {
            return null;
          }
        }
        return event;
      },
    });
  }
}

// Error boundary component
export const SentryErrorBoundary = Sentry.ErrorBoundary;