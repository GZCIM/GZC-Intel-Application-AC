# Vitest Testing Framework ✅

## Overview

Vitest is a blazing fast unit test framework powered by Vite. It's designed specifically for Vite projects and provides:
- Lightning fast test execution
- Native ESM support
- TypeScript support out of the box
- Compatible with Jest API
- Built-in coverage reporting

## Running Tests

```bash
# Run all tests
npm test

# Run with UI (interactive browser interface)
npm run test:ui

# Run with coverage report
npm run test:coverage

# Watch mode (default)
npm test

# Run once
npm test -- --run
```

## Writing Tests

### Basic Component Test
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
```

### Testing with Event Monitor
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { eventMonitor } from '@/utils/eventMonitor'

describe('Widget Event Conflicts', () => {
  beforeEach(() => {
    eventMonitor.clear()
    eventMonitor.start()
  })

  it('should not have conflicts between drag and click', () => {
    render(<DraggableWidget />)
    
    const widget = screen.getByTestId('widget')
    fireEvent.click(widget)
    fireEvent.dragStart(widget)
    
    const conflicts = eventMonitor.getReport()
    expect(conflicts).toHaveLength(0)
  })
})
```

### Mocking
```typescript
import { vi } from 'vitest'

// Mock a module
vi.mock('@/services/api', () => ({
  fetchData: vi.fn(() => Promise.resolve({ data: 'test' }))
}))

// Mock a function
const mockFn = vi.fn()
mockFn.mockReturnValue('mocked value')

// Spy on existing function
const spy = vi.spyOn(window, 'fetch')
```

## Test Structure

```
src/
├── components/
│   ├── GridWidget/
│   │   ├── GridWidget.tsx
│   │   └── GridWidget.test.tsx
├── utils/
│   ├── eventMonitor.ts
│   └── eventMonitor.test.ts
└── test/
    └── setup.ts        # Global test setup
```

## Coverage Reports

After running `npm run test:coverage`, open `coverage/index.html` to see:
- Line coverage
- Branch coverage  
- Function coverage
- Statement coverage

## Best Practices

### 1. Test Organization
```typescript
describe('ComponentName', () => {
  describe('rendering', () => {
    it('should render with default props', () => {})
    it('should render with custom props', () => {})
  })
  
  describe('interactions', () => {
    it('should handle click events', () => {})
    it('should handle drag events', () => {})
  })
  
  describe('edge cases', () => {
    it('should handle null data', () => {})
    it('should handle errors gracefully', () => {})
  })
})
```

### 2. Testing Event Conflicts
```typescript
it('should not conflict with grid layout drag', async () => {
  const { container } = render(<GridDashboard />)
  
  // Start monitoring
  eventMonitor.start()
  
  // Perform conflicting actions
  const widget = container.querySelector('.react-grid-item')
  fireEvent.mouseDown(widget)
  fireEvent.click(widget)
  
  // Check for conflicts
  const report = eventMonitor.getReport()
  const highSeverity = report.filter(r => r.severity === 'high')
  expect(highSeverity).toHaveLength(0)
})
```

### 3. Performance Testing
```typescript
import { measureRender } from '@/test/utils'

it('should render within performance budget', async () => {
  const renderTime = await measureRender(<ComplexComponent />)
  expect(renderTime).toBeLessThan(16) // 60fps = 16ms per frame
})
```

## Debugging Tests

### Using Vitest UI
```bash
npm run test:ui
```
- Interactive test explorer
- Real-time test results
- Module graph visualization
- Coverage overlay

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test", "--", "--run", "${file}"],
  "console": "integratedTerminal"
}
```

### Console Debugging
```typescript
it('should debug event conflicts', () => {
  render(<Widget />)
  
  // Use screen.debug() to see DOM
  screen.debug()
  
  // Check event monitor state
  console.log(eventMonitor.getReport())
})
```

## Integration with Chrome DevTools

When tests fail due to event conflicts:

1. Run the app in dev mode: `npm run dev:debug`
2. Open Chrome DevTools
3. Use Event Listener breakpoints
4. Reproduce the test scenario manually
5. Use AI insights to understand the conflict

## Continuous Integration

Add to your CI pipeline:
```yaml
- name: Run tests
  run: npm test -- --run

- name: Generate coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Common Patterns

### Testing Drag and Drop
```typescript
import { createDragEvent } from '@/test/utils'

it('should handle drag and drop', () => {
  const onDrop = vi.fn()
  render(<DragTarget onDrop={onDrop} />)
  
  const target = screen.getByTestId('drop-zone')
  const dragEvent = createDragEvent('text/plain', 'test data')
  
  fireEvent.drop(target, dragEvent)
  expect(onDrop).toHaveBeenCalledWith('test data')
})
```

### Testing with Event Monitor
```typescript
it('should track performance during interactions', () => {
  const { rerender } = render(<Dashboard />)
  
  performance.mark('interaction-start')
  
  // Simulate user interactions
  fireEvent.click(screen.getByText('Add Widget'))
  rerender(<Dashboard />)
  
  performance.mark('interaction-end')
  performance.measure('interaction', 'interaction-start', 'interaction-end')
  
  const measure = performance.getEntriesByName('interaction')[0]
  expect(measure.duration).toBeLessThan(100)
})
```

## Tips

1. **Fast Feedback**: Vitest runs only changed tests by default
2. **Parallel Testing**: Tests run in parallel for speed
3. **Snapshot Testing**: Use `.toMatchSnapshot()` for component output
4. **In-Source Testing**: Can write tests in the same file with `if (import.meta.vitest)`
5. **Type Safety**: Full TypeScript support with type checking

Ready to write blazing fast tests! 🚀