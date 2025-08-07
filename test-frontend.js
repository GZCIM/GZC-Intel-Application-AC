const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => console.log('Browser console:', msg.text()));
  page.on('pageerror', error => console.log('Browser error:', error.message));
  
  await page.goto('http://localhost:8080', {waitUntil: 'networkidle2'});
  
  const content = await page.content();
  console.log('Page title:', await page.title());
  console.log('Body content length:', content.length);
  
  await browser.close();
})();
