// Test Tab Persistence - Run this in browser console
// This script helps verify that tabs are being saved and restored correctly

console.clear();
console.log('=== TAB PERSISTENCE TEST ===\n');

// Function to check current state
function checkTabState() {
  console.log('\n--- CURRENT STATE ---');
  
  // Check localStorage
  const currentLayout = localStorage.getItem('gzc-intel-current-layout');
  const layouts = localStorage.getItem('gzc-intel-layouts');
  const activeLayout = localStorage.getItem('gzc-intel-active-layout');
  
  if (currentLayout) {
    const parsed = JSON.parse(currentLayout);
    console.log('Current Layout:', parsed.name, `(${parsed.tabs.length} tabs)`);
    console.log('Tabs:', parsed.tabs.map(t => `${t.name} (${t.id})`).join(', '));
  } else {
    console.log('No current layout saved');
  }
  
  console.log('Active Layout ID:', activeLayout || 'none');
  console.log('User Layouts:', layouts ? JSON.parse(layouts).length : 0);
  
  // Check sessionStorage
  const activeTab = sessionStorage.getItem('gzc-intel-active-tab');
  console.log('Active Tab:', activeTab || 'none');
}

// Function to create test tab
window.createTestTab = function(name = 'Test Tab ' + Date.now()) {
  console.log(`\nCreating tab: "${name}"`);
  
  // Trigger the tab creation modal
  const addButton = document.querySelector('button[title="Add Tab"]');
  if (addButton) {
    addButton.click();
    console.log('Click the "Create Tab" button in the modal');
    console.log(`Enter name: "${name}"`);
    console.log('Select a type and click Create');
  } else {
    console.log('ERROR: Could not find Add Tab button');
  }
};

// Function to verify persistence after refresh
window.verifyPersistence = function() {
  console.log('\n=== PERSISTENCE VERIFICATION ===');
  checkTabState();
  
  console.log('\nTo test persistence:');
  console.log('1. Run createTestTab() to create a new tab');
  console.log('2. Refresh the page');
  console.log('3. Run verifyPersistence() again');
  console.log('4. Check if your tab is still there');
};

// Function to debug what happens on save
window.debugSave = function() {
  console.log('\n=== DEBUG SAVE PROCESS ===');
  
  // Add listener for storage events
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('gzc-intel')) {
      console.log('Storage Event:', e.key, 'changed');
      console.log('Old:', e.oldValue?.substring(0, 100) + '...');
      console.log('New:', e.newValue?.substring(0, 100) + '...');
    }
  });
  
  console.log('Storage listener added. Make changes to see what gets saved.');
};

// Initial check
checkTabState();

console.log('\n=== AVAILABLE COMMANDS ===');
console.log('checkTabState() - Check current tab state');
console.log('createTestTab() - Create a test tab');
console.log('verifyPersistence() - Verify tabs after refresh');
console.log('debugSave() - Monitor save events');

console.log('\n=== END TEST SETUP ===');