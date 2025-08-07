# Viewing the Dashboard

## Access the Dashboard

1. **Start the Dev Server**:
   ```bash
   npm run dev
   ```

2. **Open Browser**:
   - Go to http://localhost:3500
   - You'll see a tab-based interface

3. **Navigate to Dashboard**:
   - Look for the "Dashboard" tab in the tab bar at the top
   - Click on it to see the professional grid dashboard

## Dashboard Features

- **Drag & Drop**: Click and drag widgets by their headers
- **Resize**: Hover over widget edges to resize
- **Fullscreen**: Click the maximize icon on any widget
- **Add Widgets**: Use the toolbar buttons to add new widgets
- **Remove Widgets**: Click the X button on widgets
- **Persistent Layout**: Your changes are saved automatically

## Available Widgets

1. **Market Overview** - Live market data with price updates
2. **Portfolio Summary** - (Placeholder)
3. **Analytics** - (Placeholder)
4. **News Feed** - (Placeholder)
5. **Trading Panel** - (Placeholder)

## Debug Event Conflicts

Open browser console and run:
```javascript
eventMonitor.getReport()
```

This will show any event conflicts between drag and click handlers.