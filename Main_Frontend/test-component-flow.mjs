import puppeteer from 'puppeteer';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--window-size=1400,900']
  });
  const page = await browser.newPage();
  
  console.log('Opening localhost:9000...');
  await page.goto('http://localhost:9000', { waitUntil: 'networkidle2' });
  await sleep(2000);
  
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
  
  // Right-click on the Analytics tab
  const analyticsTab = await page.evaluateHandle(() => {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    return tabs.find(t => t.textContent?.includes('Analytics'));
  });
  
  if (analyticsTab) {
    console.log('Found Analytics tab, right-clicking...');
    try {
      await analyticsTab.click({ button: 'right' });
      await sleep(1000);
      
      // Click Add Component in the context menu
      const addComponentBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => b.textContent?.includes('Add Component'));
      });
      
      if (addComponentBtn) {
        console.log('Clicking Add Component...');
        await addComponentBtn.click();
        await sleep(1500);
        
        // Check if modal opened and has components
        const modalStatus = await page.evaluate(() => {
          const modal = document.querySelector('.component-portal-modal, [data-testid="component-portal-modal"]');
          if (!modal) {
            // Check for any fixed positioned modal-like element
            const fixedElements = Array.from(document.querySelectorAll('div[style*="position: fixed"]'));
            const modalLike = fixedElements.find(el => {
              const style = window.getComputedStyle(el);
              return style.zIndex === '10000' || el.textContent?.includes('Component Portal');
            });
            if (modalLike) {
              const cards = modalLike.querySelectorAll('[style*="cursor: pointer"]');
              return {
                modalFound: true,
                componentCount: cards.length,
                firstComponentText: cards[0]?.textContent?.substring(0, 50)
              };
            }
          }
          return { modalFound: false };
        });
        
        console.log('Modal status:', modalStatus);
        
        if (modalStatus.modalFound && modalStatus.componentCount > 0) {
          // Click the Portfolio component card specifically
          const clicked = await page.evaluate(() => {
            const fixedElements = Array.from(document.querySelectorAll('div[style*="position: fixed"]'));
            const modal = fixedElements.find(el => {
              const style = window.getComputedStyle(el);
              return style.zIndex === '10000';
            });
            
            if (modal) {
              const cards = modal.querySelectorAll('[style*="cursor: pointer"]');
              const portfolioCard = Array.from(cards).find(c => c.textContent?.includes('Portfolio'));
              if (portfolioCard) {
                console.log('Found Portfolio card, clicking...');
                portfolioCard.click();
                return true;
              }
            }
            return false;
          });
          
          if (clicked) {
            console.log('Clicked Portfolio component');
            await sleep(3000);
            
            // Check if component was added to canvas
            const canvasStatus = await page.evaluate(() => {
              const gridItems = document.querySelectorAll('.react-grid-item');
              const errorMessages = document.querySelectorAll('[style*="color: red"], [style*="color: #f44336"]');
              return {
                componentCount: gridItems.length,
                components: Array.from(gridItems).map(item => ({
                  id: item.getAttribute('data-grid-id') || 'unknown',
                  hasContent: item.children.length > 0,
                  innerText: item.textContent?.substring(0, 100)
                })),
                errors: Array.from(errorMessages).map(e => e.textContent)
              };
            });
            
            console.log('Canvas status after adding component:', canvasStatus);
            
            // Check console for errors
            const consoleErrors = await page.evaluate(() => {
              const errors = [];
              const originalError = console.error;
              console.error = (...args) => {
                errors.push(args.join(' '));
                originalError(...args);
              };
              return errors;
            });
            
            if (consoleErrors.length > 0) {
              console.log('Console errors detected:', consoleErrors);
            }
          }
        }
      }
    } catch (e) {
      console.log('Error clicking tab:', e.message);
    }
  }
  
  console.log('\n=== Test Complete ===');
  await sleep(5000);
  await browser.close();
})();