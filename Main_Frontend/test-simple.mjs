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
  
  // Check inventory
  const inventory = await page.evaluate(() => {
    if (window.componentInventory) {
      const all = window.componentInventory.getAllComponents();
      return all ? all.map(c => ({ id: c.id, name: c.displayName })) : [];
    }
    return [];
  });
  console.log('Components available:', inventory);
  
  // Right-click on Analytics tab using coordinates
  const tabClicked = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    const analyticsTab = tabs.find(t => t.textContent?.includes('Analytics'));
    if (analyticsTab) {
      const rect = analyticsTab.getBoundingClientRect();
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
      });
      analyticsTab.dispatchEvent(event);
      return true;
    }
    return false;
  });
  
  console.log('Tab right-clicked:', tabClicked);
  await sleep(1000);
  
  // Click Add Component button
  const addClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const addBtn = buttons.find(b => b.textContent?.includes('Add Component'));
    if (addBtn) {
      addBtn.click();
      return true;
    }
    return false;
  });
  
  console.log('Add Component clicked:', addClicked);
  await sleep(1500);
  
  // Check modal and click Portfolio
  const componentAdded = await page.evaluate(() => {
    // Find modal
    const fixedElements = Array.from(document.querySelectorAll('div[style*="position: fixed"]'));
    const modal = fixedElements.find(el => {
      const style = window.getComputedStyle(el);
      return style.zIndex === '10000';
    });
    
    if (modal) {
      const cards = modal.querySelectorAll('div[style*="cursor: pointer"]');
      console.log('Found', cards.length, 'component cards');
      
      // Find and click Portfolio
      const portfolioCard = Array.from(cards).find(c => 
        c.textContent?.includes('Portfolio Dashboard'));
      
      if (portfolioCard) {
        portfolioCard.click();
        return { clicked: true, cardText: portfolioCard.textContent?.substring(0, 50) };
      }
      
      // If not found, click first card
      if (cards.length > 0) {
        cards[0].click();
        return { clicked: true, cardText: cards[0].textContent?.substring(0, 50) };
      }
    }
    return { clicked: false };
  });
  
  console.log('Component selection:', componentAdded);
  await sleep(3000);
  
  // Check canvas for components
  const canvasStatus = await page.evaluate(() => {
    const gridItems = document.querySelectorAll('.react-grid-item');
    const canvas = document.querySelector('.react-grid-layout');
    return {
      hasCanvas: !!canvas,
      componentCount: gridItems.length,
      components: Array.from(gridItems).slice(0, 3).map(item => ({
        hasContent: item.children.length > 0,
        firstChild: item.children[0]?.tagName,
        text: item.textContent?.substring(0, 50)
      }))
    };
  });
  
  console.log('\nFinal canvas status:', JSON.stringify(canvasStatus, null, 2));
  
  // Check for any errors
  const errors = await page.evaluate(() => {
    const errorElements = Array.from(document.querySelectorAll('[style*="color: red"], .error'));
    return errorElements.map(e => e.textContent?.substring(0, 100));
  });
  
  if (errors.length > 0) {
    console.log('Errors found:', errors);
  }
  
  console.log('\n=== Test Complete ===');
  await sleep(5000);
  await browser.close();
})();