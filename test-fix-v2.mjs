import puppeteer from 'puppeteer';

(async () => {
  console.log('🧪 Testing multiple components fix v2...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();
  
  // Monitor critical console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Setting components to:') || 
        text.includes('Syncing from tab.components:') ||
        text.includes('AFTER UPDATE CALL') ||
        text.includes('UPDATE TAB CALLED')) {
      console.log(`[LOG] ${text}`);
    }
  });
  
  try {
    console.log('1️⃣ Loading app...');
    await page.goto('http://localhost:9000');
    await page.waitForSelector('button', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));
    
    // Click Analytics tab
    console.log('2️⃣ Switching to Analytics tab...');
    const analyticsClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const analyticsBtn = buttons.find(btn => btn.textContent?.includes('Analytics'));
      if (analyticsBtn) {
        analyticsBtn.click();
        return true;
      }
      return false;
    });
    
    if (!analyticsClicked) {
      console.log('❌ Could not find Analytics tab');
      return;
    }
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Enter edit mode via context menu
    console.log('3️⃣ Entering edit mode...');
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
    
    const editModeClicked = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const editModeItem = elements.find(el => 
        el.textContent?.trim() === 'Enter Edit Mode' && 
        !Array.from(el.children).length
      );
      if (editModeItem instanceof HTMLElement) {
        editModeItem.click();
        return true;
      }
      return false;
    });
    
    if (!editModeClicked) {
      console.log('⚠️ Could not click Enter Edit Mode');
    }
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Check current state
    const initialState = await page.evaluate(() => {
      const layout = localStorage.getItem('gzc-intel-current-layout-default-user');
      if (layout) {
        const parsed = JSON.parse(layout);
        const analyticsTab = parsed.tabs.find(t => t.id === 'analytics');
        return {
          editMode: analyticsTab?.editMode,
          components: analyticsTab?.components?.length || 0
        };
      }
      return { editMode: false, components: 0 };
    });
    
    console.log(`   Initial: EditMode=${initialState.editMode}, Components=${initialState.components}`);
    
    // Add first component
    console.log('4️⃣ Adding Portfolio Manager...');
    
    // Click Add Component button - try both possible texts
    const addBtnClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(btn => {
        const text = btn.textContent || '';
        return text.includes('Add Component') || text.includes('Add Your First Component');
      });
      if (addBtn instanceof HTMLElement) {
        console.log('Found Add Component button:', addBtn.textContent);
        addBtn.click();
        return true;
      }
      console.log('Add Component button not found');
      return false;
    });
    
    if (!addBtnClicked) {
      console.log('❌ Add Component button not found');
      return;
    }
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Select Portfolio Manager - click on the card div
    const portfolioClicked = await page.evaluate(() => {
      // Look for Portfolio Manager in various places
      const elements = Array.from(document.querySelectorAll('*'));
      const portfolioElement = elements.find(el => {
        const text = el.textContent || '';
        return text.includes('Portfolio Manager') && 
               (el.tagName === 'H4' || el.tagName === 'DIV' || el.tagName === 'BUTTON');
      });
      
      if (portfolioElement) {
        // If it's an H4, click its parent div
        const clickTarget = portfolioElement.tagName === 'H4' 
          ? portfolioElement.closest('div[style*="cursor"]') 
          : portfolioElement;
        
        if (clickTarget instanceof HTMLElement) {
          console.log('Clicking on Portfolio Manager element');
          clickTarget.click();
          return true;
        }
      }
      console.log('Portfolio Manager element not found');
      return false;
    });
    
    if (!portfolioClicked) {
      console.log('⚠️ Could not select Portfolio Manager');
    }
    
    await new Promise(r => setTimeout(r, 3000));
    
    // Check state after first component
    const afterFirst = await page.evaluate(() => {
      const layout = localStorage.getItem('gzc-intel-current-layout-default-user');
      if (layout) {
        const parsed = JSON.parse(layout);
        const analyticsTab = parsed.tabs.find(t => t.id === 'analytics');
        return analyticsTab?.components?.length || 0;
      }
      return 0;
    });
    
    const visibleAfterFirst = await page.$$('.react-grid-item');
    console.log(`   After 1st: Storage=${afterFirst}, Visible=${visibleAfterFirst.length}`);
    
    // Add second component
    console.log('5️⃣ Adding Vol Surface...');
    
    const addBtn2Clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(btn => btn.textContent?.includes('Add Component'));
      if (addBtn instanceof HTMLElement) {
        addBtn.click();
        return true;
      }
      return false;
    });
    
    if (!addBtn2Clicked) {
      console.log('⚠️ Add Component button not found for second component');
    }
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Select Vol Surface
    const volClicked = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const volElement = elements.find(el => {
        const text = el.textContent || '';
        return (text.includes('GZC Vol Surface') || 
                text.includes('Bloomberg Volatility') ||
                text.includes('Volatility Analysis')) &&
               (el.tagName === 'H4' || el.tagName === 'DIV' || el.tagName === 'BUTTON');
      });
      
      if (volElement) {
        const clickTarget = volElement.tagName === 'H4'
          ? volElement.closest('div[style*="cursor"]')
          : volElement;
          
        if (clickTarget instanceof HTMLElement) {
          console.log('Clicking on Vol Surface element');
          clickTarget.click();
          return true;
        }
      }
      console.log('Vol Surface element not found');
      return false;
    });
    
    if (!volClicked) {
      console.log('⚠️ Could not select Vol Surface');
    }
    
    await new Promise(r => setTimeout(r, 3000));
    
    // Final check
    const finalState = await page.evaluate(() => {
      const layout = localStorage.getItem('gzc-intel-current-layout-default-user');
      if (layout) {
        const parsed = JSON.parse(layout);
        const analyticsTab = parsed.tabs.find(t => t.id === 'analytics');
        return {
          components: analyticsTab?.components || [],
          count: analyticsTab?.components?.length || 0
        };
      }
      return { components: [], count: 0 };
    });
    
    const visibleFinal = await page.$$('.react-grid-item');
    
    console.log(`\n📊 FINAL RESULT:`);
    console.log(`   Components in storage: ${finalState.count}`);
    console.log(`   Components visible: ${visibleFinal.length}`);
    
    if (finalState.count > 0) {
      console.log(`   Component IDs:`, finalState.components.map(c => c.id));
    }
    
    if (visibleFinal.length >= 2 && finalState.count >= 2) {
      console.log('\n✅ SUCCESS! Multiple components working!');
    } else {
      console.log('\n❌ ISSUE REMAINS:');
      console.log(`   Expected: 2+ components`);
      console.log(`   Got: ${visibleFinal.length} visible, ${finalState.count} in storage`);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    console.log('\n⏳ Browser will close in 15 seconds...');
    await new Promise(r => setTimeout(r, 15000));
    await browser.close();
  }
})();