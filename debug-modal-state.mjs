#!/usr/bin/env node

/**
 * Debug modal state specifically - track what happens when Add Component is clicked
 */

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io';

async function debugModalState() {
  console.log('🔧 DEBUGGING MODAL STATE - Tracking exact modal behavior');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    slowMo: 2000,
    args: ['--no-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();
  
  // Capture ALL console messages 
  page.on('console', (msg) => {
    const text = msg.text();
    console.log(`[BROWSER] ${text}`);
  });

  page.on('pageerror', (error) => {
    console.error('🚨 JAVASCRIPT ERROR:', error.message);
  });

  try {
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Inject debugging code into the page to monitor modal state
    await page.evaluate(() => {
      // Monitor modal state changes
      let modalStateChecks = 0;
      const checkModalState = () => {
        modalStateChecks++;
        const modals = document.querySelectorAll('[role="dialog"], .modal, .portal');
        const portals = document.querySelectorAll('div[style*="position: fixed"]');
        console.log(`MODAL CHECK ${modalStateChecks}: modals=${modals.length}, portals=${portals.length}`);
        return { modals: modals.length, portals: portals.length };
      };
      
      // Initial state
      console.log('INITIAL MODAL STATE:', checkModalState());
      
      // Set up mutation observer to watch for modal changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            const added = Array.from(mutation.addedNodes).filter(node => 
              node.nodeType === 1 && (
                node.getAttribute?.('role') === 'dialog' ||
                node.classList?.contains('modal') ||
                node.classList?.contains('portal')
              )
            );
            if (added.length > 0) {
              console.log('DOM CHANGE: Modal/Portal added:', added.map(n => n.tagName + '.' + (n.className || 'no-class')));
              checkModalState();
            }
          }
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Store checker function globally for later use
      window.checkModalState = checkModalState;
    });
    
    console.log('\n🎯 STEP 1: Click Tools menu');
    await page.click('button:has-text("Tools")').catch(() => {
      return page.evaluate(() => {
        const toolsBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent?.includes('Tools'));
        if (toolsBtn) toolsBtn.click();
      });
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n🎯 STEP 2: Before clicking Add Component - check modal state');
    await page.evaluate(() => window.checkModalState());
    
    console.log('\n🎯 STEP 3: Click Add Component');
    const clickResult = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(btn => 
        btn.textContent?.includes('Add Component') && 
        btn.offsetParent !== null
      );
      if (addBtn) {
        console.log('BROWSER: About to click Add Component button');
        addBtn.click();
        console.log('BROWSER: Add Component button clicked');
        return { success: true };
      }
      return { success: false };
    });
    
    console.log('Click result:', clickResult);
    
    // Check modal state multiple times with delays
    for (let i = 1; i <= 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`\n🔍 STEP 4.${i}: Check modal state ${i} second(s) after click`);
      await page.evaluate(() => window.checkModalState());
    }
    
    // Check for any error messages or state inconsistencies
    console.log('\n🔍 STEP 5: Check for errors and state issues');
    const errorCheck = await page.evaluate(() => {
      // Look for error elements
      const errorElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = (el.textContent || '').toLowerCase();
        return text.includes('error') || text.includes('failed') || text.includes('not found');
      });
      
      // Check if React is working properly
      const reactElements = document.querySelectorAll('div[data-react], [data-reactroot]');
      
      // Check console errors
      const hasConsoleErrors = window.console && window.console.error;
      
      return {
        errorElementCount: errorElements.length,
        errorTexts: errorElements.slice(0, 3).map(el => (el.textContent || '').substring(0, 100)),
        reactElementCount: reactElements.length,
        hasConsoleErrors
      };
    });
    
    console.log('Error check result:', errorCheck);
    
  } catch (error) {
    console.error('💥 DEBUG FAILED:', error.message);
  } finally {
    console.log('\n🏁 Leaving browser open for manual inspection');
  }
}

debugModalState().catch(console.error);