// Debug Script for User-Specific Tabs
// Run this in the browser console to verify user-specific tab functionality

console.clear();
console.log('=== USER-SPECIFIC TAB SYSTEM DEBUG ===\n');

// Function to get current user
function getCurrentUser() {
  const userStr = localStorage.getItem('gzc-intel-user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (e) {
      console.error('Failed to parse user:', e);
      return null;
    }
  }
  return null;
}

// Function to check all user-specific storage
function checkUserStorage() {
  const user = getCurrentUser();
  console.log('🧑 Current User:', user ? `${user.name} (${user.id})` : 'None');
  console.log('');
  
  if (!user) {
    console.log('❌ No user logged in. Please select a user from the profile dropdown.');
    return;
  }
  
  const userId = user.id;
  console.log('📦 User-Specific Storage Keys:');
  console.log(`  - Layouts: gzc-intel-layouts-${userId}`);
  console.log(`  - Current Layout: gzc-intel-current-layout-${userId}`);
  console.log(`  - Active Layout: gzc-intel-active-layout-${userId}`);
  console.log(`  - Active Tab: gzc-intel-active-tab-${userId}`);
  console.log('');
  
  // Check each storage item
  console.log('📊 Storage Contents:');
  
  // Current Layout
  const currentLayout = localStorage.getItem(`gzc-intel-current-layout-${userId}`);
  if (currentLayout) {
    const layout = JSON.parse(currentLayout);
    console.log(`\n✅ Current Layout: "${layout.name}"`);
    console.log(`   Tabs: ${layout.tabs.map(t => t.name).join(', ')}`);
    console.log(`   Tab Count: ${layout.tabs.length}`);
  } else {
    console.log('\n❌ No current layout saved for this user');
  }
  
  // User Layouts
  const userLayouts = localStorage.getItem(`gzc-intel-layouts-${userId}`);
  if (userLayouts) {
    const layouts = JSON.parse(userLayouts);
    console.log(`\n✅ User Layouts: ${layouts.length} custom layout(s)`);
  } else {
    console.log('\n❌ No custom layouts for this user');
  }
  
  // Active Tab
  const activeTab = sessionStorage.getItem(`gzc-intel-active-tab-${userId}`);
  console.log(`\n✅ Active Tab: ${activeTab || 'None'}`);
}

// Function to simulate user switching
window.debugSwitchUser = function(userName) {
  const users = {
    'mikael': { id: 'user-mt', email: 'mikael.thomas@gzc-intel.com', name: 'Mikaël Thomas' },
    'alex': { id: 'user-ae', email: 'alex.eygenson@gzc-intel.com', name: 'Alex Eygenson' },
    'edward': { id: 'user-ef', email: 'edward.filippi@gzc-intel.com', name: 'Edward Filippi' },
    'levent': { id: 'user-ls', email: 'levent.sendur@gzc-intel.com', name: 'Levent Sendur' }
  };
  
  const user = users[userName.toLowerCase()];
  if (user) {
    localStorage.setItem('gzc-intel-user', JSON.stringify(user));
    console.log(`\n🔄 Switched to ${user.name}`);
    console.log('⚠️  Refresh the page to load their tabs');
  } else {
    console.log(`\n❌ Unknown user: ${userName}`);
    console.log('Available users: mikael, alex, edward, levent');
  }
};

// Function to show all users' tabs
window.debugAllUserTabs = function() {
  console.log('\n=== ALL USERS TAB OVERVIEW ===\n');
  
  const userIds = ['user-mt', 'user-ae', 'user-ef', 'user-ls'];
  const userNames = {
    'user-mt': 'Mikaël Thomas',
    'user-ae': 'Alex Eygenson',
    'user-ef': 'Edward Filippi',
    'user-ls': 'Levent Sendur'
  };
  
  userIds.forEach(userId => {
    const currentLayout = localStorage.getItem(`gzc-intel-current-layout-${userId}`);
    console.log(`\n👤 ${userNames[userId]} (${userId}):`);
    
    if (currentLayout) {
      const layout = JSON.parse(currentLayout);
      console.log(`   Layout: "${layout.name}"`);
      console.log(`   Tabs: ${layout.tabs.map(t => `${t.name} (${t.type})`).join(', ')}`);
    } else {
      console.log('   No saved tabs (will use defaults)');
    }
  });
};

// Function to clear current user's tabs
window.debugClearUserTabs = function() {
  const user = getCurrentUser();
  if (!user) {
    console.log('❌ No user logged in');
    return;
  }
  
  const keys = [
    `gzc-intel-layouts-${user.id}`,
    `gzc-intel-current-layout-${user.id}`,
    `gzc-intel-active-layout-${user.id}`,
    `gzc-intel-active-tab-${user.id}`
  ];
  
  keys.forEach(key => localStorage.removeItem(key));
  sessionStorage.removeItem(`gzc-intel-active-tab-${user.id}`);
  
  console.log(`\n🧹 Cleared all tabs for ${user.name}`);
  console.log('⚠️  Refresh the page to reset to defaults');
};

// Initial check
checkUserStorage();

console.log('\n=== AVAILABLE DEBUG COMMANDS ===');
console.log('checkUserStorage() - Check current user\'s tab storage');
console.log('debugSwitchUser("alex") - Switch to a different user');
console.log('debugAllUserTabs() - Show all users\' tabs');
console.log('debugClearUserTabs() - Clear current user\'s tabs');
console.log('\n=== TEST STEPS ===');
console.log('1. Create a tab as Mikaël');
console.log('2. Switch to Alex (click profile dropdown)');
console.log('3. Run checkUserStorage() - Should show no tabs for Alex');
console.log('4. Create a different tab as Alex');
console.log('5. Switch back to Mikaël');
console.log('6. Run checkUserStorage() - Should show Mikaël\'s original tab');
console.log('\n=== END DEBUG SETUP ===');