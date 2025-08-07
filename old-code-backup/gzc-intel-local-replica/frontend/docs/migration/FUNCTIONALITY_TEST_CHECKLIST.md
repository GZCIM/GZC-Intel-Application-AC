# GZC Intel App - Functionality Test Checklist

## 🔍 Complete Feature Testing Guide

### 1. ✅ Tab System
- [ ] **Default Tabs**
  - [ ] Analytics tab loads correctly
  - [ ] Documentation tab loads correctly
  - [ ] Tab type indicators show (green dot for dynamic, blue for static)

- [ ] **Tab Creation**
  - [ ] Click + button opens modal
  - [ ] Can enter tab name
  - [ ] Can select tab type (Dynamic/Static)
  - [ ] Tab appears after creation
  - [ ] New tab becomes active

- [ ] **Tab Management**
  - [ ] Click tab to switch
  - [ ] Drag tabs to reorder
  - [ ] Right-click closable tabs shows context menu
  - [ ] Delete tab works
  - [ ] Cannot delete non-closable tabs (Analytics, Documentation)

- [ ] **Tab Persistence**
  - [ ] Refresh page - tabs remain
  - [ ] Active tab is remembered
  - [ ] Tab order is preserved

### 2. 👤 User Profile System
- [ ] **User Display**
  - [ ] Shows current user name
  - [ ] Shows user avatar with initials
  - [ ] Avatar uses theme colors

- [ ] **User Switching (Dev Mode)**
  - [ ] Click profile to open dropdown
  - [ ] Shows all 4 users
  - [ ] Current user has checkmark
  - [ ] Switch to different user
  - [ ] Tabs change to new user's tabs
  - [ ] Create tab as User A, switch to User B - tab not visible
  - [ ] Switch back to User A - tab reappears

### 3. 🎨 Theme System
- [ ] **Theme Selector**
  - [ ] Click theme button shows dropdown
  - [ ] All themes listed with preview colors
  - [ ] Current theme highlighted
  - [ ] Switch theme - UI updates immediately
  - [ ] Theme persists on refresh

- [ ] **Theme Application**
  - [ ] Test each theme:
    - [ ] GZC Dark (default)
    - [ ] GZC Light
    - [ ] Institutional
    - [ ] Arctic
    - [ ] Parchment
    - [ ] Pearl
    - [ ] Dark Mode
    - [ ] Midnight
    - [ ] Forest
    - [ ] Ocean
    - [ ] Sunset
    - [ ] Professional

### 4. 💾 Memory & Persistence
- [ ] **Tab Memory**
  - [ ] Create custom tab
  - [ ] Refresh - tab persists
  - [ ] Close browser, reopen - tab persists

- [ ] **User Memory**
  - [ ] Switch user
  - [ ] Refresh - stays on same user
  - [ ] User-specific tabs load correctly

- [ ] **Theme Memory**
  - [ ] Change theme
  - [ ] Refresh - theme persists

### 5. 🧩 Component Loading
- [ ] **Dynamic Components**
  - [ ] UserTabContainer loads for custom tabs
  - [ ] MinimalUserTab fallback works
  - [ ] No console errors on tab load

- [ ] **Error Handling**
  - [ ] Invalid component shows error boundary
  - [ ] App continues working with other tabs

### 6. 📊 UI Elements
- [ ] **Header**
  - [ ] GZC logo displays
  - [ ] P&L numbers update
  - [ ] All buttons clickable
  - [ ] Responsive to theme changes

- [ ] **Status Bar**
  - [ ] Shows system status
  - [ ] Updates market data
  - [ ] Theme-aware styling

### 7. 🐛 Debug Tools (Dev Mode)
- [ ] **Console Debug Script**
  - [ ] Load debug-user-tabs.js
  - [ ] checkUserStorage() shows correct data
  - [ ] debugAllUserTabs() lists all users
  - [ ] debugClearUserTabs() resets user

- [ ] **Visual Debugger**
  - [ ] Shows in bottom-right
  - [ ] Updates in real-time
  - [ ] Expandable/collapsible
  - [ ] Shows correct user data

### 8. 🔄 Advanced Scenarios
- [ ] **Multi-User Flow**
  1. Create 2 tabs as Mikaël
  2. Switch to Alex
  3. Create 1 tab as Alex
  4. Switch to Edward
  5. Verify Edward has only defaults
  6. Switch to Mikaël
  7. Verify Mikaël has his 2 custom tabs + defaults

- [ ] **Theme + User Combo**
  1. Set Arctic theme as Mikaël
  2. Switch to Alex
  3. Set Ocean theme as Alex
  4. Switch back to Mikaël
  5. Verify Arctic theme is active

- [ ] **Tab Lifecycle**
  1. Create tab "Test 1"
  2. Reorder it
  3. Create tab "Test 2"
  4. Delete "Test 1"
  5. Refresh
  6. Verify only "Test 2" remains

## 🚀 Quick Test Commands

```javascript
// In browser console:

// 1. Load debug tools
const script = document.createElement('script');
script.src = '/debug-user-tabs.js';
document.head.appendChild(script);

// 2. Check current state
checkUserStorage();

// 3. View all users
debugAllUserTabs();

// 4. Test persistence
localStorage.setItem('test-marker', Date.now());
// Refresh page
console.log('Test marker:', localStorage.getItem('test-marker'));
```

## 📝 Notes
- All tests should be performed in development mode
- Use different browsers to test multi-user scenarios
- Check browser console for any errors
- Visual debugger should always show accurate data

## 🎯 Success Criteria
- All checkboxes marked ✅
- No console errors
- Smooth user experience
- Data persists correctly
- Theme applies consistently
- User isolation works properly