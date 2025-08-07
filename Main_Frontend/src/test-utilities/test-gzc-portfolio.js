// Test GZC Portfolio Integration
// Run this in the browser console

async function testGZCPortfolio() {
  console.log('🧪 Testing GZC Portfolio Integration...\n');
  
  // Test 1: Check if GZC Portfolio is registered
  console.log('Test 1: Component Registration');
  if (window.componentInventory) {
    const gzcPortfolio = window.componentInventory.getComponent('gzc-portfolio');
    if (gzcPortfolio) {
      console.log('✅ GZC Portfolio found:', {
        id: gzcPortfolio.id,
        displayName: gzcPortfolio.displayName,
        description: gzcPortfolio.description,
        defaultSize: gzcPortfolio.defaultSize,
        tags: gzcPortfolio.tags
      });
    } else {
      console.log('❌ GZC Portfolio not found in inventory');
      
      // List all available components
      console.log('\nAll registered components:');
      const allComponents = window.componentInventory.getAllComponents();
      allComponents.forEach(comp => {
        console.log(`- ${comp.id}: ${comp.displayName}`);
      });
    }
  }
  
  // Test 2: Search for portfolio components
  console.log('\nTest 2: Portfolio Search');
  const portfolioComponents = window.componentInventory.searchComponents('portfolio');
  console.log(`Found ${portfolioComponents.length} portfolio-related components:`);
  portfolioComponents.forEach(comp => {
    console.log(`- ${comp.id}: ${comp.displayName} (${comp.quality})`);
  });
  
  // Test 3: Try to add GZC Portfolio to canvas
  console.log('\nTest 3: Adding to Canvas');
  console.log('Instructions:');
  console.log('1. Click the Edit button on Analytics tab');
  console.log('2. Click "Add Component"');
  console.log('3. Look for "GZC Portfolio" in the component list');
  console.log('4. Click it to add to the canvas');
  
  console.log('\n✨ Test complete! Check the component portal for GZC Portfolio.');
}

// Run the test
testGZCPortfolio();