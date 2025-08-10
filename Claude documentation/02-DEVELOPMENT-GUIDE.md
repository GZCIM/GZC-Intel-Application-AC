# Development Guide

## 🎯 Development Philosophy
- **70% thinking, 30% coding**
- **UPDATE > CREATE** - Always check for existing files first
- **Evidence-based** - Show command → output → conclusion
- **Transparency first** - Show real errors, not workarounds

## 📁 Workspace Rules

### DO ✅
- Work in `Main_Frontend/` for all frontend tasks
- Use existing patterns from neighboring files
- Update journal entries in `/journal/YYYY-MM-DD/`
- Test locally before deploying
- Use versioned Docker tags

### DON'T ❌
- Create files at root level
- Duplicate existing patterns
- Use `:latest` tag for Docker
- Deploy without building first
- Skip documentation updates

## 🏗 Component Architecture

### Grid Layout System
```typescript
// Component size constraints
{
  minSize: { w: 2, h: 2 },    // Minimum grid units
  maxSize: { w: 12, h: 20 },  // Maximum grid units  
  defaultSize: { w: 6, h: 8 }  // Default when added
}
```

### Component Registry
All components must be registered in `ComponentInventory.ts`:
```typescript
{
  id: 'component-id',
  name: 'ComponentName',
  displayName: 'Display Name',
  category: 'financial',
  description: 'Component description',
  defaultSize: { w: 6, h: 8 },
  minSize: { w: 4, h: 4 }
}
```

### Adding New Components
1. Create component in `src/components/[category]/`
2. Add to ComponentInventory
3. Ensure proper export pattern
4. Test drag/drop and resize
5. Document in journal

## 🔧 Development Workflow

### Daily Routine
```bash
# 1. Start development server
cd Main_Frontend
npm run dev

# 2. Make changes and test
# Edit files...

# 3. Build to verify
npx vite build

# 4. Document changes
echo "## $(date +%Y-%m-%d): Feature" >> ../journal/$(date +%Y-%m-%d)/work.md
```

### Testing Features
1. **Component Loading**: Right-click → Add Component
2. **Edit Mode**: Drag to reposition, resize from corners
3. **Persistence**: Refresh page, verify layout saved
4. **Cross-browser**: Test in Chrome and Safari

## 🐛 Debugging

### Check Component Inventory
```javascript
// Browser console
console.log(componentInventory.getAllComponents())
```

### Monitor Grid Events
```javascript
// Browser console
document.addEventListener('mousedown', (e) => {
  if (e.target.closest('.react-grid-item')) {
    console.log('Grid interaction', e)
  }
})
```

### Verify localStorage
```javascript
// Browser console
const layout = localStorage.getItem('tabLayouts')
console.log(JSON.parse(layout))
```

## 📊 State Management

### Context Providers
- **ThemeContext**: Dark/light theme management
- **UserContext**: User selection and preferences
- **QuoteContext**: Real-time quote subscriptions

### localStorage Keys
- `gzc-intel-theme` - Theme preference
- `gzc-intel-user` - Selected user
- `tabLayouts` - Component positions per tab

## 🔌 Backend Integration

### WebSocket Connections
```javascript
// Connect to quote streams
const socket = io('http://localhost:5100/ws_esp')
socket.on('quote', (data) => {
  console.log('Quote received:', data)
})
```

### Bloomberg API
```javascript
// Fetch market data
fetch('http://20.172.249.92:8080/api/market-data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    securities: ['AAPL US Equity'],
    fields: ['PX_LAST']
  })
})
```

## 📝 Code Standards

### TypeScript
- Many type errors exist - use `npx vite build` to bypass
- Fix types incrementally, don't let them block progress
- Use `any` sparingly, prefer `unknown` for safety

### React Patterns
- Use functional components with hooks
- Implement React.memo for expensive components
- Use lazy loading for large components
- Keep components focused and single-purpose

### Styling
- Use theme variables for consistency
- Prefer inline styles or CSS modules
- Test both light and dark themes
- Ensure mobile responsiveness

-- Claude Code @ 2025-01-08T18:39:15Z