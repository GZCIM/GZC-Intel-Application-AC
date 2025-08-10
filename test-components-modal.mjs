import puppeteer from 'puppeteer';

async function testComponentsInModal() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🔍 Testing if components load in modal...');
  
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
  
  // Check what's in the modal
  const modalContent = await page.evaluate(() => {
    const allElements = Array.from(document.querySelectorAll('*'));
    
    // Find the modal
    const modal = allElements.find(el => 
      el.textContent?.includes('Add Component') && 
      el.textContent?.includes('Local Components')
    );
    
    if (!modal) return { error: 'Modal not found' };
    
    // Find all h4 elements (component titles)
    const h4Elements = Array.from(modal.querySelectorAll('h4'));
    
    // Find all clickable divs with cursor pointer
    const clickableDivs = Array.from(modal.querySelectorAll('div')).filter(div => {
      const style = window.getComputedStyle(div);
      return style.cursor === 'pointer';
    });
    
    // Find any text that looks like a component
    const componentTexts = allElements
      .filter(el => {
        const text = el.textContent || '';
        const parent = el.parentElement?.textContent || '';
        return parent.includes('Local Components') && 
               text.length > 5 && 
               text.length < 200 &&
               !text.includes('Local Components') &&
               !text.includes('Import from');
      })
      .map(el => el.textContent?.trim());
    
    return {
      modalFound: true,
      h4Count: h4Elements.length,
      h4Texts: h4Elements.map(h4 => h4.textContent),
      clickableDivsCount: clickableDivs.length,
      componentTexts: [...new Set(componentTexts)].slice(0, 10),
      modalInnerHTML: modal.innerHTML.substring(0, 500)
    };
  });
  
  console.log('Modal content analysis:', JSON.stringify(modalContent, null, 2));
  
  // Take screenshot
  await page.screenshot({ path: 'modal-content-check.png' });
  console.log('📸 Screenshot saved as modal-content-check.png');
}

testComponentsInModal().catch(console.error);