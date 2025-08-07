// Run this in the browser console to test component loading

console.clear();
console.log('=== TESTING COMPONENT LOADING ===\n');

// 1. Check what's in localStorage
console.log('1. CHECKING LOCALSTORAGE:');
const currentLayout = localStorage.getItem('gzc-intel-current-layout');
if (currentLayout) {
  const parsed = JSON.parse(currentLayout);
  console.log('Current layout tabs:');
  parsed.tabs.forEach(tab => {
    console.log(`  - ${tab.name} (${tab.id}): component="${tab.component}"`);
  });
} else {
  console.log('  No current layout in localStorage');
}

// 2. Try to create a new user tab
console.log('\n2. TO CREATE A NEW TAB:');
console.log('  1. Click the "+" button in the tab bar');
console.log('  2. Select "Dynamic" or "Static" type');
console.log('  3. Give it a name and click Create');
console.log('  4. Watch the console for these messages:');
console.log('     - "componentRegistry: UserTabContainer loader called"');
console.log('     - "componentRegistry: MinimalUserTab module loaded"');
console.log('     - "MinimalUserTab: LOADED AND RENDERING"');

console.log('\n3. IF YOU SEE AN ERROR:');
console.log('  Copy the EXACT error message from the console');
console.log('  It will help identify if the issue is:');
console.log('  - Module not found (import path issue)');
console.log('  - Component error (runtime issue)');
console.log('  - Loading mechanism (lazy loading issue)');

console.log('\n=== END TEST ===');