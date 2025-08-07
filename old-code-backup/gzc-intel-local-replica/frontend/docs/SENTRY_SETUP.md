# Sentry Error Tracking Setup ✅

## Installation Complete

Sentry has been integrated into the GZC Intel App with the following features:

### Features Configured:
- ✅ Error Boundary for React errors
- ✅ Performance monitoring
- ✅ Session replay on errors
- ✅ Release tracking
- ✅ Environment detection
- ✅ Source maps support

## Configuration

### 1. Get Your Sentry DSN
1. Go to https://sentry.io/ and create an account
2. Create a new project (select React)
3. Copy your DSN from the project settings

### 2. Configure Environment
Create a `.env` file in the project root:
```env
VITE_SENTRY_DSN=your_dsn_here
VITE_APP_VERSION=1.0.0
```

### 3. Restart Dev Server
```bash
npm run dev
```

## Usage

### Automatic Error Tracking
All unhandled errors are automatically sent to Sentry:
- React component errors
- Async errors
- Promise rejections

### Manual Error Tracking
```javascript
import * as Sentry from '@sentry/react';

// Capture an exception
try {
  somethingRisky();
} catch (error) {
  Sentry.captureException(error);
}

// Capture a message
Sentry.captureMessage('Something happened', 'warning');

// Add context
Sentry.setContext('widget', {
  id: 'widget-1',
  type: 'market-data'
});

// Set user
Sentry.setUser({
  id: '123',
  email: 'user@example.com'
});
```

## Testing

A test component is available at `src/components/SentryTest.tsx`. To test:

1. Add the component to any page
2. Click the test buttons to verify Sentry is working
3. Check your Sentry dashboard for the events

## Performance Monitoring

Sentry automatically tracks:
- Page load time
- Route changes
- API calls (when using fetch/XHR)
- Component render time

## Best Practices

1. **Don't log sensitive data**: Sentry masks passwords by default
2. **Use contexts**: Add relevant context to errors
3. **Set user info**: Helps track user-specific issues
4. **Use breadcrumbs**: Automatic trail of user actions
5. **Configure sample rates**: Balance data vs cost

## Development vs Production

- **Development**: 100% of transactions tracked
- **Production**: 10% of transactions tracked (configurable)
- **Error replay**: 100% on errors, 10% otherwise

## Dashboard Features

In Sentry dashboard you can:
- View error trends
- See user sessions with errors
- Watch session replays
- Track performance metrics
- Set up alerts
- Create custom dashboards