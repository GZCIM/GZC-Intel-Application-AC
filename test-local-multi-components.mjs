import puppeteer from 'puppeteer';

(async () => {
  console.log('🧪 Testing multiple component addition locally...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    devtools: true // Open devtools to see console
  });
  
  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('DynamicCanvas') || text.includes('UPDATE TAB') || text.includes('component')) {
      console.log(`[CONSOLE] ${text}`);
    }
  });
  
  try {
    // Go to local dev
    console.log('📍 Loading local dev app...');
    await page.goto('http://localhost:9000');
    await page.waitForSelector('button', { timeout: 10000 });
    console.log('✅ App loaded\n');

    // Find Analytics tab
    const analyticsTab = await page.$('button:has-text("Analytics")');
    if (!analyticsTab) {
      console.log('❌ Analytics tab not found');
      return;
    }
    
    // Right-click to enter edit mode
    console.log('🖱️ Right-clicking Analytics tab...');
    await analyticsTab.click({ button: 'right' });
    await page.waitForTimeout(500);
    
    // Click "Enter Edit Mode"
    const editModeBtn = await page.$('text=Enter Edit Mode');
    if (editModeBtn) {
      await editModeBtn.click();
      console.log('✅ Entered edit mode\n');
    }
    
    await page.waitForTimeout(1000);
    
    // Function to check localStorage
    const checkStorage = async () => {
      const storage = await page.evaluate(() => {
        const layout = localStorage.getItem('gzc-intel-current-layout-default-user');
        if (layout) {
          const parsed = JSON.parse(layout);
          const analyticsTab = parsed.tabs.find(t => t.id === 'analytics');
          return {
            components: analyticsTab?.components || [],
            editMode: analyticsTab?.editMode
          };
        }
        return null;
      });
      return storage;
    };
    
    // Check initial state
    console.log('📊 Initial state:');
    let state = await checkStorage();
    console.log('  Components:', state?.components?.length || 0);
    console.log('  Edit mode:', state?.editMode);
    console.log('');
    
    // Add first component
    console.log('➕ Adding first component...');
    const addBtn1 = await page.$('button:has-text("Add Component"), button:has-text("Add Your First Component")');
    if (addBtn1) {
      await addBtn1.click();
      await page.waitForTimeout(500);
      
      // Select Portfolio Manager
      const portfolio = await page.$('button:has-text("Portfolio Manager")');
      if (portfolio) {
        await portfolio.click();
        console.log('✅ Added Portfolio Manager');
      }
    }
    
    await page.waitForTimeout(2000);
    
    // Check state after first component
    console.log('\n📊 After first component:');
    state = await checkStorage();
    console.log('  Components:', state?.components?.length || 0);
    if (state?.components?.length > 0) {
      console.log('  First component:', state.components[0].type, 'at', state.components[0].position);
    }
    console.log('');
    
    // Count visible components
    let visibleComponents = await page.$$('.react-grid-item');
    console.log('  Visible on canvas:', visibleComponents.length);
    console.log('');
    
    // Add second component
    console.log('➕ Adding second component...');
    const addBtn2 = await page.$('button:has-text("Add Component")');
    if (addBtn2) {
      await addBtn2.click();
      await page.waitForTimeout(500);
      
      // Select Vol Surface
      const volSurface = await page.$('button:has-text("GZC Vol Surface")');
      if (volSurface) {
        await volSurface.click();
        console.log('✅ Added GZC Vol Surface');
      }
    }
    
    await page.waitForTimeout(2000);
    
    // Check final state
    console.log('\n📊 After second component:');
    state = await checkStorage();
    console.log('  Components in storage:', state?.components?.length || 0);
    if (state?.components) {
      state.components.forEach((comp, i) => {
        console.log(`  Component ${i+1}:`, comp.type, 'at', comp.position);
      });
    }
    console.log('');
    
    // Count visible components again
    visibleComponents = await page.$$('.react-grid-item');
    console.log('  Visible on canvas:', visibleComponents.length);
    
    // Get the actual rendered components
    const renderedInfo = await page.evaluate(() => {
      const items = document.querySelectorAll('.react-grid-item');
      return Array.from(items).map(item => ({
        id: item.getAttribute('data-grid') || item.id,
        innerHTML: item.innerHTML.substring(0, 100)
      }));
    });
    
    console.log('\n📋 Rendered components info:');
    renderedInfo.forEach((info, i) => {
      console.log(`  ${i+1}. ID: ${info.id}`);
    });
    
    // Diagnosis
    console.log('\n🔍 DIAGNOSIS:');
    if (state?.components?.length > visibleComponents.length) {
      console.log('❌ Components saved in storage but not all visible!');
      console.log(`   Storage has ${state.components.length}, Canvas shows ${visibleComponents.length}`);
    } else if (state?.components?.length === visibleComponents.length && state?.components?.length > 1) {
      console.log('✅ Multiple components working correctly!');
    } else {
      console.log('❌ Multiple components not working properly');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    console.log('\n⏳ Keeping browser open for manual inspection...');
    await page.waitForTimeout(60000);
    await browser.close();
  }
})();