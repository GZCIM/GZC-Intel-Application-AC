# CLAUDE.md - GZC Intel App

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL: Server Management

**AUTOMATIC SERVER MONITORING**: Use `./server-monitor.sh` for a self-healing server that:
- Auto-restarts if it crashes
- Monitors health every 30 seconds
- Allocates 8GB memory automatically
- Never requires manual intervention

**Quick Commands**:
- `./server-monitor.sh` - Start with auto-monitoring
- `./check-server.sh` - Quick status check
- Server runs on http://localhost:3500/

## Project Overview

GZC Intel App is a financial intelligence dashboard featuring drag-and-drop widgets, real-time data visualization, and advanced debugging capabilities.

## Common Development Commands

### Core Development
```bash
# Start development server
npm run dev

# Start with Chrome debugging enabled
npm run dev:debug

# Build for production
npm run build

# Analyze bundle size
npm run build:analyze
```

### Testing
```bash
# Run unit tests (Vitest)
npm test

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Debugging
```bash
# Simple Chrome DevTools connection
npm run debug:simple

# Event conflict detection
npm run debug:events

# Performance monitoring
npm run debug:performance
```

## Professional Development Tools

### 1. Event Monitor (Custom Tool)
Real-time detection of event conflicts between drag-and-drop and widget interactions.

```javascript
// Available in browser console during development
eventMonitor.getReport()    // View all conflicts
eventMonitor.clear()        // Clear conflict history
eventMonitor.start()        // Start monitoring
eventMonitor.stop()         // Stop monitoring
```

**What it detects:**
- Click vs Drag conflicts (HIGH severity)
- Mouse vs Touch conflicts (MEDIUM severity)
- Event propagation issues
- Multiple handlers on same element

### 2. Chrome DevTools Integration
- Remote debugging on port 9222
- AI-powered error explanations (enable in DevTools Settings > Experiments)
- Custom event analysis functions
- Performance profiling

### 3. Vitest Testing Framework
- Lightning-fast unit tests
- React Testing Library integration
- Coverage reporting
- Interactive test UI

**Test Structure:**
```
src/
├── components/
│   └── ComponentName/
│       ├── ComponentName.tsx
│       └── ComponentName.test.tsx
└── utils/
    ├── utilityName.ts
    └── utilityName.test.ts
```

### 4. Bundle Analyzer
Visualize bundle composition after build:
```bash
npm run build:analyze
# Opens interactive treemap in browser
```

## Architecture Patterns

### Component Structure
- Use functional components with TypeScript
- Implement proper event handling to avoid conflicts
- Follow drag-handle pattern for draggable widgets

### State Management
- Local state for UI interactions
- Context for theme and global settings
- Consider Redux Toolkit for complex state (not yet implemented)

### Event Handling Best Practices
```typescript
// Prevent event conflicts
const handleClick = (e: React.MouseEvent) => {
  e.stopPropagation(); // Prevent bubbling to drag handlers
  // Handle click
};

// Use drag handles for draggable components
<div className="drag-handle" onMouseDown={handleDragStart}>
  {/* Drag handle UI */}
</div>
```

## Known Issues & Solutions

### Event Conflicts
The app uses React Grid Layout for drag-and-drop. Common conflicts:
1. Click events on widgets triggering drag
2. Scroll events interfering with drag
3. Touch events on mobile

**Solution:** Use Event Monitor to detect and fix conflicts.

### Performance
- Large datasets in charts can slow rendering
- Use React.memo for expensive components
- Implement virtualization for long lists

## Development Workflow

1. **Start Development:**
   ```bash
   npm run dev:debug  # Includes Chrome debugging
   ```

2. **Monitor Events:**
   - Open Chrome DevTools Console
   - Check `eventMonitor.getReport()` regularly
   - Fix any HIGH severity conflicts immediately

3. **Write Tests:**
   - Create `.test.tsx` files alongside components
   - Test event handling and conflicts
   - Aim for >80% coverage

4. **Before Commit:**
   ```bash
   npm run lint
   npm test -- --run
   npm run build
   ```

## File Structure
```
src/
├── components/          # React components
│   ├── GridWidget/     # Draggable widget container
│   └── Dashboard/      # Main dashboard layout
├── utils/              # Utilities
│   ├── eventMonitor.ts # Event conflict detection
│   └── debug.ts        # Debug helpers
├── pages/              # Route pages
├── styles/             # Global styles
└── test/              # Test setup
    └── setup.ts       # Vitest configuration
```

## Important Notes

- **Never** hardcode API keys or secrets
- **Always** test drag-and-drop interactions after changes
- **Use** Event Monitor to verify no new conflicts introduced
- **Run** tests before pushing changes
- **Check** bundle size impact for new dependencies

## Quick Debugging

```javascript
// In Chrome DevTools Console:

// 1. Check for event conflicts
eventMonitor.getReport()

// 2. Monitor specific element
monitorEvents(document.querySelector('.widget-header'))

// 3. Check event listeners
getEventListeners(document.querySelector('.react-grid-item'))

// 4. Performance check
performance.mark('start')
// ... perform action
performance.mark('end')
performance.measure('action', 'start', 'end')
```

This codebase prioritizes professional tooling, comprehensive testing, and proactive debugging.