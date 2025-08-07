// Test memory persistence - run this in browser console

console.clear();
console.log('=== MEMORY PERSISTENCE TEST ===\n');

// 1. Check what's in localStorage
console.log('1. LOCALSTORAGE CONTENTS:');
const storageKeys = [
  'gzc-intel-layouts',
  'gzc-intel-active-layout', 
  'gzc-intel-current-layout',
  'gzc-intel-app-state',
  'gzc-platform-view-memory'
];

storageKeys.forEach(key => {
  const value = localStorage.getItem(key);
  if (value) {
    try {
      const parsed = JSON.parse(value);
      console.log(`\n${key}:`, parsed);
    } catch (e) {
      console.log(`\n${key}:`, value);
    }
  } else {
    console.log(`\n${key}: Not found`);
  }
});

// 2. Test creating a tab
console.log('\n2. TO TEST TAB PERSISTENCE:');
console.log('  1. Create a new tab using the + button');
console.log('  2. Note the tab name');
console.log('  3. Refresh the page');
console.log('  4. Check if the tab is still there');

// 3. Function to manually save current state
window.saveCurrentState = function() {
  console.log('\nManually triggering state save...');
  const event = new Event('beforeunload');
  window.dispatchEvent(event);
  console.log('State save triggered. Check localStorage again.');
};

console.log('\n3. MANUAL SAVE:');
console.log('  Run saveCurrentState() to manually trigger a save');

console.log('\n=== END TEST ===');