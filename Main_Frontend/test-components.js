// Test script to verify component loading
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:9000');
  await page.waitForTimeout(2000);
  
  // Check if components are in the inventory
  const result = await page.evaluate(() => {
    if (window.componentInventory) {
      const all = window.componentInventory.getAllComponents();
      const search = window.componentInventory.searchComponents('');
      return {
        hasInventory: true,
        allCount: all ? all.length : 0,
        searchCount: search ? search.length : 0,
        components: all ? all.map(c => ({ id: c.id, name: c.displayName })) : []
      };
    }
    return { hasInventory: false };
  });
  
  console.log('Component Inventory Status:', result);
  
  // Try to right-click on a tab
  const tabs = await page.$$('[role="tab"], button');
  console.log('Found tabs/buttons:', tabs.length);
  
  if (tabs.length > 0) {
    // Right-click on first tab
    await tabs[0].click({ button: 'right' });
    await page.waitForTimeout(1000);
    
    // Look for context menu
    const contextMenu = await page.$('[role="menu"], [data-testid="context-menu"], div[style*="position: fixed"]');
    console.log('Context menu appeared:', !!contextMenu);
  }
  
  await browser.close();
})();