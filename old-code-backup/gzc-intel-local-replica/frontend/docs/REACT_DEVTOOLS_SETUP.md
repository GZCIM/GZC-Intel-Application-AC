# React DevTools Setup

## Installation

### Option 1: Chrome Extension (Recommended)
1. Open Chrome Web Store
2. Search for "React Developer Tools"
3. Click "Add to Chrome"
4. The extension will automatically work with your React app

### Option 2: Standalone App
```bash
npm install -g react-devtools
# Then run:
react-devtools
```

## Usage

### With Chrome Extension:
1. Open your app (http://localhost:3500)
2. Open Chrome DevTools (F12)
3. You'll see two new tabs: "⚛️ Components" and "⚛️ Profiler"

### Key Features:

#### Components Tab:
- View component tree
- Inspect props and state
- Search for components
- View component source
- Edit props/state in real-time

#### Profiler Tab:
- Record performance
- See render times
- Identify unnecessary re-renders
- View component render reasons

## Useful Commands in Console:

```javascript
// Get React fiber node of selected element
$r

// Get props of selected component
$r.props

// Get state of selected component  
$r.state

// Force update selected component
$r.forceUpdate()
```

## Tips for Our App:

1. **Finding Widget Issues**: Search for "GridWidget" in Components tab
2. **State Inspection**: Check TabLayoutManager state for active tabs
3. **Performance**: Use Profiler to find slow-rendering widgets
4. **Event Handlers**: Props panel shows all onClick, onDrag handlers