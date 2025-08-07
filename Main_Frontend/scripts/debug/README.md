# Chrome DevTools Remote Debugging Suite

This directory contains debugging tools that connect to Chrome DevTools Protocol for advanced debugging of the GZC Intel App.

## Setup

1. **Install dependencies** (already done):
   ```bash
   npm install chrome-remote-interface puppeteer
   ```

2. **Start the app with debugging**:
   ```bash
   npm run dev:debug
   ```
   This will:
   - Start the Vite dev server
   - Open Chrome with remote debugging enabled on port 9222
   - Navigate to http://localhost:3500

## Available Tools

### 1. Event Conflict Analyzer
```bash
npm run debug:events
```
- Analyzes all event listeners on widget elements
- Identifies potential conflicts (click vs drag)
- Shows parent element listeners
- Provides conflict summary

### 2. Performance Monitor
```bash
npm run debug:performance
```
- Real-time performance metrics
- Tracks long tasks (>50ms)
- Monitors event loop blocking
- Shows memory usage and DOM metrics
- Updates every 5 seconds

### 3. Interactive Live Debugger
```bash
npm run debug:live
```
Commands:
- `events` - Analyze all event listeners
- `freeze` - Simulate widget freeze scenario
- `monitor` - Start real-time event monitoring
- `inspect` - Inspect specific element by selector
- `clear` - Clear console
- `help` - Show available commands
- `exit` - Exit debugger

## Usage Examples

### Finding Event Conflicts
```bash
# Start app with debugging
npm run dev:debug

# In another terminal, run event analysis
npm run debug:events
```

### Monitoring Drag Performance
```bash
# Start performance monitor
npm run debug:performance

# Then drag widgets around and watch the metrics
```

### Interactive Debugging
```bash
# Start live debugger
npm run debug:live

# Then type commands:
debug> events      # Check all listeners
debug> monitor     # Watch events in real-time
debug> inspect .widget-header  # Inspect specific element
```

## Claude MCP Integration

Use these commands with Claude:
```
"Claude, run debug:events and analyze the conflicts"
"Claude, start performance monitoring and tell me about bottlenecks"
"Claude, use live debugger to inspect .widget-header"
```

## Troubleshooting

1. **"Cannot connect to Chrome"**
   - Make sure Chrome is running with `npm run dev:debug`
   - Check that port 9222 is not in use
   - Try closing all Chrome instances first

2. **"No widgets found"**
   - Ensure the app is fully loaded
   - Check that you're on the correct page
   - Widgets might have different class names

3. **"getEventListeners is not defined"**
   - This only works in Chrome DevTools context
   - Make sure you're connected to Chrome, not another browser

## Architecture

These tools use:
- **Chrome DevTools Protocol (CDP)** for low-level browser control
- **Puppeteer** for high-level browser automation
- **Performance Observer API** for metrics collection
- **Console API** for real-time logging

The tools maintain a persistent connection to Chrome, allowing for real-time monitoring and debugging without page reloads.