# Frontend Tooling Implementation Guide - GZC Intel App

## 🎯 Implementation Priority List

### Phase 1: Core Development Environment ✅ COMPLETED
Essential tools for immediate development needs.

#### 1.1 React Developer Tools ✅ COMPLETED
```bash
# Browser Extension
Chrome/Edge: Install from Chrome Web Store
Firefox: Install from Firefox Add-ons

# What it provides:
- Component tree inspection
- Props/state editing
- Performance profiling
- Component search
```

#### 1.2 Chrome DevTools Setup ✅ COMPLETED
- Full debugging scripts implemented
- Event conflict detection integrated
- Chrome DevTools AI features documented
- Debug commands: `npm run debug:simple`, `npm run debug:events`
```javascript
// Add to src/utils/debug.js
export const debugTools = {
  // Event conflict detection
  checkEventConflicts: () => {
    const widgets = document.querySelectorAll('.widget-header');
    widgets.forEach((widget, index) => {
      const listeners = getEventListeners(widget);
      console.log(`Widget ${index} Events:`, listeners);
    });
  },

  // Performance monitoring
  monitorPerformance: () => {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.duration > 50) {
          console.warn('Long task detected:', entry);
        }
      });
    });
    observer.observe({ entryTypes: ['measure', 'navigation'] });
  }
};

// Enable in development
if (process.env.NODE_ENV === 'development') {
  window.debugTools = debugTools;
}
```

#### 1.3 Redux DevTools ✅ IMMEDIATE
```bash
npm install --save-dev redux-devtools-extension

# If using Redux Toolkit (recommended)
npm install @reduxjs/toolkit
```

```javascript
// src/store/index.js
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    market: marketReducer,
    portfolio: portfolioReducer,
    // ... other reducers
  },
  devTools: process.env.NODE_ENV !== 'production',
});
```

### Phase 2: Component Development Tools (Week 1-2)

#### 2.1 Storybook Setup 🔧 HIGH PRIORITY
```bash
# Initialize Storybook
npx storybook@latest init

# Add to package.json scripts
"scripts": {
  "storybook": "storybook dev -p 6006",
  "build-storybook": "storybook build"
}
```

```javascript
// src/components/GridWidget/GridWidget.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { GridWidget } from './GridWidget';

const meta: Meta<typeof GridWidget> = {
  title: 'Dashboard/GridWidget',
  component: GridWidget,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: 'widget-1',
    title: 'Market Data',
    children: <div>Content here</div>,
  },
};

export const Fullscreen: Story = {
  args: {
    ...Default.args,
    defaultFullscreen: true,
  },
};
```

#### 2.2 React Cosmos 🔧 OPTIONAL
```bash
npm install --save-dev react-cosmos

# Create cosmos.config.json
{
  "staticPath": "public",
  "watchDirs": ["src"],
  "userDepsFilePath": "src/cosmos.userdeps.js"
}
```

### Phase 3: Error Monitoring & Session Replay (Week 2)

#### 3.1 LogRocket Integration 📊 PRODUCTION
```bash
npm install logrocket logrocket-react
```

```javascript
// src/index.tsx
import LogRocket from 'logrocket';
import setupLogRocketReact from 'logrocket-react';

if (process.env.NODE_ENV === 'production') {
  LogRocket.init('YOUR_APP_ID');
  setupLogRocketReact(LogRocket);
  
  // Identify users (optional)
  LogRocket.identify('user123', {
    name: 'User Name',
    email: 'user@example.com',
  });
}
```

#### 3.2 Sentry Error Tracking 📊 PRODUCTION
```bash
npm install @sentry/react
```

```javascript
// src/index.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Wrap your app
const App = () => (
  <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
    <YourApp />
  </Sentry.ErrorBoundary>
);
```

### Phase 4: Design Integration Tools (Week 2-3)

#### 4.1 Figma Dev Mode + Claude MCP 🎨 DESIGN WORKFLOW
```bash
# Install Figma MCP server
npm install -g @figma/mcp-server

# Configure in claude_mcp_config.json
{
  "mcpServers": {
    "figma": {
      "command": "figma-mcp-server",
      "args": ["--token", "YOUR_FIGMA_TOKEN"],
      "env": {
        "FIGMA_FILE_KEY": "YOUR_FILE_KEY"
      }
    }
  }
}
```

```javascript
// scripts/figma_bridge.js
const FigmaAPI = require('figma-api');

const api = new FigmaAPI({
  personalAccessToken: process.env.FIGMA_TOKEN,
});

async function getComponentFromFigma(nodeId) {
  const file = await api.getFile(process.env.FIGMA_FILE_KEY);
  const component = findNodeById(file.document, nodeId);
  return generateReactComponent(component);
}

module.exports = { getComponentFromFigma };
```

### Phase 5: Advanced Debugging Tools ✅ COMPLETED

#### 5.1 Custom Event Monitoring System ✅ IMPLEMENTED
- Real-time event conflict detection
- Automatic severity classification (low/medium/high)
- Visual conflict highlighting
- Console API: `eventMonitor.getReport()`
- Auto-starts in development mode
```javascript
// src/utils/eventMonitor.js
class EventMonitor {
  constructor() {
    this.conflicts = new Map();
    this.setupMonitoring();
  }

  setupMonitoring() {
    // Monitor drag conflicts
    const dragEvents = ['dragstart', 'drag', 'dragend', 'drop'];
    const clickEvents = ['click', 'mousedown', 'mouseup'];
    
    [...dragEvents, ...clickEvents].forEach(eventType => {
      document.addEventListener(eventType, (e) => {
        this.logConflict(e);
      }, { capture: true });
    });
  }

  logConflict(event) {
    const target = event.target;
    const conflicts = this.conflicts.get(target) || [];
    conflicts.push({
      type: event.type,
      timestamp: Date.now(),
      propagation: event.eventPhase,
    });
    this.conflicts.set(target, conflicts);
    
    // Detect conflicts
    if (conflicts.length > 1) {
      const types = conflicts.map(c => c.type);
      if (types.includes('click') && types.includes('dragstart')) {
        console.error('EVENT CONFLICT DETECTED:', target);
      }
    }
  }
}

// Initialize in development
if (process.env.NODE_ENV === 'development') {
  window.eventMonitor = new EventMonitor();
}
```

#### 5.2 Performance Budget Monitor 📊 CI/CD
```javascript
// src/utils/performanceBudget.js
const performanceBudgets = {
  firstContentfulPaint: 1500, // ms
  largestContentfulPaint: 2500, // ms
  totalBlockingTime: 300, // ms
  bundleSize: 500 * 1024, // 500KB
};

export function checkPerformanceBudget() {
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      Object.keys(performanceBudgets).forEach(metric => {
        if (entry[metric] > performanceBudgets[metric]) {
          console.error(`Performance budget exceeded for ${metric}:`, {
            actual: entry[metric],
            budget: performanceBudgets[metric]
          });
        }
      });
    });
  });
  
  observer.observe({ entryTypes: ['navigation', 'paint'] });
}
```

### Phase 6: Claude MCP Integration (Week 3-4)

#### 6.1 MCP Configuration 🤖 AUTOMATION
```json
// .mcp.json
{
  "name": "gzc-intel-app",
  "version": "1.0.0",
  "commands": {
    "dev": {
      "command": "npm run dev",
      "description": "Start development server"
    },
    "test": {
      "command": "npm test",
      "description": "Run tests"
    },
    "lint": {
      "command": "npm run lint",
      "description": "Run ESLint"
    },
    "debug:events": {
      "command": "node scripts/debugEvents.js",
      "description": "Debug event conflicts"
    },
    "analyze:bundle": {
      "command": "npm run build && npm run analyze",
      "description": "Analyze bundle size"
    }
  },
  "prompts": {
    "fixComponent": "Fix the component at {filepath} based on the error: {error}",
    "optimizePerformance": "Optimize the performance of {component} based on profiler data",
    "generateFromFigma": "Generate React component from Figma node {nodeId}"
  }
}
```

#### 6.2 Claude Debugging Assistant 🤖 AUTOMATION
```javascript
// scripts/claudeDebugger.js
const fs = require('fs');
const path = require('path');

class ClaudeDebugger {
  async analyzeErrors() {
    // Read latest error logs
    const errorLog = fs.readFileSync('./logs/errors.log', 'utf8');
    
    // Parse React error boundaries
    const reactErrors = this.parseReactErrors(errorLog);
    
    // Generate debug report
    const report = {
      timestamp: new Date().toISOString(),
      errors: reactErrors,
      suggestions: this.generateSuggestions(reactErrors),
      affectedComponents: this.findAffectedComponents(reactErrors)
    };
    
    // Save for Claude to read
    fs.writeFileSync('./debug-report.json', JSON.stringify(report, null, 2));
    
    return report;
  }
  
  parseReactErrors(log) {
    // Extract React component stack traces
    const errorPattern = /Error: (.+)\n\s+at (\w+) \((.+):(\d+):(\d+)\)/g;
    const errors = [];
    let match;
    
    while ((match = errorPattern.exec(log)) !== null) {
      errors.push({
        message: match[1],
        component: match[2],
        file: match[3],
        line: match[4],
        column: match[5]
      });
    }
    
    return errors;
  }
  
  generateSuggestions(errors) {
    // AI-friendly suggestions for common patterns
    return errors.map(error => {
      if (error.message.includes('Cannot read property')) {
        return `Add null check in ${error.component} at line ${error.line}`;
      }
      if (error.message.includes('Maximum update depth exceeded')) {
        return `Check useEffect dependencies in ${error.component}`;
      }
      // Add more patterns
      return 'Review component logic';
    });
  }
}

module.exports = ClaudeDebugger;
```

## 🏆 Professional Tools Implemented

### Testing Framework ✅
**Vitest** - Blazing fast unit testing
```bash
npm test              # Run tests in watch mode
npm run test:ui       # Interactive test UI
npm run test:coverage # Coverage report
```
- Full TypeScript support
- Jest-compatible API
- Component and utility testing configured
- Test files: `*.test.ts` and `*.test.tsx`

### Bundle Analysis ✅
**rollup-plugin-visualizer** - Bundle size visualization
```bash
npm run build:analyze  # Generate bundle report
```
- Treemap visualization
- Gzip and Brotli size analysis
- Identifies optimization opportunities

### Event Conflict Detection ✅
**Custom Event Monitor** - Real-time conflict detection
```javascript
// Available in console during development
eventMonitor.getReport()     // Get conflict report
eventMonitor.clear()          // Clear conflicts
eventMonitor.start()          // Start monitoring
eventMonitor.stop()           // Stop monitoring
```

### Chrome DevTools Integration ✅
- Remote debugging configured
- AI-powered error explanations
- Performance profiling
- Event listener analysis
- Guide: `docs/CHROME_DEVTOOLS_AI.md`

## 📋 Implementation Timeline

### Week 1: Foundation
- [ ] Install React Developer Tools
- [ ] Set up Chrome DevTools snippets
- [ ] Configure Redux DevTools
- [ ] Initialize Storybook

### Week 2: Monitoring
- [ ] Integrate LogRocket
- [ ] Set up Sentry error tracking
- [ ] Configure performance budgets

### Week 3: Advanced Tools
- [ ] Implement event conflict monitor
- [ ] Set up Figma integration
- [ ] Create debugging utilities

### Week 4: Automation
- [ ] Configure Claude MCP
- [ ] Set up automated debugging
- [ ] Create CI/CD performance checks

## 🚀 Quick Start Commands

```bash
# Install all development dependencies
npm install --save-dev @storybook/react redux-devtools-extension

# Install production monitoring
npm install logrocket @sentry/react

# Set up Storybook
npx storybook@latest init

# Run all tools
npm run dev          # Start dev server
npm run storybook    # Start Storybook
npm run test:debug   # Run tests with debugging
```

## 🔍 Debugging Workflow

1. **Development Issues**: Chrome DevTools → React DevTools → Custom Event Monitor
2. **Component Issues**: Storybook → React DevTools → Performance Profiler
3. **Production Issues**: Sentry → LogRocket → Performance Budget
4. **Design Integration**: Figma → Claude MCP → Component Generation

## 📊 Success Metrics

- Event conflicts detected: 0
- Performance budget violations: 0
- Error rate: < 0.1%
- Component test coverage: > 80%
- Storybook stories: 100% of components

---

**Last Updated**: 2025-07-05
**Status**: Ready for Implementation
**Owner**: Software Research Analyst