// Test script for GZC Intel App functionality
// Run this in the browser console

async function testFunctionality() {
  console.log('🧪 Testing GZC Intel App Functionality...\n');
  
  // Test 1: Check tab switching
  console.log('Test 1: Tab Switching');
  const tabs = document.querySelectorAll('[data-testid^="tab-"]');
  console.log(`Found ${tabs.length} tabs`);
  
  // Test 2: Check Edit button
  console.log('\nTest 2: Edit Button');
  const editButton = document.querySelector('button:has(svg)');
  if (editButton && editButton.textContent.includes('Edit')) {
    console.log('✅ Edit button found');
    
    // Click edit button
    console.log('Clicking Edit button...');
    editButton.click();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if button changed to Save
    const saveButton = document.querySelector('button:has(svg)');
    if (saveButton && saveButton.textContent.includes('Save')) {
      console.log('✅ Edit mode activated - button changed to Save');
    } else {
      console.log('❌ Edit mode not activated properly');
    }
  } else {
    console.log('❌ Edit button not found');
  }
  
  // Test 3: Check Add Component button (should appear in edit mode)
  console.log('\nTest 3: Add Component Button');
  await new Promise(resolve => setTimeout(resolve, 500));
  const addButton = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.includes('Add Component')
  );
  
  if (addButton) {
    console.log('✅ Add Component button found');
    
    // Click add component button
    console.log('Clicking Add Component button...');
    addButton.click();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if modal opened
    const modal = document.querySelector('[style*="z-index: 10000"]');
    if (modal) {
      console.log('✅ Component Portal modal opened');
      
      // Check for components
      const componentCards = modal.querySelectorAll('[style*="cursor: pointer"]');
      console.log(`Found ${componentCards.length} components available`);
      
      // Check if Portfolio component is available
      const portfolioCard = Array.from(componentCards).find(card => 
        card.textContent.includes('Portfolio')
      );
      
      if (portfolioCard) {
        console.log('✅ Portfolio component found in inventory');
      } else {
        console.log('❓ Portfolio component not visible in modal');
      }
      
      // Close modal
      const closeButton = modal.querySelector('button[style*="font-size: 20px"]');
      if (closeButton) closeButton.click();
    } else {
      console.log('❌ Component Portal modal did not open');
    }
  } else {
    console.log('❌ Add Component button not found');
  }
  
  // Test 4: Check component inventory
  console.log('\nTest 4: Component Inventory');
  if (window.componentInventory) {
    const allComponents = window.componentInventory.getAllComponents();
    console.log(`Total components in inventory: ${allComponents.length}`);
    
    const portfolio = window.componentInventory.getComponent('portfolio');
    if (portfolio) {
      console.log('✅ Portfolio component registered:', portfolio);
    } else {
      console.log('❌ Portfolio component not found in inventory');
    }
  } else {
    console.log('❓ Component inventory not exposed to window');
  }
  
  console.log('\n✨ Testing complete!');
}

// Run the test
testFunctionality();