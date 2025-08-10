import puppeteer from 'puppeteer';

(async () => {
  console.log('🧪 Testing multiple component addition in production...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 }
  });
  const page = await browser.newPage();
  
  try {
    // Go to production
    console.log('📍 Loading production app...');
    await page.goto('https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io');
    await page.waitForSelector('[data-testid="app-loaded"], .analytics-dashboard, .gzc-intel-app', { timeout: 10000 });
    console.log('✅ App loaded');

    // Wait for Analytics tab to be available
    await page.waitForSelector('button:has-text("Analytics")', { timeout: 5000 });
    
    // Right-click on Analytics tab to open context menu
    console.log('🖱️ Right-clicking Analytics tab...');
    const analyticsTab = await page.locator('button:has-text("Analytics")').first();
    await analyticsTab.click({ button: 'right' });
    
    // Wait for context menu and click "Enter Edit Mode"
    await page.waitForSelector('text=Enter Edit Mode', { timeout: 3000 });
    await page.click('text=Enter Edit Mode');
    console.log('✅ Entered edit mode');
    
    // Wait a moment for edit mode to activate
    await page.waitForTimeout(1000);
    
    // Function to add a component
    const addComponent = async (componentName, attempt) => {
      console.log(`\n🔄 Attempt ${attempt}: Adding ${componentName}...`);
      
      // Look for Add Component button (could be floating or in empty state)
      const addButtons = await page.$$('button:has-text("Add Component"), button:has-text("Add Your First Component")');
      if (addButtons.length === 0) {
        console.log('❌ No Add Component button found');
        return false;
      }
      
      console.log(`Found ${addButtons.length} add component buttons`);
      await addButtons[0].click();
      
      // Wait for component portal
      await page.waitForSelector('text=Component Library', { timeout: 3000 });
      console.log('✅ Component portal opened');
      
      // Click the specific component
      await page.waitForSelector(`button:has-text("${componentName}")`, { timeout: 3000 });
      await page.click(`button:has-text("${componentName}")`);
      console.log(`✅ Selected ${componentName}`);
      
      // Wait for portal to close and component to appear
      await page.waitForTimeout(2000);
      
      // Count components on canvas
      const components = await page.$$('.react-grid-item');
      console.log(`📊 Components on canvas: ${components.length}`);
      
      return components.length;
    };
    
    // Test adding first component
    const firstCount = await addComponent('Portfolio Manager', 1);
    
    if (firstCount === 0) {
      console.log('❌ First component failed to add');
      return;
    }
    
    // Test adding second component
    const secondCount = await addComponent('GZC Vol Surface', 2);
    
    console.log(`\n📊 Final Results:`);
    console.log(`   First component add: ${firstCount} total components`);
    console.log(`   Second component add: ${secondCount} total components`);
    
    if (secondCount > firstCount) {
      console.log('✅ Multiple components working correctly!');
    } else {
      console.log('❌ Multiple components NOT working - investigating...');
      
      // Check for any error messages
      const errors = await page.$$('.error, [class*="error"], [data-error]');
      if (errors.length > 0) {
        console.log(`Found ${errors.length} error elements`);
      }
      
      // Check console logs
      const logs = await page.evaluate(() => {
        return window.console._logs || 'No console logs captured';
      });
      console.log('Console logs:', logs);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    console.log('\n⏳ Keeping browser open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    await browser.close();
  }
})();