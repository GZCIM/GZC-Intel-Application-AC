# ✅ Chrome DevTools Debugging - Setup Complete

## Quick Start Guide

### 1. Start the app with debugging enabled:
```bash
npm run dev:debug
```

### 2. Open Chrome DevTools:
- Go to `chrome://inspect` in Chrome
- Click "inspect" under Remote Target

### 3. Use these commands in the DevTools Console:

```javascript
// Check event listeners on selected element
getEventListeners($0)

// Check specific element
getEventListeners(document.querySelector('.widget-header'))

// Monitor events in real-time
monitorEvents(document.body, ['click', 'mousedown', 'dragstart'])

// Stop monitoring
unmonitorEvents(document.body)

// Find all elements with click handlers
$$('*').filter(el => getEventListeners(el).click)
```

## Helper Scripts Available

- `npm run debug:simple` - Basic connection guide
- `npm run debug:events` - Analyze event conflicts
- `npm run debug:performance` - Monitor performance metrics
- `npm run debug:live` - Interactive debugging session

---

Setup completed on: 2025-01-05