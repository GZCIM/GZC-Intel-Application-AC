const puppeteer = require('puppeteer');

(async () => {
  console.log('Starting automated test for component add feature...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Capture console logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    if (text.includes('ProfessionalHeader') || 
        text.includes('TabContextMenu') ||
        text.includes('DynamicCanvas') || 
        text.includes('editMode') ||
        text.includes('Updating tab')) {
      console.log('[RELEVANT LOG]:', text);
    }
  });
  
  page.on('pageerror', err => {
    console.log('[PAGE ERROR]:', err.message);
  });

  try {
    console.log('1. Navigating to application...');
    await page.goto('https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('2. Waiting for page to load...');
    await new Promise(r => setTimeout(r, 3000));
    
    // Find the Analytics tab area
    const analyticsTab = await page.$('[role="tabpanel"]');
    if (!analyticsTab) {
      console.log('ERROR: Could not find tab panel');
      await browser.close();
      return;
    }
    
    console.log('3. Right-clicking on the canvas to open context menu...');
    const box = await analyticsTab.boundingBox();
    await page.mouse.click(box.x + 100, box.y + 100, { button: 'right' });
    await new Promise(r => setTimeout(r, 1000));
    
    // Check if we need to enter edit mode first
    const enterEditMode = await page.evaluate(() => {
      const menuItems = Array.from(document.querySelectorAll('div'));
      return menuItems.find(el => el.textContent === 'Enter Edit Mode');
    });
    
    if (enterEditMode) {
      console.log('4. Clicking "Enter Edit Mode"...');
      await page.evaluate(() => {
        const menuItems = Array.from(document.querySelectorAll('div'));
        const editModeItem = menuItems.find(el => el.textContent === 'Enter Edit Mode');
        if (editModeItem) editModeItem.click();
      });
      await new Promise(r => setTimeout(r, 1000));
      
      // Right-click again to get the Add Component option
      console.log('5. Right-clicking again for "Add Component" option...');
      await page.mouse.click(box.x + 100, box.y + 100, { button: 'right' });
      await new Promise(r => setTimeout(r, 1000));
    }
    
    // Click Add Component
    console.log('6. Looking for "Add Component" option...');
    const addComponentClicked = await page.evaluate(() => {
      const menuItems = Array.from(document.querySelectorAll('div'));
      const addItem = menuItems.find(el => el.textContent === 'Add Component');
      if (addItem) {
        addItem.click();
        return true;
      }
      return false;
    });
    
    if (!addComponentClicked) {
      console.log('ERROR: Could not find "Add Component" menu item');
      console.log('Available menu items:', await page.evaluate(() => {
        return Array.from(document.querySelectorAll('div')).map(el => el.textContent).filter(t => t && t.length < 50);
      }));
    } else {
      console.log('7. "Add Component" clicked, waiting for modal...');
      await new Promise(r => setTimeout(r, 2000));
      
      // Check if modal opened
      const modalExists = await page.evaluate(() => {
        return !!document.querySelector('[role="dialog"]') || 
               !!document.querySelector('.modal') ||
               !!document.querySelector('[class*="modal"]');
      });
      
      if (modalExists) {
        console.log('8. Modal opened successfully! Looking for components...');
        
        // Try to click first component
        const componentClicked = await page.evaluate(() => {
          const cards = document.querySelectorAll('[class*="component-card"], [class*="card"], .cursor-pointer');
          if (cards.length > 0) {
            cards[0].click();
            return true;
          }
          return false;
        });
        
        if (componentClicked) {
          console.log('9. Component selected!');
          await new Promise(r => setTimeout(r, 2000));
          
          // Check if we're still in edit mode
          const stillInEditMode = await page.evaluate(() => {
            const canvas = document.querySelector('[class*="edit-mode"], [data-edit-mode="true"]');
            return !!canvas;
          });
          
          console.log('10. Edit mode status after component add:', stillInEditMode ? 'STILL IN EDIT MODE ✅' : 'EXITED EDIT MODE ❌');
          
          // Check if component was added
          const componentCount = await page.evaluate(() => {
            return document.querySelectorAll('[class*="react-grid-item"]').length;
          });
          
          console.log('11. Number of components on canvas:', componentCount);
        } else {
          console.log('ERROR: Could not find any components to click');
        }
      } else {
        console.log('ERROR: Modal did not open');
      }
    }
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('Check the browser window to see the final state');
    
    // Keep browser open for manual inspection
    await new Promise(r => setTimeout(r, 10000));
    
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    await browser.close();
  }
})();