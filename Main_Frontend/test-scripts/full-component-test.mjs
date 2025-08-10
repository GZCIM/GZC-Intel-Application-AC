#!/usr/bin/env node

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io';

async function fullComponentTest() {
  console.log('🔍 FULL COMPONENT TEST - VERIFY EVERYTHING WORKS');
  console.log('='*60);
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    slowMo: 1000,
    defaultViewport: { width: 1600, height: 1000 }
  });
  
  const page = await browser.newPage();
  
  // Capture ALL console output
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Component') || text.includes('Modal') || text.includes('error')) {
      console.log(`[CONSOLE] ${msg.type()}: ${text}`);
    }
  });

  const results = {
    modalOpens: false,
    componentsVisible: false,
    componentsClickable: false,
    componentsAdded: [],
    errors: []
  };

  try {
    // STEP 1: Load the app
    console.log('\n📦 STEP 1: Loading application...');
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const version = await page.evaluate(() => {
      const body = document.body.textContent || '';
      const match = body.match(/v\d{8}-\d{6}/);
      return match ? match[0] : 'Unknown';
    });
    console.log(`✅ App loaded. Version: ${version}`);
    
    // STEP 2: Open Tools menu
    console.log('\n📦 STEP 2: Opening Tools menu...');
    const toolsClicked = await page.evaluate(() => {
      const toolsBtn = Array.from(document.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Tools'));
      if (toolsBtn) {
        toolsBtn.click();
        return true;
      }
      return false;
    });
    
    if (!toolsClicked) {
      throw new Error('Could not find Tools button');
    }
    console.log('✅ Tools menu clicked');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // STEP 3: Click Add Component
    console.log('\n📦 STEP 3: Clicking Add Component...');
    const addComponentClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(btn => 
        btn.textContent?.includes('Add Component') && 
        btn.offsetParent !== null
      );
      if (addBtn) {
        addBtn.click();
        return true;
      }
      return false;
    });
    
    if (!addComponentClicked) {
      throw new Error('Could not find Add Component button');
    }
    console.log('✅ Add Component clicked');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // STEP 4: Check if modal is REALLY open and components are VISIBLE
    console.log('\n📦 STEP 4: Checking modal and components...');
    const modalCheck = await page.evaluate(() => {
      // Find the modal by z-index
      const modal = Array.from(document.querySelectorAll('*')).find(el => {
        const style = window.getComputedStyle(el);
        return style.zIndex === '999999' && style.position === 'fixed';
      });
      
      if (!modal) return { error: 'No modal found' };
      
      // Check if modal is visible
      const modalStyle = window.getComputedStyle(modal);
      const isVisible = modalStyle.display !== 'none' && 
                       modalStyle.visibility !== 'hidden' && 
                       parseFloat(modalStyle.opacity) > 0;
      
      if (!isVisible) return { error: 'Modal not visible', style: modalStyle };
      
      // Find component cards inside the modal
      const componentCards = Array.from(modal.querySelectorAll('div')).filter(div => {
        const style = window.getComputedStyle(div);
        const text = div.textContent || '';
        return style.cursor === 'pointer' && 
               text.length > 10 && 
               text.length < 200 &&
               !text.includes('Local Components') &&
               !text.includes('Import from');
      });
      
      // Get component names
      const componentNames = componentCards.map(card => {
        const h4 = card.querySelector('h4');
        return h4 ? h4.textContent : card.textContent?.substring(0, 30);
      });
      
      return {
        modalFound: true,
        modalVisible: isVisible,
        componentCount: componentCards.length,
        componentNames: componentNames,
        modalHTML: modal.innerHTML.substring(0, 500)
      };
    });
    
    console.log('Modal check result:', modalCheck);
    results.modalOpens = modalCheck.modalFound && modalCheck.modalVisible;
    results.componentsVisible = modalCheck.componentCount > 0;
    
    if (!results.componentsVisible) {
      console.log('❌ NO COMPONENTS VISIBLE IN MODAL');
      console.log('Modal HTML preview:', modalCheck.modalHTML);
      throw new Error('Components not visible in modal');
    }
    
    console.log(`✅ Found ${modalCheck.componentCount} components:`, modalCheck.componentNames);
    
    // STEP 5: Try to add EACH component
    console.log('\n📦 STEP 5: Adding components to grid...');
    const componentsToAdd = ['Portfolio Manager', 'GZC Portfolio', 'GZC Analytics', 'Volatility Analysis'];
    
    for (const componentName of componentsToAdd) {
      console.log(`\n🎯 Trying to add: ${componentName}`);
      
      // Click the component
      const clickResult = await page.evaluate((name) => {
        const modal = Array.from(document.querySelectorAll('*')).find(el => {
          const style = window.getComputedStyle(el);
          return style.zIndex === '999999' && style.position === 'fixed';
        });
        
        if (!modal) return { error: 'Modal not found' };
        
        const cards = Array.from(modal.querySelectorAll('div')).filter(div => {
          const text = div.textContent || '';
          return text.includes(name) && window.getComputedStyle(div).cursor === 'pointer';
        });
        
        if (cards.length > 0) {
          cards[0].click();
          return { success: true, clicked: name };
        }
        
        return { success: false, error: `Component ${name} not found` };
      }, componentName);
      
      if (clickResult.success) {
        console.log(`✅ Clicked ${componentName}`);
        results.componentsAdded.push(componentName);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if component was added to grid
        const gridCheck = await page.evaluate(() => {
          const gridItems = document.querySelectorAll('.react-grid-item');
          return gridItems.length;
        });
        
        console.log(`   Grid now has ${gridCheck} components`);
        
        // Re-open modal for next component
        if (componentsToAdd.indexOf(componentName) < componentsToAdd.length - 1) {
          console.log('   Re-opening modal for next component...');
          
          // Click Tools again
          await page.evaluate(() => {
            const toolsBtn = Array.from(document.querySelectorAll('button'))
              .find(btn => btn.textContent?.includes('Tools'));
            if (toolsBtn) toolsBtn.click();
          });
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Click Add Component again
          await page.evaluate(() => {
            const addBtn = Array.from(document.querySelectorAll('button'))
              .find(btn => btn.textContent?.includes('Add Component'));
            if (addBtn) addBtn.click();
          });
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } else {
        console.log(`❌ Failed to add ${componentName}:`, clickResult.error);
        results.errors.push(`Failed to add ${componentName}`);
      }
    }
    
    // FINAL CHECK: Count components on grid
    console.log('\n📦 FINAL CHECK: Verifying all components on grid...');
    const finalGridState = await page.evaluate(() => {
      const gridItems = document.querySelectorAll('.react-grid-item');
      const gridLayout = document.querySelector('.react-grid-layout');
      
      return {
        hasGrid: !!gridLayout,
        componentCount: gridItems.length,
        gridHTML: gridLayout ? gridLayout.innerHTML.substring(0, 200) : 'No grid found'
      };
    });
    
    console.log('Final grid state:', finalGridState);
    results.componentsClickable = results.componentsAdded.length > 0;
    
    // Take screenshot
    await page.screenshot({ 
      path: '/Users/mikaeleage/GZC Intel Application AC/Main_Frontend/test-scripts/full-test-result.png',
      fullPage: false 
    });
    
    // RESULTS SUMMARY
    console.log('\n' + '='*60);
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='*60);
    console.log(`Modal Opens: ${results.modalOpens ? '✅ YES' : '❌ NO'}`);
    console.log(`Components Visible: ${results.componentsVisible ? '✅ YES' : '❌ NO'}`);
    console.log(`Components Clickable: ${results.componentsClickable ? '✅ YES' : '❌ NO'}`);
    console.log(`Components Added: ${results.componentsAdded.length}/${componentsToAdd.length}`);
    console.log(`  - Added: ${results.componentsAdded.join(', ') || 'None'}`);
    console.log(`Grid Component Count: ${finalGridState.componentCount}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      results.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    const SUCCESS = results.modalOpens && 
                   results.componentsVisible && 
                   results.componentsClickable && 
                   results.componentsAdded.length === componentsToAdd.length;
    
    if (SUCCESS) {
      console.log('\n🎉 SUCCESS: ALL COMPONENTS WORKING!');
    } else {
      console.log('\n❌ FAILURE: COMPONENTS NOT FULLY WORKING');
    }
    
    return { success: SUCCESS, results };
    
  } catch (error) {
    console.error('\n💥 TEST CRASHED:', error.message);
    results.errors.push(error.message);
    return { success: false, error: error.message, results };
  } finally {
    console.log('\n🔍 Browser remains open for inspection');
  }
}

// Run the test
fullComponentTest()
  .then(result => {
    console.log('\n' + '='*60);
    if (result.success) {
      console.log('✅ VERIFICATION COMPLETE: EVERYTHING WORKS!');
      console.log('You can now build tabs with all components.');
    } else {
      console.log('❌ VERIFICATION FAILED: COMPONENTS NOT WORKING');
      console.log('Issue:', result.error || 'See errors above');
    }
    console.log('='*60);
  })
  .catch(console.error);