const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true 
  });
  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || type === 'warning') {
      console.log(`[${type.toUpperCase()}]`, text);
    } else if (text.includes('component') || text.includes('Component')) {
      console.log(`[${type}]`, text);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.log('[PAGE ERROR]', error.message);
  });

  // Navigate to local dev server
  console.log('Opening http://localhost:9000...');
  await page.goto('http://localhost:9000', { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });

  console.log('Page loaded. Waiting 3 seconds...');
  await page.waitForTimeout(3000);

  // Try to open component portal
  console.log('Looking for edit mode or component portal...');
  
  // Right click to enter edit mode
  await page.mouse.click(400, 300, { button: 'right' });
  await page.waitForTimeout(1000);
  
  // Look for component portal or add button
  const addButton = await page.$('[title*="Add Component"]') || 
                    await page.$('button:has-text("Add Component")') ||
                    await page.$('button:has-text("Add")');
  
  if (addButton) {
    console.log('Found Add Component button, clicking...');
    await addButton.click();
    await page.waitForTimeout(2000);
    
    // Try to click on a component
    const component = await page.$('.component-card') || 
                     await page.$('[data-component-id]') ||
                     await page.$('div:has-text("Portfolio")');
    
    if (component) {
      console.log('Found component, clicking...');
      await component.click();
      await page.waitForTimeout(3000);
    }
  }

  console.log('Test complete. Check console for errors.');
  await page.waitForTimeout(5000);
  
  await browser.close();
})();