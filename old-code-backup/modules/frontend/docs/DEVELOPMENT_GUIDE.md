# GZC Intel App - Development Guide

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development with debugging
npm run dev:debug

# Run tests
npm test
```

## 🛠️ Development Tools Overview

### Active Monitoring Tools

1. **Event Conflict Monitor** 🎯
   - Automatically active in development
   - Detects click/drag conflicts in real-time
   - Visual indicators for conflicts
   ```javascript
   // Browser console commands
   eventMonitor.getReport()  // See all conflicts
   eventMonitor.clear()      // Clear history
   ```

2. **Chrome DevTools Integration** 🔍
   - Port 9222 for remote debugging
   - AI-powered insights (Gemini)
   - Performance profiling
   ```bash
   npm run dev:debug  # Opens with debugging enabled
   ```

3. **Vitest Testing** ✅
   - Fast unit testing
   - Interactive UI mode
   - Coverage reporting
   ```bash
   npm test              # Watch mode
   npm run test:ui       # Browser UI
   npm run test:coverage # Coverage report
   ```

4. **Bundle Analyzer** 📊
   - Visualize bundle composition
   - Identify large dependencies
   - Optimization opportunities
   ```bash
   npm run build:analyze
   ```

## 🏗️ Project Structure

```
gzc-intel/
├── src/
│   ├── components/       # React components
│   │   ├── GridWidget/   # Base widget component
│   │   ├── Dashboard/    # Main dashboard layout
│   │   └── [Component]/[Component].test.tsx
│   ├── utils/
│   │   ├── eventMonitor.ts    # Conflict detection
│   │   └── eventMonitor.test.ts
│   ├── pages/           # Route pages
│   ├── styles/          # Global styles
│   └── test/
│       └── setup.ts     # Test configuration
├── scripts/
│   └── debug/           # Debugging utilities
├── docs/                # Documentation
└── vite.config.ts       # Build configuration
```

## 🐛 Debugging Workflow

### 1. Event Conflict Detection

**Problem**: Click events triggering drag behavior
```javascript
// In browser console
eventMonitor.getReport()
// Output: [{element: "div.widget-header", severity: "high", conflicts: [...]}]
```

**Solution**: Add event handling
```typescript
const handleClick = (e: React.MouseEvent) => {
  e.stopPropagation(); // Prevent bubble to drag handler
  // Your click logic
};
```

### 2. Chrome DevTools Workflow

1. Start dev server with debugging:
   ```bash
   npm run dev:debug
   ```

2. Open Chrome DevTools (F12)

3. Use built-in commands:
   ```javascript
   // Monitor all events on element
   monitorEvents($0)  // $0 = selected element
   
   // Check event listeners
   getEventListeners($0)
   
   // Stop monitoring
   unmonitorEvents($0)
   ```

4. Enable AI insights:
   - Settings → Experiments → Console insights
   - Click lightbulb icon for AI explanations

### 3. Performance Debugging

```javascript
// Mark performance points
performance.mark('widget-render-start');
// ... render widget
performance.mark('widget-render-end');
performance.measure('widget-render', 'widget-render-start', 'widget-render-end');

// Get measurements
performance.getEntriesByType('measure');
```

## 🧪 Testing Best Practices

### Component Testing
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GridWidget } from './GridWidget'

describe('GridWidget', () => {
  it('should not conflict with drag when clicking', () => {
    // Start event monitoring
    eventMonitor.start()
    
    render(<GridWidget id="test" title="Test" />)
    
    const header = screen.getByRole('heading')
    fireEvent.click(header)
    
    // Check no high-severity conflicts
    const conflicts = eventMonitor.getReport()
    const highSeverity = conflicts.filter(c => c.severity === 'high')
    expect(highSeverity).toHaveLength(0)
  })
})
```

### Integration Testing
```typescript
it('should handle drag without affecting child interactions', async () => {
  const { container } = render(<Dashboard />)
  
  // Simulate drag
  const gridItem = container.querySelector('.react-grid-item')
  fireEvent.mouseDown(gridItem)
  fireEvent.mouseMove(gridItem, { clientX: 100, clientY: 100 })
  fireEvent.mouseUp(gridItem)
  
  // Child buttons should still work
  const button = within(gridItem).getByRole('button')
  fireEvent.click(button)
  
  // Verify no conflicts
  expect(eventMonitor.getReport()).toHaveLength(0)
})
```

## 📈 Performance Guidelines

### Bundle Size Management
```bash
# Check bundle size impact before adding dependencies
npm run build:analyze
```

Target budgets:
- Main bundle: < 500KB
- Vendor chunks: < 200KB each
- Initial load: < 3 seconds

### React Optimization
```typescript
// Memoize expensive components
export const ExpensiveWidget = React.memo(({ data }) => {
  // Component logic
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.data.id === nextProps.data.id
})

// Use callback for event handlers
const handleClick = useCallback((id: string) => {
  // Handle click
}, [dependencies])
```

## 🔧 Common Issues & Solutions

### Issue: Widget not dragging
**Debug Steps:**
1. Check console: `eventMonitor.getReport()`
2. Verify drag handle: `getEventListeners($('.drag-handle'))`
3. Check CSS: `pointer-events` should not be `none`

### Issue: Tests failing with "not wrapped in act"
**Solution:**
```typescript
import { act } from '@testing-library/react'

it('should update after async action', async () => {
  render(<Component />)
  
  await act(async () => {
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByText('Updated')).toBeInTheDocument()
    })
  })
})
```

### Issue: Event conflicts in production
**Prevention:**
1. Always check `eventMonitor` during development
2. Write tests for interactions
3. Use proper event handling patterns

## 🚦 Pre-commit Checklist

- [ ] Run linter: `npm run lint`
- [ ] Run tests: `npm test -- --run`
- [ ] Check bundle size: `npm run build`
- [ ] Verify no event conflicts: `eventMonitor.getReport()`
- [ ] Test drag-and-drop functionality manually
- [ ] Update tests for new features

## 📚 Additional Resources

- [Chrome DevTools AI Guide](./CHROME_DEVTOOLS_AI.md)
- [Vitest Testing Guide](./VITEST_TESTING.md)
- [Bundle Analyzer Guide](./BUNDLE_ANALYZER.md)
- [Event Monitor API](../src/utils/eventMonitor.ts)

## 🎯 Development Philosophy

1. **Proactive Debugging**: Use Event Monitor continuously
2. **Test-Driven**: Write tests for interactions
3. **Performance-First**: Monitor bundle size and render time
4. **Professional Tools**: Leverage all available debugging capabilities

Remember: The Event Monitor is your friend - check it often!