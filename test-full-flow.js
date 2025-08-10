const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('DynamicCanvas') || 
        text.includes('ProfessionalHeader') ||
        text.includes('Component selected') ||
        text.includes('AFTER UPDATE')) {
      console.log('[LOG]:', text);
    }
  });

  await page.goto('http://localhost:9000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('=== FULL ADD COMPONENT TEST ===\n');
  
  // Step 1: Right-click Analytics tab
  console.log('1. Right-clicking Analytics tab...');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(el => 
      el.textContent && el.textContent.trim() === 'Analytics'
    );
    if (tab) {
      const rect = tab.getBoundingClientRect();
      tab.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        button: 2
      }));
    }
  });
  await new Promise(r => setTimeout(r, 1000));
  
  // Step 2: Click "Enter Edit Mode"
  console.log('2. Clicking "Enter Edit Mode"...');
  const editModeClicked = await page.evaluate(() => {
    const item = Array.from(document.querySelectorAll('*')).find(el => 
      el.textContent === 'Enter Edit Mode' && el.offsetParent !== null
    );
    if (item) {
      item.click();
      return true;
    }
    return false;
  });
  console.log('   Clicked:', editModeClicked);
  await new Promise(r => setTimeout(r, 2000));
  
  // Step 3: Right-click again to get "Add Component"
  console.log('\n3. Right-clicking Analytics tab again...');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(el => 
      el.textContent && el.textContent.trim() === 'Analytics'
    );
    if (tab) {
      const rect = tab.getBoundingClientRect();
      tab.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        button: 2
      }));
    }
  });
  await new Promise(r => setTimeout(r, 1000));
  
  // Step 4: Click "Add Component"
  console.log('4. Clicking "Add Component"...');
  const addComponentClicked = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('*')).filter(el => 
      el.textContent === 'Add Component' && el.offsetParent !== null
    );
    if (items.length > 0) {
      items[0].click();
      return true;
    }
    return false;
  });
  console.log('   Clicked:', addComponentClicked);
  await new Promise(r => setTimeout(r, 2000));
  
  // Step 5: Check if modal opened
  console.log('\n5. Checking for component modal...');
  const modalInfo = await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"]') || 
                  document.querySelector('.fixed.inset-0');
    const title = Array.from(document.querySelectorAll('*')).find(el => 
      el.textContent === 'Select a Component'
    );
    const componentCards = Array.from(document.querySelectorAll('.cursor-pointer')).filter(el => {
      const text = el.textContent || '';
      return text.includes('Analytics') || 
             text.includes('Chart') || 
             text.includes('Portfolio');
    });
    
    return {
      hasModal: !!modal,
      hasTitle: !!title,
      componentCount: componentCards.length
    };
  });
  console.log('   Modal info:', modalInfo);
  
  // Step 6: Click first component
  if (modalInfo.componentCount > 0) {
    console.log('\n6. Clicking first component...');
    const componentClicked = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.cursor-pointer')).filter(el => {
        const text = el.textContent || '';
        return text.includes('Analytics') || 
               text.includes('Chart') || 
               text.includes('Portfolio');
      });
      
      if (cards.length > 0) {
        console.log('Clicking component:', cards[0].textContent.trim());
        cards[0].click();
        return cards[0].textContent.trim();
      }
      return null;
    });
    console.log('   Clicked component:', componentClicked);
    await new Promise(r => setTimeout(r, 3000));
  }
  
  // Step 7: Check final state
  console.log('\n7. Checking final state...');
  const finalState = await page.evaluate(() => {
    const gridItems = document.querySelectorAll('.react-grid-item');
    const canvas = document.querySelector('[class*="DynamicCanvas"]') || 
                   document.querySelector('main');
    const editModeIndicator = Array.from(document.querySelectorAll('*')).find(el => 
      el.textContent === 'Save & Exit Edit'
    );
    
    return {
      componentCount: gridItems.length,
      hasCanvas: !!canvas,
      stillInEditMode: !!editModeIndicator
    };
  });
  
  console.log('\n=== FINAL RESULT ===');
  console.log('Components on canvas:', finalState.componentCount);
  console.log('Still in edit mode:', finalState.stillInEditMode);
  
  if (finalState.componentCount > 0 && finalState.stillInEditMode) {
    console.log('✅ SUCCESS: Component added and still in edit mode!');
  } else if (finalState.componentCount > 0) {
    console.log('⚠️  PARTIAL: Component added but exited edit mode');
  } else {
    console.log('❌ FAILED: No component added');
  }
  
  console.log('\nBrowser stays open for inspection...');
  await new Promise(r => setTimeout(r, 30000));
  
  await browser.close();
})();