import puppeteer from 'puppeteer';

async function checkModalReal() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🔍 REAL CHECK - What is actually in the modal?');
  
  await page.goto('https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Click Tools
  await page.evaluate(() => {
    const toolsBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent?.includes('Tools'));
    if (toolsBtn) toolsBtn.click();
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Click Add Component
  await page.evaluate(() => {
    const addBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent?.includes('Add Component'));
    if (addBtn) addBtn.click();
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Find the ACTUAL modal (fixed position element with high z-index)
  const modalCheck = await page.evaluate(() => {
    // Find element with z-index 999999 (the modal backdrop)
    const allElements = Array.from(document.querySelectorAll('*'));
    const modalBackdrop = allElements.find(el => {
      const style = window.getComputedStyle(el);
      return style.zIndex === '999999' && style.position === 'fixed';
    });
    
    if (!modalBackdrop) return { error: 'No modal backdrop found' };
    
    // Get the modal content (should be inside the backdrop)
    const modalContent = modalBackdrop.querySelector('div');
    if (!modalContent) return { error: 'No modal content found' };
    
    // Get what's actually inside the modal content area
    const componentGrid = modalContent.querySelector('div[style*="grid-template-columns"]');
    
    // Count actual component cards
    const componentCards = componentGrid ? Array.from(componentGrid.children) : [];
    
    return {
      backdropFound: true,
      modalContentFound: !!modalContent,
      modalText: modalContent.textContent?.substring(0, 200),
      gridFound: !!componentGrid,
      componentCardsCount: componentCards.length,
      componentCardTexts: componentCards.map(card => card.textContent?.substring(0, 50)),
      modalContentHTML: modalContent.innerHTML.substring(0, 1000)
    };
  });
  
  console.log('REAL Modal Check:', JSON.stringify(modalCheck, null, 2));
  
  // Also check console for any errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });
}

checkModalReal().catch(console.error);