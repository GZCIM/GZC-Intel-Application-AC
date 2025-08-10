const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--window-size=1400,900']
  });
  const page = await browser.newPage();
  
  console.log('Opening localhost:9000...');
  await page.goto('http://localhost:9000', { waitUntil: 'networkidle2' });
  await page.waitForTimeout(2000);
  
  // Check component inventory
  const inventoryStatus = await page.evaluate(() => {
    if (window.componentInventory) {
      const all = window.componentInventory.getAllComponents();
      return {
        hasInventory: true,
        count: all ? all.length : 0,
        components: all ? all.map(c => ({ id: c.id, name: c.displayName })) : []
      };
    }
    return { hasInventory: false };
  });
  console.log('Component Inventory:', JSON.stringify(inventoryStatus, null, 2));
  
  // Find a tab to right-click
  const tabs = await page.$$('[role="tab"]');
  console.log('Found tabs:', tabs.length);
  
  if (tabs.length > 0) {
    // Right-click on first tab
    const tabBox = await tabs[0].boundingBox();
    if (tabBox) {
      console.log('Right-clicking on tab at:', tabBox.x + tabBox.width/2, tabBox.y + tabBox.height/2);
      await page.mouse.click(tabBox.x + tabBox.width/2, tabBox.y + tabBox.height/2, { button: 'right' });
      await page.waitForTimeout(1000);
      
      // Look for context menu
      const menuVisible = await page.evaluate(() => {
        const menus = document.querySelectorAll('[data-testid="tab-context-menu"], [role="menu"], div[style*="position: fixed"]');
        return menus.length > 0;
      });
      console.log('Context menu visible:', menuVisible);
      
      if (menuVisible) {
        // Click on Add Component
        const addButton = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button, div[role="menuitem"]'));
          return buttons.find(b => b.textContent?.includes('Add Component'));
        });
        
        if (addButton) {
          console.log('Clicking Add Component...');
          await addButton.click();
          await page.waitForTimeout(1500);
          
          // Check if modal opened
          const modalVisible = await page.evaluate(() => {
            const modal = document.querySelector('[data-testid="component-portal-modal"], .component-portal-modal, div[style*="position: fixed"][style*="z-index"]');
            return !!modal;
          });
          console.log('Modal visible:', modalVisible);
          
          if (modalVisible) {
            // Check for components in modal
            const modalComponents = await page.evaluate(() => {
              const cards = document.querySelectorAll('.component-card, [data-component-id]');
              return Array.from(cards).map(c => ({
                id: c.getAttribute('data-component-id') || 'unknown',
                text: c.textContent?.substring(0, 50)
              }));
            });
            console.log('Components in modal:', modalComponents);
            
            // Try clicking first component
            if (modalComponents.length > 0) {
              const firstCard = await page.$('.component-card, [data-component-id]');
              if (firstCard) {
                console.log('Clicking first component card...');
                await firstCard.click();
                await page.waitForTimeout(2000);
                
                // Check if component was added
                const canvasComponents = await page.evaluate(() => {
                  const items = document.querySelectorAll('.react-grid-item');
                  return items.length;
                });
                console.log('Components on canvas after click:', canvasComponents);
              }
            }
          }
        }
      }
    }
  }
  
  console.log('\n=== Test Complete ===');
  await page.waitForTimeout(3000);
  await browser.close();
})();