# Chrome DevTools Debugging Guide

## Quick Start

The simplest way to debug your React app with Chrome DevTools:

### 1. Start Chrome with Remote Debugging

```bash
npm run dev:debug
```

This starts your Vite dev server and opens Chrome with remote debugging enabled on port 9222.

### 2. Open Chrome DevTools

1. In Chrome, navigate to: `chrome://inspect`
2. Under "Remote Target", you'll see your page listed
3. Click the **"inspect"** link next to it

### 3. Use DevTools Console

In the DevTools Console, you can now use special debugging functions:

#### Check Event Listeners
```javascript
// For the currently selected element in Elements panel
getEventListeners($0)

// For a specific element
getEventListeners(document.querySelector('.widget-header'))

// For all widgets
$$('.widget-header').forEach((el, i) => {
  console.log(`Widget ${i}:`, getEventListeners(el))
})
```

#### Monitor Events in Real-Time
```javascript
// Start monitoring
monitorEvents(document.querySelector('.widget-header'), ['click', 'mousedown', 'dragstart'])

// Stop monitoring
unmonitorEvents(document.querySelector('.widget-header'))
```

#### Debug React Grid Layout
```javascript
// Check all grid items
$$('.react-grid-item').forEach(item => {
  console.log('Item:', item.getAttribute('data-grid'), 'Listeners:', getEventListeners(item))
})
```

## Common Debugging Scenarios

### 1. Widget Not Responding to Clicks
```javascript
// Check if events are attached
const widget = document.querySelector('.widget-header')
console.log('Widget listeners:', getEventListeners(widget))
console.log('Parent listeners:', getEventListeners(widget.parentElement))

// Monitor what happens on click
monitorEvents(widget, ['click', 'mousedown', 'mouseup'])
```

### 2. Drag and Drop Issues
```javascript
// Check drag-related events
const gridItem = document.querySelector('.react-grid-item')
console.log('Drag listeners:', getEventListeners(gridItem))

// Monitor drag events
monitorEvents(gridItem, ['dragstart', 'drag', 'dragend', 'mousedown', 'mousemove', 'mouseup'])
```

### 3. Event Conflicts
```javascript
// Find all elements with both click and drag listeners
$$('*').filter(el => {
  const listeners = getEventListeners(el)
  return listeners.click && (listeners.dragstart || listeners.mousedown)
}).forEach(el => {
  console.log('Conflict found:', el, getEventListeners(el))
})
```

## Advanced Debugging

### Using the Simple Debug Script

For a guided debugging experience:

```bash
npm run debug:simple
```

This will:
- Connect to your running Chrome instance
- Provide instructions for using Chrome DevTools
- Keep the connection alive while you debug

### Performance Monitoring

To monitor performance in real-time:

```bash
npm run debug:performance
```

This tracks:
- Long tasks (>50ms)
- Event loop blocking
- Memory usage
- DOM metrics

## Tips

1. **$0** in the console refers to the currently selected element in the Elements panel
2. **$$()** is a shorthand for `document.querySelectorAll()`
3. Use **Cmd+Shift+C** (Mac) or **Ctrl+Shift+C** (Windows/Linux) to inspect elements
4. The Network panel shows all API calls and their responses
5. The Performance panel can record and analyze runtime performance

## Troubleshooting

If Chrome DevTools doesn't connect:
1. Make sure Chrome is running with `npm run dev:debug`
2. Check that port 9222 is not blocked
3. Try closing all Chrome instances and restarting