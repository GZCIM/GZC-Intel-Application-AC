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
    if (text.includes('ProfessionalHeader') || 
        text.includes('TabContextMenu') ||
        text.includes('DynamicCanvas') ||
        text.includes('BEFORE') ||
        text.includes('AFTER') ||
        text.includes('FULL TAB') ||
        text.includes('Updating tab')) {
      console.log('[LOG]:', text);
    }
  });

  await page.goto('http://localhost:9000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('=== CORRECT TEST FLOW ===\n');
  
  // RIGHT-CLICK ON THE TAB BUTTON (NOT THE CANVAS!)
  console.log('1. Right-clicking on Analytics TAB BUTTON...');
  const tabRightClicked = await page.evaluate(() => {
    // Find the tab button that says "Analytics"
    const tabs = Array.from(document.querySelectorAll('button, div')).filter(el => 
      el.textContent && el.textContent.trim() === 'Analytics'
    );
    
    if (tabs.length > 0) {
      const tab = tabs[0];
      const rect = tab.getBoundingClientRect();
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        button: 2
      });
      tab.dispatchEvent(event);
      return true;
    }
    return false;
  });
  
  console.log('   Tab right-clicked:', tabRightClicked);
  await new Promise(r => setTimeout(r, 1000));
  
  // Click "Enter Edit Mode"
  console.log('2. Clicking "Enter Edit Mode"...');
  const enterEditClicked = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.textContent || '';
      return text.trim() === 'Enter Edit Mode' && el.offsetParent !== null;
    });
    
    if (items.length > 0) {
      console.log('Found Enter Edit Mode button');
      items[0].click();
      return true;
    }
    return false;
  });
  
  console.log('   Enter Edit Mode clicked:', enterEditClicked);
  await new Promise(r => setTimeout(r, 1000));
  
  // Right-click on tab AGAIN
  console.log('3. Right-clicking on Analytics tab again...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button, div')).filter(el => 
      el.textContent && el.textContent.trim() === 'Analytics'
    );
    
    if (tabs.length > 0) {
      const tab = tabs[0];
      const rect = tab.getBoundingClientRect();
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        button: 2
      });
      tab.dispatchEvent(event);
    }
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Click "Add Component"
  console.log('4. Clicking "Add Component"...');
  const addComponentClicked = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.textContent || '';
      return text.trim() === 'Add Component' && el.offsetParent !== null;
    });
    
    if (items.length > 0) {
      console.log('Found Add Component button');
      items[0].click();
      return true;
    }
    return false;
  });
  
  console.log('   Add Component clicked:', addComponentClicked);
  await new Promise(r => setTimeout(r, 2000));
  
  // Check if modal opened and click first component
  console.log('5. Looking for components in modal...');
  const componentClicked = await page.evaluate(() => {
    // Look for the modal
    const modal = document.querySelector('[role="dialog"]') || 
                  document.querySelector('.fixed.inset-0');
    
    if (!modal) {
      console.log('No modal found');
      return false;
    }
    
    // Find component cards
    const cards = Array.from(document.querySelectorAll('.cursor-pointer'))
      .filter(el => {
        const text = el.textContent || '';
        return (text.includes('Portfolio') || 
                text.includes('Chart') || 
                text.includes('Quote') ||
                text.includes('Analytics')) &&
               el.offsetParent !== null;
      });
    
    if (cards.length > 0) {
      console.log('Found', cards.length, 'component cards');
      console.log('Clicking:', cards[0].textContent);
      cards[0].click();
      return true;
    }
    
    console.log('No component cards found');
    return false;
  });
  
  console.log('   Component clicked:', componentClicked);
  await new Promise(r => setTimeout(r, 3000));
  
  // Check final state
  const finalState = await page.evaluate(() => {
    const components = document.querySelectorAll('.react-grid-item');
    const editMode = document.body.innerHTML.includes('edit-mode') || 
                     document.body.innerHTML.includes('Exit Edit Mode');
    
    return {
      componentCount: components.length,
      stillInEditMode: editMode
    };
  });
  
  console.log('\n=== RESULT ===');
  console.log('Components on canvas:', finalState.componentCount);
  console.log('Still in edit mode:', finalState.stillInEditMode);
  
  if (finalState.componentCount > 0 && finalState.stillInEditMode) {
    console.log('✅ SUCCESS: Component added and still in edit mode!');
  } else if (finalState.componentCount > 0 && !finalState.stillInEditMode) {
    console.log('⚠️  ISSUE: Component added but EXITED edit mode');
  } else {
    console.log('❌ FAILED: No component added');
  }
  
  console.log('\nBrowser stays open for inspection...');
  await new Promise(r => setTimeout(r, 30000));
  
  await browser.close();
})();