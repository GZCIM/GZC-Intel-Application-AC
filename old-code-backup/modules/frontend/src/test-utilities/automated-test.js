// Automated Test Suite for GZC Intel App
// Run this in browser console to verify core functionality

console.clear();
console.log('🧪 GZC INTEL APP - AUTOMATED TEST SUITE\n');

// Test Results Tracker
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Test helper
function test(name, fn) {
  try {
    const result = fn();
    if (result) {
      testResults.passed++;
      testResults.tests.push({ name, status: '✅ PASS' });
      console.log(`✅ ${name}`);
    } else {
      testResults.failed++;
      testResults.tests.push({ name, status: '❌ FAIL' });
      console.log(`❌ ${name}`);
    }
  } catch (e) {
    testResults.failed++;
    testResults.tests.push({ name, status: '❌ ERROR', error: e.message });
    console.log(`❌ ${name} - Error: ${e.message}`);
  }
}

// Wait helper
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Run tests
async function runTests() {
  console.log('Starting automated tests...\n');
  
  // Test 1: LocalStorage availability
  test('LocalStorage is available', () => {
    return typeof localStorage !== 'undefined';
  });

  // Test 2: SessionStorage availability
  test('SessionStorage is available', () => {
    return typeof sessionStorage !== 'undefined';
  });

  // Test 3: User context exists
  test('User is logged in', () => {
    const user = localStorage.getItem('gzc-intel-user');
    return user !== null;
  });

  // Test 4: Theme is set
  test('Theme is configured', () => {
    const theme = localStorage.getItem('gzc-intel-theme');
    return theme !== null;
  });

  // Test 5: User-specific storage
  test('User-specific storage keys exist', () => {
    const user = JSON.parse(localStorage.getItem('gzc-intel-user') || '{}');
    if (!user.id) return false;
    
    // Check for at least one user-specific key
    const keys = Object.keys(localStorage);
    return keys.some(key => key.includes(user.id));
  });

  // Test 6: Tab persistence structure
  test('Tab persistence structure is valid', () => {
    const user = JSON.parse(localStorage.getItem('gzc-intel-user') || '{}');
    if (!user.id) return false;
    
    const currentLayout = localStorage.getItem(`gzc-intel-current-layout-${user.id}`);
    if (!currentLayout) return true; // No layout is valid (will use defaults)
    
    try {
      const layout = JSON.parse(currentLayout);
      return layout.hasOwnProperty('tabs') && Array.isArray(layout.tabs);
    } catch {
      return false;
    }
  });

  // Test 7: Theme CSS variables
  test('Theme CSS variables are applied', () => {
    const root = document.documentElement;
    const primary = getComputedStyle(root).getPropertyValue('--theme-primary');
    return primary && primary.trim() !== '';
  });

  // Test 8: Required DOM elements
  test('Header is rendered', () => {
    // Look for the professional header by checking for tabs
    const hasLogo = document.querySelector('svg') !== null; // GZC Logo
    const hasThemeSelector = Array.from(document.querySelectorAll('button')).some(
      btn => btn.textContent?.includes('Theme') || btn.querySelector('svg')
    );
    return hasLogo || hasThemeSelector;
  });

  // Test 9: Tab functionality
  test('Tab system is initialized', () => {
    // Check for tab-related elements
    const tabButtons = document.querySelectorAll('button');
    const hasAddButton = Array.from(tabButtons).some(btn => btn.textContent === '+');
    return hasAddButton;
  });

  // Test 10: Debug mode check
  test('Development mode features', () => {
    // In dev mode, user switcher should be available
    const userProfile = Array.from(document.querySelectorAll('div')).some(
      div => div.textContent?.includes('Mikaël') || div.textContent?.includes('Alex')
    );
    return userProfile;
  });

  console.log('\n📊 TEST RESULTS:');
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Total: ${testResults.tests.length}`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests.filter(t => t.status.includes('FAIL') || t.status.includes('ERROR'))
      .forEach(t => console.log(`  - ${t.name}${t.error ? ': ' + t.error : ''}`));
  }
  
  // Additional diagnostics
  console.log('\n📋 CURRENT STATE:');
  const user = JSON.parse(localStorage.getItem('gzc-intel-user') || '{}');
  console.log(`User: ${user.name || 'None'} (${user.id || 'N/A'})`);
  console.log(`Theme: ${localStorage.getItem('gzc-intel-theme') || 'default'}`);
  
  if (user.id) {
    const currentLayout = localStorage.getItem(`gzc-intel-current-layout-${user.id}`);
    if (currentLayout) {
      const layout = JSON.parse(currentLayout);
      console.log(`Tabs: ${layout.tabs?.length || 0} tabs`);
      layout.tabs?.forEach(tab => console.log(`  - ${tab.name} (${tab.type})`));
    } else {
      console.log('Tabs: Using defaults');
    }
  }
  
  return testResults;
}

// Run the tests
runTests().then(results => {
  console.log('\n✅ Automated tests complete!');
  
  // Store results for manual inspection
  window.testResults = results;
  
  console.log('\n💡 Next steps:');
  console.log('1. Check the visual debugger (bottom-right)');
  console.log('2. Try switching users via profile dropdown');
  console.log('3. Create a new tab and refresh');
  console.log('4. Run debugAllUserTabs() to see all users\' tabs');
});