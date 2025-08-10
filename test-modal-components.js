const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  // Capture ALL console logs
  page.on('console', msg => {
    const text = msg.text();
    console.log('[CONSOLE]:', text);
  });

  await page.goto('http://localhost:9000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('\n=== TESTING COMPONENT MODAL ===\n');
  
  // 1. Enter edit mode first
  console.log('1. Entering edit mode...');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(el => 
      el.textContent && el.textContent.trim() === 'Analytics'
    );
    if (tab) {
      tab.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 2
      }));
    }
  });
  await new Promise(r => setTimeout(r, 1000));
  
  await page.evaluate(() => {
    const item = Array.from(document.querySelectorAll('*')).find(el => 
      el.textContent === 'Enter Edit Mode'
    );
    if (item) item.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  
  // 2. Open Add Component modal
  console.log('\n2. Opening Add Component modal...');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(el => 
      el.textContent && el.textContent.trim() === 'Analytics'
    );
    if (tab) {
      tab.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 2
      }));
    }
  });
  await new Promise(r => setTimeout(r, 1000));
  
  await page.evaluate(() => {
    const item = Array.from(document.querySelectorAll('*')).find(el => 
      el.textContent === 'Add Component'
    );
    if (item) item.click();
  });
  await new Promise(r => setTimeout(r, 3000));
  
  // 3. Check what's in the modal
  console.log('\n3. Analyzing modal contents...');
  const modalInfo = await page.evaluate(() => {
    // Check for modal
    const modal = document.querySelector('[role="dialog"]') || 
                  Array.from(document.querySelectorAll('div')).find(el => {
                    const style = window.getComputedStyle(el);
                    return style.position === 'fixed' && 
                           style.zIndex > 1000 &&
                           el.offsetParent !== null;
                  });
    
    // Look for the grid container
    const gridContainer = Array.from(document.querySelectorAll('div')).find(el => {
      const style = window.getComputedStyle(el);
      return style.display === 'grid' && 
             style.gridTemplateColumns.includes('minmax');
    });
    
    // Find any clickable cards
    const cards = Array.from(document.querySelectorAll('div')).filter(el => {
      const style = window.getComputedStyle(el);
      return style.cursor === 'pointer' && 
             el.offsetParent !== null &&
             (el.textContent.includes('Portfolio') || 
              el.textContent.includes('Analytics') ||
              el.textContent.includes('Chart'));
    });
    
    // Get all text content from the modal
    let modalText = '';
    if (modal) {
      modalText = modal.textContent;
    }
    
    return {
      hasModal: !!modal,
      hasGrid: !!gridContainer,
      cardCount: cards.length,
      modalText: modalText.substring(0, 500),
      hasNoComponentsMessage: modalText.includes('No components available')
    };
  });
  
  console.log('\nModal analysis:', JSON.stringify(modalInfo, null, 2));
  
  // 4. Try to check window.componentInventory
  console.log('\n4. Checking componentInventory...');
  const inventoryInfo = await page.evaluate(() => {
    if (window.componentInventory) {
      const components = window.componentInventory.getAllComponents();
      return {
        hasInventory: true,
        componentCount: components.length,
        componentIds: components.map(c => c.id)
      };
    }
    return { hasInventory: false };
  });
  
  console.log('Inventory info:', inventoryInfo);
  
  console.log('\n=== Browser stays open for inspection ===');
  await new Promise(r => setTimeout(r, 30000));
  
  await browser.close();
})();