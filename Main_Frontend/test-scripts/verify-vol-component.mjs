#!/usr/bin/env node

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io';

async function testVolComponent() {
  console.log('🧪 Testing Bloomberg Volatility Component Addition');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    slowMo: 2000,
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();

  try {
    console.log('🔄 Loading production app...');
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for full load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get initial component count
    const initialCount = await page.$$eval('.react-grid-item', items => items.length);
    console.log(`📊 Initial components on grid: ${initialCount}`);
    
    // Click Tools button
    console.log('🔧 Clicking Tools...');
    await page.evaluate(() => {
      const toolsBtn = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent?.includes('Tools')
      );
      if (toolsBtn) toolsBtn.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Click Add Component
    console.log('➕ Clicking Add Component...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(btn => btn.textContent?.includes('Add Component'));
      if (addBtn) addBtn.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Look for Bloomberg Volatility component
    console.log('🔍 Looking for Bloomberg Volatility component...');
    const volComponentFound = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const volElement = elements.find(el => {
        const text = (el.textContent || '').toLowerCase();
        return text.includes('bloomberg') && text.includes('volatility');
      });
      
      if (volElement) {
        return {
          found: true,
          text: volElement.textContent?.substring(0, 100),
          clickable: volElement.offsetParent !== null
        };
      }
      
      // Show available components
      const availableComponents = elements
        .filter(el => {
          const text = el.textContent || '';
          const parent = el.parentElement;
          return text.length > 5 && text.length < 200 && 
                 el.offsetParent !== null &&
                 parent && parent.textContent && parent.textContent.includes('Local Components');
        })
        .map(el => (el.textContent || '').trim())
        .filter(text => text && !text.includes('Local Components'))
        .slice(0, 10);
        
      return { found: false, availableComponents };
    });
    
    console.log('Vol component search result:', volComponentFound);
    
    if (volComponentFound.found && volComponentFound.clickable) {
      console.log('🎯 Clicking Bloomberg Volatility...');
      
      // Click the vol component
      await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        const volElement = elements.find(el => {
          const text = (el.textContent || '').toLowerCase();
          return text.includes('bloomberg') && text.includes('volatility');
        });
        if (volElement) volElement.click();
      });
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if component was added to grid
      const finalCount = await page.$$eval('.react-grid-item', items => items.length);
      console.log(`📊 Final components on grid: ${finalCount}`);
      
      if (finalCount > initialCount) {
        console.log('🎉 SUCCESS: Bloomberg Volatility component added to grid!');
        
        // Take success screenshot
        await page.screenshot({ 
          path: '/Users/mikaeleage/GZC Intel Application AC/Main_Frontend/test-scripts/vol-component-success.png',
          fullPage: false 
        });
        console.log('📸 Success screenshot saved');
        
        return { success: true, added: finalCount - initialCount };
      } else {
        console.log('❌ FAILED: Component not added to grid');
        return { success: false, reason: 'Component not added to grid' };
      }
      
    } else {
      console.log('❌ FAILED: Bloomberg Volatility component not found or not clickable');
      return { success: false, reason: 'Vol component not accessible' };
    }
    
  } catch (error) {
    console.error('💥 TEST ERROR:', error.message);
    return { success: false, error: error.message };
  } finally {
    console.log('🔍 Keeping browser open for inspection...');
  }
}

// Run the test
testVolComponent()
  .then(result => {
    console.log('\n📋 FINAL RESULT:', result);
    if (result.success) {
      console.log('✅ MODAL FIX VERIFICATION: PASSED');
    } else {
      console.log('❌ MODAL FIX VERIFICATION: FAILED -', result.reason || result.error);
    }
  })
  .catch(console.error);