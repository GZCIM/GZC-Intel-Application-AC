import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    console.log(`CONSOLE ${msg.type()}: ${msg.text()}`);
  });
  
  // Listen for errors
  page.on('error', err => {
    console.log(`ERROR: ${err.message}`);
  });
  
  page.on('pageerror', err => {
    console.log(`PAGE ERROR: ${err.message}`);
  });
  
  try {
    await page.goto('http://localhost:3500', { waitUntil: 'networkidle0', timeout: 10000 });
    console.log('✅ Page loaded successfully');
    
    // Wait a bit more for React to fully initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if footer P&L is present
    try {
      const pnlElements = await page.$eval('footer', footer => {
        return footer.textContent.includes('Month to Date P&L') && footer.textContent.includes('Daily P&L');
      });
      
      console.log(`✅ P&L in footer: ${pnlElements ? 'PRESENT' : 'MISSING'}`);
    } catch (e) {
      console.log(`❌ Footer not found: ${e.message}`);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  await browser.close();
})();