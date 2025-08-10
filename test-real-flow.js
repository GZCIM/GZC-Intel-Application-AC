const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  // Capture ALL console logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    console.log('[CONSOLE]:', text);
  });
  
  page.on('pageerror', err => {
    console.log('[ERROR]:', err.message);
  });

  await page.goto('http://localhost:9000', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#root', { timeout: 10000 });
  
  console.log('\n=== STARTING TEST FLOW ===\n');
  
  // Wait for app to stabilize
  await new Promise(r => setTimeout(r, 3000));
  
  // Find the main content area and right-click
  console.log('1. Right-clicking on main area...');
  await page.evaluate(() => {
    const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.querySelector('#root > div > div');
    if (main) {
      const rect = main.getBoundingClientRect();
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 200,
        clientY: rect.top + 200,
        button: 2
      });
      main.dispatchEvent(event);
    }
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Look for and click "Enter Edit Mode"
  console.log('2. Looking for "Enter Edit Mode"...');
  const enterEditClicked = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('*')).filter(el => 
      el.textContent && el.textContent.trim() === 'Enter Edit Mode'
    );
    if (items.length > 0) {
      items[0].click();
      return true;
    }
    return false;
  });
  
  console.log('   Enter Edit Mode clicked:', enterEditClicked);
  await new Promise(r => setTimeout(r, 1000));
  
  // Right-click again for "Add Component"
  console.log('3. Right-clicking again...');
  await page.evaluate(() => {
    const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.querySelector('#root > div > div');
    if (main) {
      const rect = main.getBoundingClientRect();
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 200,
        clientY: rect.top + 200,
        button: 2
      });
      main.dispatchEvent(event);
    }
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Click "Add Component"
  console.log('4. Looking for "Add Component"...');
  const addComponentClicked = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('*')).filter(el => 
      el.textContent && el.textContent.trim() === 'Add Component'
    );
    if (items.length > 0) {
      items[0].click();
      return true;
    }
    return false;
  });
  
  console.log('   Add Component clicked:', addComponentClicked);
  await new Promise(r => setTimeout(r, 2000));
  
  // Check if modal opened
  console.log('5. Checking for modal...');
  const modalExists = await page.evaluate(() => {
    return !!document.querySelector('[role="dialog"]') || 
           !!document.querySelector('.fixed.inset-0') ||
           Array.from(document.querySelectorAll('*')).some(el => 
             el.textContent && el.textContent.includes('Select a Component')
           );
  });
  
  console.log('   Modal exists:', modalExists);
  
  if (modalExists) {
    // Try to click the first component
    console.log('6. Clicking first component...');
    const componentClicked = await page.evaluate(() => {
      // Look for component cards
      const cards = Array.from(document.querySelectorAll('[class*="border"], [class*="card"], .cursor-pointer'))
        .filter(el => {
          const text = el.textContent || '';
          return text.includes('Portfolio') || text.includes('Chart') || text.includes('Analytics');
        });
      
      if (cards.length > 0) {
        console.log('Found component cards:', cards.length);
        cards[0].click();
        return true;
      }
      return false;
    });
    
    console.log('   Component clicked:', componentClicked);
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // Check final state
  console.log('\n7. Checking final state...');
  const finalState = await page.evaluate(() => {
    const components = document.querySelectorAll('.react-grid-item');
    const editMode = !!document.querySelector('[class*="edit-mode"]') || 
                     !!document.querySelector('[data-edit-mode="true"]');
    const modalStillOpen = !!document.querySelector('[role="dialog"]') || 
                           !!document.querySelector('.fixed.inset-0');
    
    return {
      componentCount: components.length,
      isInEditMode: editMode,
      modalStillOpen: modalStillOpen
    };
  });
  
  console.log('\n=== FINAL STATE ===');
  console.log('Components on canvas:', finalState.componentCount);
  console.log('Still in edit mode:', finalState.isInEditMode);
  console.log('Modal still open:', finalState.modalStillOpen);
  
  console.log('\n=== KEY LOGS ===');
  const keyLogs = logs.filter(log => 
    log.includes('ProfessionalHeader') || 
    log.includes('TabContextMenu') ||
    log.includes('DynamicCanvas') ||
    log.includes('BEFORE UPDATE') ||
    log.includes('AFTER UPDATE') ||
    log.includes('FULL TAB')
  );
  
  keyLogs.forEach(log => console.log(log));
  
  // Keep browser open for inspection
  console.log('\n=== TEST COMPLETE - Browser will stay open for 30 seconds ===');
  await new Promise(r => setTimeout(r, 30000));
  
  await browser.close();
})();