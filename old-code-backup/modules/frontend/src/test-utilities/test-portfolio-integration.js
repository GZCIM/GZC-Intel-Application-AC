// Test Portfolio Integration in GZC Intel App
// Run this in the browser console

async function testPortfolioIntegration() {
  console.log('🧪 Testing Portfolio Integration...\n');
  
  // Test 1: Verify Portfolio component is registered
  console.log('Test 1: Component Registration');
  if (window.componentInventory) {
    const portfolio = window.componentInventory.getComponent('portfolio');
    if (portfolio) {
      console.log('✅ Portfolio component found:', {
        id: portfolio.id,
        displayName: portfolio.displayName,
        description: portfolio.description,
        defaultSize: portfolio.defaultSize
      });
    } else {
      console.log('❌ Portfolio component not found in inventory');
      return;
    }
  } else {
    console.log('❌ Component inventory not available');
    return;
  }
  
  // Test 2: Activate Edit mode on Analytics tab
  console.log('\nTest 2: Edit Mode Activation');
  const editButton = document.querySelector('button:has(svg)');
  if (editButton && editButton.textContent.includes('Edit')) {
    console.log('Clicking Edit button...');
    editButton.click();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const saveButton = document.querySelector('button:has(svg)');
    if (saveButton && saveButton.textContent.includes('Save')) {
      console.log('✅ Edit mode activated');
    }
  }
  
  // Test 3: Open Component Portal
  console.log('\nTest 3: Component Portal');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const addButton = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.includes('Add Component')
  );
  
  if (addButton) {
    console.log('Opening component portal...');
    addButton.click();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test 4: Look for Portfolio in modal
    const modal = document.querySelector('[style*="z-index: 10000"]');
    if (modal) {
      console.log('✅ Component portal opened');
      
      // Find Portfolio card
      const cards = modal.querySelectorAll('[style*="cursor: pointer"]');
      const portfolioCard = Array.from(cards).find(card => 
        card.textContent.includes('Portfolio')
      );
      
      if (portfolioCard) {
        console.log('✅ Portfolio component available in portal');
        console.log('Portfolio card content:', portfolioCard.textContent);
        
        // Test 5: Click Portfolio to add it
        console.log('\nTest 5: Adding Portfolio Component');
        portfolioCard.click();
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if portfolio was added to canvas
        const canvas = document.querySelector('.react-grid-layout');
        if (canvas && canvas.children.length > 0) {
          console.log('✅ Component added to canvas');
          console.log('Canvas now has', canvas.children.length, 'components');
          
          // Look for portfolio component
          const portfolioElement = Array.from(canvas.querySelectorAll('h2, h3, h4')).find(el =>
            el.textContent.includes('Portfolio')
          );
          
          if (portfolioElement) {
            console.log('✅ Portfolio component rendered successfully!');
          } else {
            console.log('⚠️ Portfolio component added but not visible');
          }
        }
      } else {
        console.log('❌ Portfolio component not found in modal');
        
        // Debug: List all available components
        console.log('\nAvailable components:');
        cards.forEach(card => {
          const title = card.querySelector('h4')?.textContent;
          if (title) console.log(' -', title);
        });
      }
    }
  } else {
    console.log('❌ Add Component button not found');
  }
  
  console.log('\n✨ Portfolio integration test complete!');
}

// Run the test
testPortfolioIntegration();