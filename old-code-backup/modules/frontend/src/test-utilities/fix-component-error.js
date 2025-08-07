// Complete diagnostic and fix for UserTabContainer error
// Run this in the browser console

console.clear();
console.log('=== COMPONENT ERROR FIX ===\n');

// Step 1: Diagnose the issue
console.log('1. CHECKING CURRENT STATE:');

// Check if there are any tabs with problematic component IDs
const checkTabs = () => {
  const layouts = localStorage.getItem('gzc-intel-layouts');
  const currentLayout = localStorage.getItem('gzc-intel-current-layout');
  let hasIssues = false;
  
  if (layouts) {
    const parsed = JSON.parse(layouts);
    console.log('  Found', parsed.length, 'saved layouts');
    parsed.forEach((layout, i) => {
      layout.tabs.forEach(tab => {
        if (tab.component && tab.component.startsWith('UserTab_')) {
          console.log(`  ❌ Layout ${i} has old component ID:`, tab.component);
          hasIssues = true;
        }
      });
    });
  }
  
  if (currentLayout) {
    const parsed = JSON.parse(currentLayout);
    parsed.tabs.forEach(tab => {
      if (tab.component && tab.component.startsWith('UserTab_')) {
        console.log('  ❌ Current layout has old component ID:', tab.component);
        hasIssues = true;
      }
    });
  }
  
  return hasIssues;
};

// Step 2: Fix the issues
const fixComponentIds = () => {
  console.log('\n2. FIXING COMPONENT IDS:');
  
  // Fix layouts
  const layouts = localStorage.getItem('gzc-intel-layouts');
  if (layouts) {
    const parsed = JSON.parse(layouts);
    let fixed = false;
    
    parsed.forEach(layout => {
      layout.tabs.forEach(tab => {
        if (tab.component && tab.component.startsWith('UserTab_')) {
          console.log('  Fixing:', tab.component, '→ UserTabContainer');
          tab.component = 'UserTabContainer';
          fixed = true;
        }
      });
    });
    
    if (fixed) {
      localStorage.setItem('gzc-intel-layouts', JSON.stringify(parsed));
      console.log('  ✅ Fixed saved layouts');
    }
  }
  
  // Fix current layout
  const currentLayout = localStorage.getItem('gzc-intel-current-layout');
  if (currentLayout) {
    const parsed = JSON.parse(currentLayout);
    let fixed = false;
    
    parsed.tabs.forEach(tab => {
      if (tab.component && tab.component.startsWith('UserTab_')) {
        console.log('  Fixing:', tab.component, '→ UserTabContainer');
        tab.component = 'UserTabContainer';
        fixed = true;
      }
    });
    
    if (fixed) {
      localStorage.setItem('gzc-intel-current-layout', JSON.stringify(parsed));
      console.log('  ✅ Fixed current layout');
    }
  }
};

// Step 3: Clear all data if needed
const clearAllData = () => {
  console.log('\n3. CLEARING ALL DATA:');
  const keys = Object.keys(localStorage).filter(k => k.includes('gzc-intel'));
  keys.forEach(key => {
    localStorage.removeItem(key);
    console.log('  Removed:', key);
  });
  console.log('  ✅ All data cleared');
};

// Run diagnostics
const hasIssues = checkTabs();

if (hasIssues) {
  console.log('\n⚠️  Found issues with component IDs');
  console.log('Running automatic fix...');
  fixComponentIds();
  console.log('\n✅ Fix applied! Refreshing page in 2 seconds...');
  setTimeout(() => location.reload(), 2000);
} else {
  console.log('\n✅ No component ID issues found');
  console.log('\nIf you still see errors:');
  console.log('1. Run: clearAllData() to start fresh');
  console.log('2. Then refresh the page');
}

// Make functions available globally
window.fixComponentIds = fixComponentIds;
window.clearAllData = clearAllData;

console.log('\n=== END DIAGNOSTIC ===');