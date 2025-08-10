import puppeteer from 'puppeteer';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--window-size=1400,900']
  });
  const page = await browser.newPage();
  
  // Capture console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || type === 'warning') {
      consoleMessages.push(`[${type.toUpperCase()}] ${text}`);
    }
  });
  
  page.on('pageerror', error => {
    consoleMessages.push(`[PAGE ERROR] ${error.message}`);
  });
  
  console.log('Opening localhost:9000...');
  await page.goto('http://localhost:9000', { waitUntil: 'networkidle2' });
  await sleep(2000);
  
  // Try to simulate the user flow
  console.log('\n1. Looking for Analytics tab...');
  const hasAnalyticsTab = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    return tabs.some(t => t.textContent?.includes('Analytics'));
  });
  console.log('   Analytics tab found:', hasAnalyticsTab);
  
  // Check current tab content
  const currentTab = await page.evaluate(() => {
    const activeTab = document.querySelector('[role="tabpanel"]');
    if (activeTab) {
      const hasCanvas = activeTab.querySelector('.react-grid-layout');
      const hasComponents = activeTab.querySelectorAll('.react-grid-item').length;
      return {
        hasContent: true,
        hasCanvas,
        componentCount: hasComponents
      };
    }
    return { hasContent: false };
  });
  console.log('   Current tab status:', currentTab);
  
  // Check if edit mode controls exist
  const editControls = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return {
      hasEditButton: buttons.some(b => b.textContent?.includes('Edit')),
      hasAddComponentButton: buttons.some(b => b.textContent?.includes('Add Component'))
    };
  });
  console.log('   Edit controls:', editControls);
  
  // Check component inventory directly
  const inventoryCheck = await page.evaluate(() => {
    if (window.componentInventory) {
      const all = window.componentInventory.getAllComponents();
      const search = window.componentInventory.searchComponents('');
      return {
        getAllWorks: !!all,
        searchWorks: !!search,
        getAllCount: all?.length || 0,
        searchCount: search?.length || 0,
        componentsMatch: JSON.stringify(all) === JSON.stringify(search)
      };
    }
    return { hasInventory: false };
  });
  console.log('\n2. Component Inventory check:', inventoryCheck);
  
  // Try to open context menu programmatically
  console.log('\n3. Attempting to open context menu...');
  const menuOpened = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    const analyticsTab = tabs.find(t => t.textContent?.includes('Analytics'));
    if (analyticsTab) {
      // Dispatch context menu event
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: 100,
        clientY: 100
      });
      analyticsTab.dispatchEvent(event);
      
      // Check if menu appeared
      return new Promise(resolve => {
        setTimeout(() => {
          const menu = document.querySelector('[data-testid="tab-context-menu"], [role="menu"]');
          resolve(!!menu);
        }, 500);
      });
    }
    return false;
  });
  console.log('   Context menu opened:', menuOpened);
  
  if (consoleMessages.length > 0) {
    console.log('\n⚠️ Console messages:');
    consoleMessages.forEach(msg => console.log('  ', msg));
  } else {
    console.log('\n✅ No console errors');
  }
  
  console.log('\n=== Check Complete ===');
  await sleep(3000);
  await browser.close();
})();