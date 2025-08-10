#!/usr/bin/env node

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io';

async function testModalFunctionality() {
  console.log('🧪 FINAL MODAL TEST - Verify complete workflow');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    slowMo: 1500,
    defaultViewport: { width: 1600, height: 1000 }
  });
  
  const page = await browser.newPage();

  try {
    console.log('🔄 Loading production application...');
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for app initialization
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Verify version in title
    const title = await page.title();
    console.log(`📦 Version confirmed: ${title}`);
    
    // Get initial grid state
    const initialGridState = await page.evaluate(() => {
      const gridItems = document.querySelectorAll('.react-grid-item');
      return {
        componentCount: gridItems.length,
        gridExists: !!document.querySelector('.react-grid-layout')
      };
    });
    
    console.log('📊 Initial grid state:', initialGridState);
    
    // Step 1: Open Tools menu
    console.log('\n🔧 Step 1: Opening Tools menu...');
    const toolsResult = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const toolsButton = buttons.find(btn => btn.textContent?.includes('Tools'));
      
      if (toolsButton) {
        toolsButton.click();
        return { success: true, found: toolsButton.textContent?.trim() };
      }
      
      return { success: false, availableButtons: buttons.map(b => b.textContent?.trim()).filter(t => t) };
    });
    
    console.log('Tools menu result:', toolsResult);
    if (!toolsResult.success) {
      throw new Error('Tools menu not found');
    }
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Step 2: Click Add Component
    console.log('➕ Step 2: Clicking Add Component...');
    const addComponentResult = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addButton = buttons.find(btn => 
        btn.textContent?.includes('Add Component') && 
        btn.offsetParent !== null // Must be visible
      );
      
      if (addButton) {
        addButton.click();
        return { success: true };
      }
      
      return { success: false, visibleButtons: buttons.filter(b => b.offsetParent !== null).map(b => b.textContent?.trim()) };
    });
    
    console.log('Add Component result:', addComponentResult);
    if (!addComponentResult.success) {
      throw new Error('Add Component button not accessible');
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Verify modal is open and visible
    console.log('🔍 Step 3: Verifying modal visibility...');
    const modalState = await page.evaluate(() => {
      // Look for modal content
      const modalElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent || '';
        return text.includes('Add Component') && text.includes('Local Components') && el.offsetParent !== null;
      });
      
      if (modalElements.length > 0) {
        const modal = modalElements[0];
        const style = window.getComputedStyle(modal);
        return {
          modalFound: true,
          visible: modal.offsetParent !== null,
          display: style.display,
          opacity: style.opacity,
          zIndex: style.zIndex
        };
      }
      
      return { modalFound: false };
    });
    
    console.log('Modal state:', modalState);
    if (!modalState.modalFound || !modalState.visible) {
      throw new Error('Modal not visible after clicking Add Component');
    }
    
    // Step 4: Find and click Bloomberg Volatility component
    console.log('🎯 Step 4: Looking for Bloomberg Volatility component...');
    const componentResult = await page.evaluate(() => {
      // Look for component elements using different strategies
      const allElements = Array.from(document.querySelectorAll('*'));
      
      // Strategy 1: Look for elements with component data attributes
      const componentByDataId = document.querySelector('[data-testid="component-bloomberg-volatility"]');
      if (componentByDataId && componentByDataId.offsetParent !== null) {
        componentByDataId.click();
        return { success: true, method: 'data-testid', element: 'bloomberg-volatility' };
      }
      
      // Strategy 2: Look for clickable elements containing "Volatility"
      const volatilityElements = allElements.filter(el => {
        const text = (el.textContent || '').toLowerCase();
        return text.includes('volatility') && 
               text.includes('analysis') &&
               el.offsetParent !== null &&
               (el.tagName === 'BUTTON' || el.classList.contains('cursor-pointer'));
      });
      
      if (volatilityElements.length > 0) {
        volatilityElements[0].click();
        return { success: true, method: 'text-match', element: volatilityElements[0].textContent?.substring(0, 50) };
      }
      
      // Strategy 3: Look for any component-like clickable element
      const componentElements = allElements.filter(el => {
        const text = el.textContent || '';
        return text.length > 10 && text.length < 100 &&
               el.offsetParent !== null &&
               (el.classList.contains('cursor-pointer') || el.tagName === 'BUTTON') &&
               text.toLowerCase().includes('volatility');
      });
      
      if (componentElements.length > 0) {
        componentElements[0].click();
        return { success: true, method: 'component-match', element: componentElements[0].textContent?.substring(0, 50) };
      }
      
      // Show what's available
      const availableComponents = allElements
        .filter(el => {
          const text = el.textContent || '';
          const parent = el.parentElement?.textContent || '';
          return text.length > 5 && text.length < 100 &&
                 el.offsetParent !== null &&
                 parent.includes('Local Components') &&
                 (el.classList.contains('cursor-pointer') || el.tagName === 'BUTTON');
        })
        .map(el => el.textContent?.trim())
        .filter(text => text && !text.includes('Add Component'))
        .slice(0, 5);
      
      return { success: false, availableComponents };
    });
    
    console.log('Component selection result:', componentResult);
    if (!componentResult.success) {
      console.log('❌ No Bloomberg Volatility component found. Available components:', componentResult.availableComponents);
      throw new Error('Bloomberg Volatility component not found');
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 5: Verify component was added to grid
    console.log('✅ Step 5: Verifying component was added to grid...');
    const finalGridState = await page.evaluate(() => {
      const gridItems = document.querySelectorAll('.react-grid-item');
      const gridLayout = document.querySelector('.react-grid-layout');
      
      return {
        componentCount: gridItems.length,
        gridExists: !!gridLayout,
        componentTypes: Array.from(gridItems).map(item => {
          // Try to get component type from various attributes
          const dataGrid = item.getAttribute('data-grid');
          const classes = Array.from(item.classList);
          const text = (item.textContent || '').substring(0, 100);
          return { dataGrid, classes, text };
        })
      };
    });
    
    console.log('Final grid state:', finalGridState);
    
    const success = finalGridState.componentCount > initialGridState.componentCount;
    
    if (success) {
      console.log('🎉 SUCCESS: Component successfully added to grid!');
      console.log(`📊 Components: ${initialGridState.componentCount} → ${finalGridState.componentCount}`);
      
      // Take success screenshot
      await page.screenshot({ 
        path: '/Users/mikaeleage/GZC Intel Application AC/Main_Frontend/test-scripts/modal-test-success.png',
        fullPage: false 
      });
      
      return { success: true, componentsAdded: finalGridState.componentCount - initialGridState.componentCount };
      
    } else {
      console.log('❌ FAILED: No new components added to grid');
      return { success: false, reason: 'Component not added to grid' };
    }
    
  } catch (error) {
    console.error('💥 TEST ERROR:', error.message);
    
    // Take error screenshot
    await page.screenshot({ 
      path: '/Users/mikaeleage/GZC Intel Application AC/Main_Frontend/test-scripts/modal-test-error.png',
      fullPage: true 
    });
    
    return { success: false, error: error.message };
  } finally {
    console.log('\n🔍 Keeping browser open for inspection (close manually)');
  }
}

// Execute test
testModalFunctionality()
  .then(result => {
    console.log('\n📋 FINAL TEST RESULT:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ MODAL FIX VERIFICATION: PASSED ✅');
      console.log('The component modal visibility fix is working correctly!');
    } else {
      console.log('\n❌ MODAL FIX VERIFICATION: FAILED ❌');
      console.log('Reason:', result.reason || result.error);
    }
  })
  .catch(console.error);