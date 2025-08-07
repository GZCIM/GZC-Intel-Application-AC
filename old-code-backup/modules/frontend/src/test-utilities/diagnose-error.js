// Run this in browser console to diagnose the issue

console.clear();
console.log('=== DIAGNOSTIC REPORT ===');

// 1. Check localStorage for problematic tabs
const checkLocalStorage = () => {
  console.log('\n1. LOCALSTORAGE CHECK:');
  
  const keys = ['gzc-intel-layouts', 'gzc-intel-current-layout', 'gzc-intel-app-state'];
  
  keys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        console.log(`\n${key}:`);
        
        // Look for tabs with problematic component IDs
        const findTabs = (obj) => {
          if (obj.tabs) {
            obj.tabs.forEach(tab => {
              if (tab.component && tab.component.includes('UserTab')) {
                console.log(`  - Tab: "${tab.name}" (${tab.id})`);
                console.log(`    Component: ${tab.component}`);
                console.log(`    Type: ${tab.type}`);
              }
            });
          }
          if (obj.layouts) {
            obj.layouts.forEach(layout => findTabs(layout));
          }
        };
        
        findTabs(parsed);
      } catch (e) {
        console.log(`  Error parsing ${key}:`, e.message);
      }
    } else {
      console.log(`  ${key}: Not found`);
    }
  });
};

// 2. Check current errors in console
const checkConsoleErrors = () => {
  console.log('\n2. CONSOLE ERRORS:');
  // This will show any "Failed to load component" errors
  console.log('  Check above for any "Failed to load component" messages');
};

// 3. Check component registry
const checkRegistry = () => {
  console.log('\n3. COMPONENT REGISTRY:');
  // Try to access through React DevTools or global
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('  React DevTools detected');
  }
  console.log('  Open React DevTools and search for "componentRegistry" in props/state');
};

// 4. Clear problematic data
const clearProblematicData = () => {
  console.log('\n4. CLEARING PROBLEMATIC DATA:');
  
  const keys = ['gzc-intel-layouts', 'gzc-intel-current-layout', 'gzc-intel-app-state'];
  let cleared = false;
  
  keys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data && data.includes('UserTab_')) {
      console.log(`  Clearing ${key} (contains old UserTab_ references)`);
      localStorage.removeItem(key);
      cleared = true;
    }
  });
  
  if (cleared) {
    console.log('\n  ⚠️  Cleared problematic data. Please refresh the page.');
  } else {
    console.log('  No problematic data found to clear.');
  }
};

// Run diagnostics
checkLocalStorage();
checkConsoleErrors();
checkRegistry();

console.log('\n=== SUGGESTED ACTIONS ===');
console.log('1. If you see UserTab_ component IDs above, run: clearProblematicData()');
console.log('2. Then refresh the page');
console.log('3. If issue persists, check Network tab for failed component loads');

// Make function available globally
window.clearProblematicData = clearProblematicData;