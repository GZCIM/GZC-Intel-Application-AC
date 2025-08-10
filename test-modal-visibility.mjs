#!/usr/bin/env node

/**
 * Test if modal exists but is invisible due to CSS issues
 */

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io';

async function testModalVisibility() {
  console.log('🔍 TESTING MODAL VISIBILITY - Check if modal exists but hidden');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    slowMo: 1000,
    args: ['--no-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();

  try {
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    console.log('🎯 Click Tools → Add Component');
    
    // Click Tools
    await page.evaluate(() => {
      const toolsBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent?.includes('Tools'));
      if (toolsBtn) toolsBtn.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Click Add Component
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(btn => btn.textContent?.includes('Add Component') && btn.offsetParent !== null);
      if (addBtn) addBtn.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Deep inspection of modal elements
    const modalInspection = await page.evaluate(() => {
      // Look for any elements containing "Add Component" text
      const allElements = Array.from(document.querySelectorAll('*'));
      const modalElements = allElements.filter(el => {
        const text = el.textContent || '';
        return text.includes('Add Component') && text.length < 500; // Not huge blocks
      });
      
      // Look for fixed position elements
      const fixedElements = allElements.filter(el => {
        const style = window.getComputedStyle(el);
        return style.position === 'fixed';
      });
      
      // Look for high z-index elements
      const highZElements = allElements.filter(el => {
        const style = window.getComputedStyle(el);
        const zIndex = parseInt(style.zIndex);
        return zIndex > 1000;
      });
      
      // Look for elements with backdrop/modal styling
      const backdropElements = allElements.filter(el => {
        const style = window.getComputedStyle(el);
        return style.backgroundColor.includes('rgba') && style.position === 'fixed';
      });
      
      return {
        modalTextElements: modalElements.map(el => ({
          tag: el.tagName,
          text: (el.textContent || '').substring(0, 100),
          visible: el.offsetParent !== null,
          computed: {
            display: window.getComputedStyle(el).display,
            visibility: window.getComputedStyle(el).visibility,
            opacity: window.getComputedStyle(el).opacity,
            zIndex: window.getComputedStyle(el).zIndex
          }
        })),
        fixedElements: fixedElements.length,
        highZElements: highZElements.map(el => ({
          tag: el.tagName,
          zIndex: window.getComputedStyle(el).zIndex,
          visible: el.offsetParent !== null
        })),
        backdropElements: backdropElements.map(el => ({
          tag: el.tagName,
          background: window.getComputedStyle(el).backgroundColor,
          visible: el.offsetParent !== null
        }))
      };
    });
    
    console.log('🔍 Modal inspection results:');
    console.log('Modal text elements:', modalInspection.modalTextElements);
    console.log('Fixed elements count:', modalInspection.fixedElements);
    console.log('High z-index elements:', modalInspection.highZElements);
    console.log('Backdrop elements:', modalInspection.backdropElements);
    
    // Try to force modal to show by modifying CSS
    console.log('\n🎯 Attempting to force modal visibility...');
    const forceShowResult = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      
      // Find elements that might be the modal
      const modalCandidates = allElements.filter(el => {
        const text = el.textContent || '';
        const style = window.getComputedStyle(el);
        return text.includes('Add Component') && 
               text.includes('Local Components') &&
               style.position === 'fixed';
      });
      
      if (modalCandidates.length > 0) {
        const modal = modalCandidates[0];
        // Force visible styles
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.style.zIndex = '999999';
        
        return {
          success: true,
          element: modal.tagName,
          text: (modal.textContent || '').substring(0, 100)
        };
      }
      
      return { success: false, message: 'No modal candidates found' };
    });
    
    console.log('Force show result:', forceShowResult);
    
    if (forceShowResult.success) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Try to click a component
      console.log('\n🎯 Attempting to click vol component...');
      const componentClickResult = await page.evaluate(() => {
        const allElements = Array.from(document.querySelectorAll('*'));
        const volElement = allElements.find(el => {
          const text = (el.textContent || '').toLowerCase();
          return text.includes('bloomberg') && 
                 text.includes('volatility') && 
                 el.offsetParent !== null;
        });
        
        if (volElement) {
          volElement.click();
          return { success: true, clicked: volElement.textContent?.substring(0, 50) };
        }
        
        // Fallback: show what components are available
        const availableComponents = allElements.filter(el => {
          const text = el.textContent || '';
          return text.length > 5 && text.length < 100 && 
                 el.offsetParent !== null &&
                 (text.includes('Portfolio') || text.includes('Analytics') || text.includes('Bloomberg'));
        }).map(el => (el.textContent || '').substring(0, 50));
        
        return { success: false, availableComponents };
      });
      
      console.log('Component click result:', componentClickResult);
    }
    
  } catch (error) {
    console.error('💥 TEST FAILED:', error.message);
  } finally {
    console.log('\n🏁 Leaving browser open for manual inspection');
  }
}

testModalVisibility().catch(console.error);