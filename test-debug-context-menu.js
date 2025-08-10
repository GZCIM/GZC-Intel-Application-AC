const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  // Capture ALL console logs
  page.on('console', msg => {
    const text = msg.text();
    console.log('[CONSOLE]:', text);
  });

  await page.goto('http://localhost:9000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('\n=== DEBUGGING CONTEXT MENU ===\n');
  
  // 1. First check what tabs exist
  console.log('1. Looking for tabs...');
  const tabs = await page.evaluate(() => {
    const tabButtons = Array.from(document.querySelectorAll('button')).filter(el => 
      el.textContent && (el.textContent.includes('Analytics') || el.textContent.includes('Documentation'))
    );
    return tabButtons.map(t => ({
      text: t.textContent.trim(),
      hasContextMenu: t.oncontextmenu !== null
    }));
  });
  console.log('   Found tabs:', tabs);
  
  // 2. Right-click on Analytics tab
  console.log('\n2. Right-clicking on Analytics tab...');
  await page.evaluate(() => {
    const analyticsTab = Array.from(document.querySelectorAll('button')).find(el => 
      el.textContent && el.textContent.trim() === 'Analytics'
    );
    
    if (analyticsTab) {
      console.log('Found Analytics tab, dispatching contextmenu event');
      const rect = analyticsTab.getBoundingClientRect();
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        button: 2
      });
      analyticsTab.dispatchEvent(event);
      return true;
    }
    return false;
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  // 3. Check if context menu appeared
  console.log('\n3. Looking for context menu...');
  const contextMenuInfo = await page.evaluate(() => {
    // Look for any element that could be a context menu
    const possibleMenus = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.textContent || '';
      const style = window.getComputedStyle(el);
      return (
        (text.includes('Enter Edit Mode') || text.includes('Edit') || text.includes('Rename')) &&
        style.position === 'fixed' || style.position === 'absolute'
      );
    });
    
    // Also check for any elements with role="menu"
    const roleMenus = document.querySelectorAll('[role="menu"], [role="menuitem"]');
    
    // Check for any divs at top level that might be portals
    const portalDivs = Array.from(document.body.children).filter(el => {
      const style = window.getComputedStyle(el);
      return style.position === 'fixed' || style.position === 'absolute';
    });
    
    return {
      possibleMenus: possibleMenus.length,
      roleMenus: roleMenus.length,
      portalDivs: portalDivs.length,
      bodyHTML: document.body.innerHTML.includes('Enter Edit Mode')
    };
  });
  
  console.log('   Context menu info:', contextMenuInfo);
  
  // 4. Try to find the actual menu items
  console.log('\n4. Searching for menu items...');
  const menuItems = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.textContent || '';
      return text === 'Enter Edit Mode' || 
             text === 'Edit' || 
             text === 'Rename' || 
             text === 'Remove' ||
             text === 'Add Component';
    });
    
    return items.map(item => ({
      text: item.textContent,
      visible: item.offsetParent !== null,
      tagName: item.tagName,
      className: item.className,
      parent: item.parentElement ? item.parentElement.tagName : null
    }));
  });
  
  console.log('   Found menu items:', menuItems);
  
  // 5. If we found "Enter Edit Mode", try to click it
  if (menuItems.some(item => item.text === 'Enter Edit Mode' && item.visible)) {
    console.log('\n5. Clicking "Enter Edit Mode"...');
    const clicked = await page.evaluate(() => {
      const item = Array.from(document.querySelectorAll('*')).find(el => 
        el.textContent === 'Enter Edit Mode' && el.offsetParent !== null
      );
      if (item) {
        item.click();
        return true;
      }
      return false;
    });
    console.log('   Clicked:', clicked);
  } else {
    console.log('\n5. "Enter Edit Mode" not found or not visible');
  }
  
  console.log('\n=== TEST COMPLETE - Browser stays open ===');
  await new Promise(r => setTimeout(r, 30000));
  
  await browser.close();
})();