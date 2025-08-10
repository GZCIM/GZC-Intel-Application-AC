#!/usr/bin/env node

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io';

async function simpleTest() {
  console.log('🧪 Simple component test...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    slowMo: 1000,
    args: ['--no-sandbox'] 
  });
  
  const page = await browser.newPage();

  try {
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 8000)); // Wait for full load
    
    // Simple check: can we find and click Tools?
    const result = await page.evaluate(() => {
      const toolsBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent?.includes('Tools'));
      if (toolsBtn) {
        toolsBtn.click();
        return { success: true, message: 'Tools button clicked' };
      }
      return { success: false, message: 'No Tools button found' };
    });
    
    console.log('Tools click result:', result);
    
    if (result.success) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if Add Component appears
      const menuResult = await page.evaluate(() => {
        const addBtn = Array.from(document.querySelectorAll('*')).find(el => 
          el.textContent?.includes('Add Component')
        );
        return {
          found: !!addBtn,
          text: addBtn?.textContent || 'Not found',
          tagName: addBtn?.tagName || 'N/A'
        };
      });
      
      console.log('Add Component check:', menuResult);
      
      if (menuResult.found) {
        console.log('✅ SUCCESS: Add Component button is available!');
      } else {
        console.log('❌ ISSUE: Add Component not showing in menu');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

simpleTest().catch(console.error);