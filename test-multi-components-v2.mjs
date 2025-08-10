import puppeteer from 'puppeteer';

(async () => {
  console.log('🧪 Testing multiple component addition locally...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    devtools: true
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

    // Wait for Analytics tab
    await page.waitForFunction(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(btn => btn.textContent?.includes('Analytics'));
    });

    // Click Analytics tab
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const analyticsBtn = buttons.find(btn => btn.textContent?.includes('Analytics'));
      if (analyticsBtn) analyticsBtn.click();
    });
    console.log('📊 Clicked Analytics tab');
    await new Promise(r => setTimeout(r, 1000));

    // Right-click to enter edit mode
    console.log('🖱️ Right-clicking Analytics tab...');
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
    
    // Click "Enter Edit Mode"
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const editModeItem = elements.find(el => 
        el.textContent?.trim() === 'Enter Edit Mode' && 
        !Array.from(el.children).length
      );
      if (editModeItem) {
        editModeItem.click();
        return true;
      }
      return false;
    });
    console.log('✅ Entered edit mode\n');
    
    await new Promise(r => setTimeout(r, 1000));
    
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
    
    // Click Add Component button
    const addBtnClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(btn => 
        btn.textContent?.includes('Add Component') || 
        btn.textContent?.includes('Add Your First Component')
      );
      if (addBtn) {
        addBtn.click();
        return true;
      }
      return false;
    });
    
    if (!addBtnClicked) {
      console.log('❌ Add Component button not found');
      return;
    }
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Select Portfolio Manager
    const portfolioClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const portfolioBtn = buttons.find(btn => 
        btn.textContent?.includes('Portfolio Manager')
      );
      if (portfolioBtn) {
        portfolioBtn.click();
        return true;
      }
      return false;
    });
    
    if (portfolioClicked) {
      console.log('✅ Added Portfolio Manager');
    }
    
    await new Promise(r => setTimeout(r, 2000));
    
    // Check state after first component
    console.log('\n📊 After first component:');
    state = await checkStorage();
    console.log('  Components in storage:', state?.components?.length || 0);
    if (state?.components?.length > 0) {
      console.log('  First component:', state.components[0].type, 'at', state.components[0].position);
    }
    
    // Count visible components
    let visibleComponents = await page.$$('.react-grid-item');
    console.log('  Visible on canvas:', visibleComponents.length);
    console.log('');
    
    // Add second component
    console.log('➕ Adding second component...');
    
    // Click Add Component button again
    const addBtn2Clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(btn => 
        btn.textContent?.includes('Add Component')
      );
      if (addBtn) {
        addBtn.click();
        return true;
      }
      return false;
    });
    
    if (!addBtn2Clicked) {
      console.log('❌ Add Component button not found for second component');
    }
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Select Vol Surface
    const volClicked = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const volBtn = elements.find(el => 
        el.textContent?.includes('GZC Vol Surface') ||
        el.textContent?.includes('Vol Surface') ||
        el.textContent?.includes('Bloomberg Volatility')
      );
      if (volBtn && (volBtn.tagName === 'BUTTON' || volBtn.tagName === 'DIV')) {
        volBtn.click();
        return true;
      }
      return false;
    });
    
    if (volClicked) {
      console.log('✅ Added Vol Surface component');
    }
    
    await new Promise(r => setTimeout(r, 2000));
    
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
      console.log('\n🐛 POTENTIAL ISSUE: State sync problem between tab.components and DynamicCanvas');
    } else if (state?.components?.length === visibleComponents.length && state?.components?.length > 1) {
      console.log('✅ Multiple components working correctly!');
    } else if (state?.components?.length === 0) {
      console.log('❌ No components saved to storage at all');
    } else {
      console.log('❌ Multiple components not working properly');
      console.log(`   Storage: ${state?.components?.length}, Canvas: ${visibleComponents.length}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    console.log('\n⏳ Keeping browser open for manual inspection...');
    await new Promise(r => setTimeout(r, 60000));
    await browser.close();
  }
})();