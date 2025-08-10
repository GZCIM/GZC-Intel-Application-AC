import puppeteer from 'puppeteer';

(async () => {
  console.log('🧪 Testing multiple components fix...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();
  
  // Simplified console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('WILL SET COMPONENTS TO') || 
        text.includes('components in storage') ||
        text.includes('Loading components from tab')) {
      console.log(`[LOG] ${text}`);
    }
  });
  
  try {
    console.log('1️⃣ Loading app...');
    await page.goto('http://localhost:9000');
    await page.waitForSelector('button', { timeout: 10000 });
    
    // Click Analytics tab
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const analyticsBtn = buttons.find(btn => btn.textContent?.includes('Analytics'));
      if (analyticsBtn) analyticsBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Enter edit mode via context menu
    console.log('2️⃣ Entering edit mode...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const analyticsBtn = buttons.find(btn => btn.textContent?.includes('Analytics'));
      if (analyticsBtn) {
        const event = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          view: window,
          button: 2
        });
        analyticsBtn.dispatchEvent(event);
      }
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const editModeItem = elements.find(el => 
        el.textContent?.trim() === 'Enter Edit Mode' && 
        !Array.from(el.children).length
      );
      if (editModeItem) editModeItem.click();
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Add first component
    console.log('3️⃣ Adding Portfolio Manager...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(btn => 
        btn.textContent?.includes('Add Component') || 
        btn.textContent?.includes('Add Your First Component')
      );
      if (addBtn) addBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const portfolioBtn = buttons.find(btn => 
        btn.textContent?.includes('Portfolio Manager')
      );
      if (portfolioBtn) portfolioBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    // Check first component
    let visibleComponents = await page.$$('.react-grid-item');
    console.log(`   ✓ Components visible: ${visibleComponents.length}`);
    
    // Add second component
    console.log('4️⃣ Adding Vol Surface...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(btn => 
        btn.textContent?.includes('Add Component')
      );
      if (addBtn) addBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const volBtn = elements.find(el => 
        (el.textContent?.includes('GZC Vol Surface') ||
         el.textContent?.includes('Bloomberg Volatility')) &&
        (el.tagName === 'BUTTON' || el.tagName === 'DIV' || el.tagName === 'H4')
      );
      if (volBtn) {
        if (volBtn.tagName === 'H4' || volBtn.tagName === 'P') {
          // Click parent div
          volBtn.closest('div[style*="cursor"]')?.click();
        } else {
          volBtn.click();
        }
      }
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    // Final check
    visibleComponents = await page.$$('.react-grid-item');
    console.log(`   ✓ Components visible: ${visibleComponents.length}`);
    
    const storage = await page.evaluate(() => {
      const layout = localStorage.getItem('gzc-intel-current-layout-default-user');
      if (layout) {
        const parsed = JSON.parse(layout);
        const analyticsTab = parsed.tabs.find(t => t.id === 'analytics');
        return analyticsTab?.components?.length || 0;
      }
      return 0;
    });
    
    console.log(`   ✓ Components in storage: ${storage}`);
    
    // Result
    console.log('\n📊 RESULT:');
    if (visibleComponents.length === 2 && storage === 2) {
      console.log('✅ SUCCESS! Multiple components working!');
    } else {
      console.log(`❌ ISSUE: ${visibleComponents.length} visible, ${storage} in storage`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    console.log('\n⏳ Keeping browser open for inspection...');
    await new Promise(r => setTimeout(r, 30000));
    await browser.close();
  }
})();