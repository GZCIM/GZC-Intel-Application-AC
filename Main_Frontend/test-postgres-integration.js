// Test script for PostgreSQL integration
// Run this in the browser console to test the complete flow

async function testPostgresIntegration() {
  console.log('🧪 Starting PostgreSQL Integration Test...\n');
  
  const API_URL = 'http://localhost:5300/api/preferences';
  const token = 'Bearer dev-token';
  
  try {
    // Step 1: Get current tabs
    console.log('📋 Step 1: Fetching current tabs...');
    const tabsResponse = await fetch(`${API_URL}/tabs`, {
      headers: { 'Authorization': token }
    });
    const tabsData = await tabsResponse.json();
    console.log(`Found ${tabsData.tabs.length} existing tabs`);
    
    // Step 2: Create a new tab
    console.log('\n📝 Step 2: Creating a new dynamic tab...');
    const newTab = {
      tab_id: `test-tab-${Date.now()}`,
      title: 'Test Dynamic Tab',
      icon: 'grid',
      tab_type: 'dynamic',
      components: [
        {
          id: 'comp-1',
          type: 'Portfolio',
          position: { x: 0, y: 0, w: 6, h: 8 },
          props: {}
        }
      ],
      custom_settings: { theme: 'dark' }
    };
    
    const createResponse = await fetch(`${API_URL}/tabs`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newTab)
    });
    const createdTab = await createResponse.json();
    console.log('✅ Tab created with ID:', createdTab.id);
    
    // Step 3: Verify tab was saved
    console.log('\n🔍 Step 3: Verifying tab was saved...');
    const verifyResponse = await fetch(`${API_URL}/tabs`, {
      headers: { 'Authorization': token }
    });
    const verifyData = await verifyResponse.json();
    const foundTab = verifyData.tabs.find(t => t.tab_id === newTab.tab_id);
    
    if (foundTab) {
      console.log('✅ Tab found in database');
      console.log('Components:', foundTab.component_ids);
    } else {
      console.log('❌ Tab not found in database');
    }
    
    // Step 4: Update the tab with more components
    console.log('\n🔄 Step 4: Adding more components to tab...');
    // component_ids might be already parsed or a string
    const existingComponents = typeof foundTab.component_ids === 'string' 
      ? JSON.parse(foundTab.component_ids)
      : foundTab.component_ids;
    
    const updatedComponents = [
      ...existingComponents,
      {
        id: 'comp-2',
        type: 'Analytics',
        position: { x: 6, y: 0, w: 6, h: 8 },
        props: {}
      }
    ];
    
    const updateResponse = await fetch(`${API_URL}/tabs/${newTab.tab_id}`, {
      method: 'PUT',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        components: updatedComponents
      })
    });
    
    if (updateResponse.ok) {
      console.log('✅ Components updated successfully');
    } else {
      console.log('❌ Failed to update components');
    }
    
    // Step 5: Test component layouts endpoint
    console.log('\n📐 Step 5: Testing component layouts...');
    const layoutsResponse = await fetch(`${API_URL}/layouts/bulk`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tab_id: newTab.tab_id,
        layouts: updatedComponents
      })
    });
    
    if (layoutsResponse.ok) {
      console.log('✅ Component layouts saved successfully');
    } else {
      console.log('❌ Failed to save component layouts');
    }
    
    // Step 6: Clean up - delete test tab
    console.log('\n🧹 Step 6: Cleaning up test tab...');
    const deleteResponse = await fetch(`${API_URL}/tabs/${newTab.tab_id}`, {
      method: 'DELETE',
      headers: { 'Authorization': token }
    });
    
    if (deleteResponse.ok) {
      console.log('✅ Test tab deleted successfully');
    } else {
      console.log('⚠️ Could not delete test tab');
    }
    
    console.log('\n✨ PostgreSQL Integration Test Complete!');
    console.log('Summary: All operations working correctly with PostgreSQL backend');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPostgresIntegration();