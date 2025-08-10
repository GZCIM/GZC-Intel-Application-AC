#!/usr/bin/env node

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io';

async function completeDebugTest() {
  console.log('🔍 COMPLETE DEBUG TEST - Full Application Verification');
  console.log('='*60);
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    slowMo: 500,
    defaultViewport: { width: 1600, height: 1000 }
  });
  
  const page = await browser.newPage();
  
  // Capture all console messages
  const consoleLogs = [];
  const consoleErrors = [];
  const networkErrors = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      consoleErrors.push(text);
      console.log(`❌ CONSOLE ERROR: ${text}`);
    } else if (msg.type() === 'warning') {
      console.log(`⚠️  CONSOLE WARN: ${text}`);
    } else {
      consoleLogs.push(text);
      if (text.includes('Component') || text.includes('Modal') || text.includes('Bloomberg')) {
        console.log(`📝 CONSOLE: ${text}`);
      }
    }
  });
  
  page.on('pageerror', error => {
    console.log(`💥 PAGE ERROR: ${error.message}`);
  });
  
  page.on('requestfailed', request => {
    const failure = request.failure();
    if (failure) {
      networkErrors.push(`${request.url()} - ${failure.errorText}`);
      console.log(`🔴 NETWORK FAIL: ${request.url()} - ${failure.errorText}`);
    }
  });

  try {
    // STEP 1: Load application
    console.log('\n📦 STEP 1: Loading application...');
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get page info
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        bodyLength: document.body.innerHTML.length,
        hasRoot: !!document.getElementById('root'),
        reactVersion: window.React ? window.React.version : 'Not exposed',
        componentInventory: typeof window.componentInventory !== 'undefined'
      };
    });
    
    console.log('✅ Page loaded:', pageInfo);
    
    // STEP 2: Check initial UI state
    console.log('\n📦 STEP 2: Checking UI elements...');
    const uiState = await page.evaluate(() => {
      const header = document.querySelector('header');
      const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim());
      const gridLayout = document.querySelector('.react-grid-layout');
      const gridItems = document.querySelectorAll('.react-grid-item');
      
      return {
        hasHeader: !!header,
        buttons: buttons.filter(b => b),
        hasGridLayout: !!gridLayout,
        initialGridItems: gridItems.length,
        systemStatus: document.body.textContent?.match(/v\d{8}-\d{6}/)?.[0] || 'Version not found'
      };
    });
    
    console.log('UI State:', uiState);
    
    // STEP 3: Test Tools menu
    console.log('\n📦 STEP 3: Testing Tools menu...');
    const toolsTest = await page.evaluate(() => {
      const toolsButton = Array.from(document.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Tools'));
      
      if (toolsButton) {
        toolsButton.click();
        return { success: true, text: toolsButton.textContent };
      }
      return { success: false, availableButtons: Array.from(document.querySelectorAll('button')).map(b => b.textContent) };
    });
    
    console.log('Tools menu test:', toolsTest);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // STEP 4: Test Add Component
    console.log('\n📦 STEP 4: Testing Add Component button...');
    const addComponentTest = await page.evaluate(() => {
      const addButton = Array.from(document.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Add Component') && btn.offsetParent !== null);
      
      if (addButton) {
        addButton.click();
        return { success: true };
      }
      return { success: false };
    });
    
    console.log('Add Component test:', addComponentTest);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // STEP 5: Check modal state
    console.log('\n📦 STEP 5: Checking modal state...');
    const modalState = await page.evaluate(() => {
      // Look for modal
      const modalElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent || '';
        return text.includes('Add Component') && text.includes('Local Components');
      });
      
      if (modalElements.length > 0) {
        const modal = modalElements[0];
        const style = window.getComputedStyle(modal);
        
        // Look for component cards
        const componentCards = Array.from(modal.querySelectorAll('h4')).map(h4 => h4.textContent);
        
        return {
          modalFound: true,
          visible: modal.offsetParent !== null,
          display: style.display,
          opacity: style.opacity,
          componentCards: componentCards,
          hasBloombergVol: componentCards.some(c => c?.toLowerCase().includes('volatility'))
        };
      }
      
      return { modalFound: false };
    });
    
    console.log('Modal state:', modalState);
    
    // STEP 6: Try to select Bloomberg Volatility
    if (modalState.modalFound && modalState.hasBloombergVol) {
      console.log('\n📦 STEP 6: Selecting Bloomberg Volatility...');
      
      const selectionResult = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('div')).filter(div => {
          const text = div.textContent || '';
          return text.includes('Volatility Analysis') && div.style.cursor === 'pointer';
        });
        
        if (cards.length > 0) {
          cards[0].click();
          return { success: true, clicked: cards[0].textContent?.substring(0, 50) };
        }
        
        return { success: false };
      });
      
      console.log('Selection result:', selectionResult);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if component was added
      const finalGridState = await page.evaluate(() => {
        const gridItems = document.querySelectorAll('.react-grid-item');
        return {
          gridItems: gridItems.length,
          componentAdded: gridItems.length > 0
        };
      });
      
      console.log('Final grid state:', finalGridState);
    }
    
    // STEP 7: Summary
    console.log('\n' + '='*60);
    console.log('📊 DEBUG SUMMARY');
    console.log('='*60);
    
    const summary = {
      deployment: {
        url: PRODUCTION_URL,
        version: uiState.systemStatus,
        status: pageInfo.title ? 'LOADED' : 'FAILED'
      },
      functionality: {
        toolsMenu: toolsTest.success ? '✅ WORKING' : '❌ BROKEN',
        addComponentButton: addComponentTest.success ? '✅ WORKING' : '❌ BROKEN',
        modalDisplay: modalState.modalFound ? '✅ FOUND' : '❌ NOT FOUND',
        modalVisible: modalState.visible ? '✅ VISIBLE' : '❌ HIDDEN',
        componentsAvailable: modalState.componentCards?.length || 0,
        bloombergVolAvailable: modalState.hasBloombergVol ? '✅ YES' : '❌ NO'
      },
      errors: {
        consoleErrors: consoleErrors.length,
        networkErrors: networkErrors.length,
        criticalErrors: consoleErrors.filter(e => 
          !e.includes('CORS') && 
          !e.includes('Mixed Content') && 
          !e.includes('404')
        ).length
      }
    };
    
    console.log(JSON.stringify(summary, null, 2));
    
    // List critical errors
    if (summary.errors.criticalErrors > 0) {
      console.log('\n⚠️  CRITICAL ERRORS:');
      consoleErrors.filter(e => 
        !e.includes('CORS') && 
        !e.includes('Mixed Content') && 
        !e.includes('404')
      ).forEach(e => console.log(`  - ${e}`));
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: '/Users/mikaeleage/GZC Intel Application AC/Main_Frontend/test-scripts/complete-debug.png',
      fullPage: false 
    });
    
    return summary;
    
  } catch (error) {
    console.error('💥 TEST FAILED:', error.message);
    return { error: error.message };
  } finally {
    console.log('\n🔍 Browser remains open for manual inspection');
  }
}

// Run the test
completeDebugTest()
  .then(result => {
    console.log('\n✅ Debug test completed');
    if (result.functionality?.modalDisplay === '✅ FOUND' && 
        result.functionality?.componentsAvailable > 0) {
      console.log('🎉 MODAL FIX VERIFIED: Components are accessible!');
    } else {
      console.log('❌ ISSUES DETECTED: Check summary above');
    }
  })
  .catch(console.error);