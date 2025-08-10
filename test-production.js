const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  console.log('=== TESTING PRODUCTION DEPLOYMENT ===');
  console.log('URL: https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io');
  console.log('Version: v20250808-154752\n');
  
  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Component') || text.includes('Edit') || text.includes('Tab')) {
      console.log('[LOG]:', text);
    }
  });
  
  page.on('pageerror', err => {
    console.log('[ERROR]:', err.message);
  });

  // Navigate to production
  console.log('1. Loading production site...');
  await page.goto('https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io', { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  await new Promise(r => setTimeout(r, 3000));
  
  // Step 1: Right-click Analytics tab
  console.log('\n2. Right-clicking Analytics tab...');
  const rightClickSuccess = await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(el => 
      el.textContent && el.textContent.trim() === 'Analytics'
    );
    if (tab) {
      const rect = tab.getBoundingClientRect();
      tab.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        button: 2
      }));
      return true;
    }
    return false;
  });
  console.log('   Right-click:', rightClickSuccess ? 'SUCCESS' : 'FAILED');
  await new Promise(r => setTimeout(r, 1500));
  
  // Step 2: Click "Enter Edit Mode"
  console.log('\n3. Clicking "Enter Edit Mode"...');
  const editModeClicked = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('*')).filter(el => 
      (el.textContent === 'Enter Edit Mode' || el.textContent === 'Edit') && 
      el.offsetParent !== null
    );
    if (items.length > 0) {
      items[0].click();
      return true;
    }
    return false;
  });
  console.log('   Clicked:', editModeClicked ? 'SUCCESS' : 'FAILED');
  await new Promise(r => setTimeout(r, 2000));
  
  // Step 3: Right-click again for "Add Component"
  console.log('\n4. Right-clicking Analytics tab again...');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(el => 
      el.textContent && el.textContent.trim() === 'Analytics'
    );
    if (tab) {
      tab.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 2
      }));
    }
  });
  await new Promise(r => setTimeout(r, 1500));
  
  // Step 4: Click "Add Component"
  console.log('\n5. Clicking "Add Component"...');
  const addComponentClicked = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('*')).filter(el => 
      el.textContent === 'Add Component' && el.offsetParent !== null
    );
    if (items.length > 0) {
      items[0].click();
      return true;
    }
    return false;
  });
  console.log('   Clicked:', addComponentClicked ? 'SUCCESS' : 'FAILED');
  await new Promise(r => setTimeout(r, 3000));
  
  // Step 5: Check modal and components
  console.log('\n6. Checking component modal...');
  const modalInfo = await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"]') || 
                  document.querySelector('.fixed.inset-0') ||
                  Array.from(document.querySelectorAll('div')).find(el => {
                    const style = window.getComputedStyle(el);
                    return style.position === 'fixed' && 
                           style.zIndex > 1000 &&
                           el.offsetParent !== null;
                  });
    
    const componentCards = Array.from(document.querySelectorAll('div')).filter(el => {
      const style = window.getComputedStyle(el);
      const text = el.textContent || '';
      return style.cursor === 'pointer' && 
             (text.includes('Portfolio') || 
              text.includes('Analytics') || 
              text.includes('Volatility') ||
              text.includes('Chart'));
    });
    
    const gridContainer = Array.from(document.querySelectorAll('div')).find(el => {
      const style = window.getComputedStyle(el);
      return style.display === 'grid';
    });
    
    return {
      hasModal: !!modal,
      hasGrid: !!gridContainer,
      componentCount: componentCards.length,
      componentNames: componentCards.slice(0, 5).map(c => c.textContent.substring(0, 30))
    };
  });
  
  console.log('   Modal found:', modalInfo.hasModal ? 'YES' : 'NO');
  console.log('   Components found:', modalInfo.componentCount);
  if (modalInfo.componentCount > 0) {
    console.log('   Component names:', modalInfo.componentNames);
  }
  
  // Step 6: Try clicking a component
  if (modalInfo.componentCount > 0) {
    console.log('\n7. Clicking first component...');
    const componentClicked = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div')).filter(el => {
        const style = window.getComputedStyle(el);
        const text = el.textContent || '';
        return style.cursor === 'pointer' && 
               (text.includes('Portfolio') || 
                text.includes('Analytics') || 
                text.includes('Volatility'));
      });
      
      if (cards.length > 0) {
        console.log('Clicking:', cards[0].textContent.substring(0, 50));
        cards[0].click();
        return true;
      }
      return false;
    });
    console.log('   Clicked:', componentClicked ? 'SUCCESS' : 'FAILED');
    await new Promise(r => setTimeout(r, 3000));
  }
  
  // Final check
  console.log('\n8. Final state check...');
  const finalState = await page.evaluate(() => {
    const gridItems = document.querySelectorAll('.react-grid-item');
    const editIndicator = Array.from(document.querySelectorAll('*')).find(el => 
      el.textContent === 'Save & Exit Edit' || el.textContent === 'Exit Edit Mode'
    );
    
    return {
      componentCount: gridItems.length,
      stillInEditMode: !!editIndicator
    };
  });
  
  console.log('\n=== FINAL RESULT ===');
  console.log('Components on canvas:', finalState.componentCount);
  console.log('Still in edit mode:', finalState.stillInEditMode);
  
  if (finalState.componentCount > 0 && finalState.stillInEditMode) {
    console.log('\n✅ SUCCESS: Component add feature is WORKING in production!');
  } else if (finalState.componentCount > 0) {
    console.log('\n⚠️  PARTIAL: Component added but exited edit mode');
  } else {
    console.log('\n❌ FAILED: Component add feature NOT working');
  }
  
  console.log('\nBrowser stays open for manual verification...');
  await new Promise(r => setTimeout(r, 60000));
  
  await browser.close();
})();