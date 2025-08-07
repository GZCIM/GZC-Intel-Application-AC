// Tab Layout Export/Import Utility for GZC Intel App
// Run these functions in the browser console

// Export current tab layout
function exportTabLayout() {
  const userId = 'default-user'; // Change this if you have a different user ID
  const keys = [
    `gzc-intel-layouts-${userId}`,
    `gzc-intel-current-layout-${userId}`,
    `gzc-intel-active-layout-${userId}`
  ];
  
  const exportData = {};
  
  keys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      exportData[key] = value;
    }
  });
  
  // Also export dynamic canvas data
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('dynamic-canvas-')) {
      exportData[key] = localStorage.getItem(key);
    }
  });
  
  const exportString = JSON.stringify(exportData, null, 2);
  
  // Create download
  const blob = new Blob([exportString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gzc-intel-tabs-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('✅ Tab layout exported successfully!');
}

// Import tab layout
function importTabLayout(jsonString) {
  try {
    const importData = JSON.parse(jsonString);
    
    Object.keys(importData).forEach(key => {
      localStorage.setItem(key, importData[key]);
    });
    
    console.log('✅ Tab layout imported successfully!');
    console.log('🔄 Please refresh the page to see the imported tabs.');
    
  } catch (error) {
    console.error('❌ Failed to import tab layout:', error);
  }
}

// Show current tab configuration
function showCurrentTabs() {
  const userId = 'default-user'; // Change this if needed
  const currentLayout = localStorage.getItem(`gzc-intel-current-layout-${userId}`);
  
  if (currentLayout) {
    const layout = JSON.parse(currentLayout);
    console.log('Current Tab Configuration:');
    console.log('Layout Name:', layout.name);
    console.log('Tabs:');
    layout.tabs.forEach((tab, index) => {
      console.log(`  ${index + 1}. ${tab.name} (${tab.id}) - ${tab.type} - ${tab.closable ? 'closable' : 'fixed'}`);
      if (tab.components && tab.components.length > 0) {
        console.log(`     Components: ${tab.components.map(c => c.type).join(', ')}`);
      }
    });
  } else {
    console.log('No saved tab layout found');
  }
}

// Clear all tab data (use with caution!)
function clearTabData() {
  const userId = 'default-user';
  const keys = [
    `gzc-intel-layouts-${userId}`,
    `gzc-intel-current-layout-${userId}`,
    `gzc-intel-active-layout-${userId}`
  ];
  
  keys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Clear dynamic canvas data
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('dynamic-canvas-')) {
      localStorage.removeItem(key);
    }
  });
  
  console.log('✅ Tab data cleared. Refresh to see default layout.');
}

// Instructions
console.log(`
🚀 Tab Layout Export/Import Utility

Available functions:

1. exportTabLayout() - Export current tabs to a JSON file
2. importTabLayout(jsonString) - Import tabs from JSON string
3. showCurrentTabs() - Display current tab configuration
4. clearTabData() - Clear all saved tab data (use carefully!)

Example usage:
- To export: exportTabLayout()
- To import: 
  1. Read the exported file
  2. Copy its contents
  3. Run: importTabLayout(\`paste-json-here\`)

To sync between browsers:
1. Export from Chrome: exportTabLayout()
2. Open the downloaded JSON file
3. Copy its contents
4. In Safari console: importTabLayout(\`paste-contents\`)
5. Refresh Safari
`);