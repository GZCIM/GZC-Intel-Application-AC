const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true 
  });
  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    console.log('BROWSER LOG:', msg.text());
  });
  
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });

  await page.goto('http://localhost:9000');
  await page.waitForTimeout(2000);
  
  // Right-click on canvas to open context menu
  console.log('Right-clicking on canvas...');
  await page.click('#root', { button: 'right' });
  await page.waitForTimeout(1000);
  
  // Click "Enter Edit Mode" if visible
  const editModeButton = await page.$('text=Enter Edit Mode');
  if (editModeButton) {
    console.log('Clicking Enter Edit Mode...');
    await editModeButton.click();
    await page.waitForTimeout(1000);
    
    // Right-click again to get "Add Component" option
    await page.click('#root', { button: 'right' });
    await page.waitForTimeout(1000);
  }
  
  // Click "Add Component"
  const addComponentButton = await page.$('text=Add Component');
  if (addComponentButton) {
    console.log('Clicking Add Component...');
    await addComponentButton.click();
    await page.waitForTimeout(1000);
    
    // Select first component
    const firstComponent = await page.$('.component-card');
    if (firstComponent) {
      console.log('Selecting first component...');
      await firstComponent.click();
      await page.waitForTimeout(2000);
    }
  }
  
  console.log('Test complete. Check console output above.');
  await page.waitForTimeout(5000);
  await browser.close();
})();