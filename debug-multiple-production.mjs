#!/usr/bin/env node

/**
 * Debug the multiple component bug on production
 * Test: First component works, second fails
 */

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io';

async function debugMultipleComponents() {
  console.log('🐛 Debugging multiple component bug on production...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    slowMo: 1500,
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enhanced console logging
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('DynamicCanvas') || 
        text.includes('Component') ||
        text.includes('tab.components') ||
        text.includes('updateTab') ||
        text.includes('TabLayoutManager')) {
      console.log(`[BROWSER] ${text}`);
    }
  });
  
  page.on('pageerror', (error) => {
    console.error(`[PAGE ERROR] ${error.message}`);
  });

  try {
    console.log('📱 Loading production app...');
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    
    await page.waitForSelector('#root', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await page.screenshot({ path: 'debug-logs/multi-01-initial.png', fullPage: true });
    
    // STEP 1: Add first component
    console.log('🎯 Adding FIRST component...');
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const toolsBtn = buttons.find(btn => btn.textContent?.includes('Tools'));
      if (toolsBtn) toolsBtn.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addComponentBtn = buttons.find(btn => btn.textContent?.includes('Add Component'));
      if (addComponentBtn) addComponentBtn.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: 'debug-logs/multi-02-modal-open.png', fullPage: true });
    
    // Select first component
    await page.evaluate(() => {
      const selectors = ['.component-item', '.component-card', '.modal button'];
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          elements[0].click();
          break;
        }
      }
    });
    
    console.log('⏳ Waiting for first component to appear...');
    await new Promise(resolve => setTimeout(resolve, 4000));
    await page.screenshot({ path: 'debug-logs/multi-03-first-added.png', fullPage: true });
    
    // Check first component status
    const firstComponentStatus = await page.evaluate(() => {
      const gridItems = document.querySelectorAll('.react-grid-item, .grid-item, [data-grid]');
      const tabState = window.tabHelpers?.getCurrentTab?.();
      return {
        gridComponents: gridItems.length,
        tabComponents: tabState?.components?.length || 0,
        tabEditMode: tabState?.editMode,
        tabState: tabState ? {
          id: tabState.id,
          name: tabState.name,
          componentsLength: tabState.components?.length || 0
        } : null
      };
    });
    
    console.log('📊 First component status:', firstComponentStatus);
    
    if (firstComponentStatus.gridComponents === 0) {
      console.log('❌ CRITICAL: First component failed to appear!');
      return;
    }
    
    console.log('✅ First component successful, proceeding to second...');
    
    // STEP 2: Add second component
    console.log('🎯 Adding SECOND component...');
    
    // Open Tools again
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const toolsBtn = buttons.find(btn => btn.textContent?.includes('Tools'));
      if (toolsBtn) toolsBtn.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addComponentBtn = buttons.find(btn => btn.textContent?.includes('Add Component'));
      if (addComponentBtn) addComponentBtn.click();
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Select second component (different from first)
    await page.evaluate(() => {
      const selectors = ['.component-item', '.component-card', '.modal button'];
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 1) {
          elements[1].click(); // Second component
          break;
        }
      }
    });
    
    console.log('⏳ Waiting for second component...');
    await new Promise(resolve => setTimeout(resolve, 4000));
    await page.screenshot({ path: 'debug-logs/multi-04-second-attempt.png', fullPage: true });
    
    // Check final status
    const finalStatus = await page.evaluate(() => {
      const gridItems = document.querySelectorAll('.react-grid-item, .grid-item, [data-grid]');
      const tabState = window.tabHelpers?.getCurrentTab?.();
      
      // Also get localStorage state
      const tabLayouts = localStorage.getItem('tabLayouts');
      const userTabs = localStorage.getItem('userTabs');
      
      return {
        gridComponents: gridItems.length,
        tabComponents: tabState?.components?.length || 0,
        tabEditMode: tabState?.editMode,
        tabState: tabState ? {
          id: tabState.id,
          name: tabState.name,
          componentsLength: tabState.components?.length || 0,
          components: tabState.components?.map(c => ({
            id: c.id,
            type: c.type,
            position: c.position
          }))
        } : null,
        localStorage: {
          tabLayouts: tabLayouts ? JSON.parse(tabLayouts) : null,
          userTabs: userTabs ? JSON.parse(userTabs) : null
        }
      };
    });
    
    console.log('📊 FINAL RESULT:', JSON.stringify(finalStatus, null, 2));
    
    if (finalStatus.gridComponents >= 2) {
      console.log('🎉 SUCCESS: Multiple components working!');
    } else if (finalStatus.tabComponents >= 2 && finalStatus.gridComponents < 2) {
      console.log('⚠️  STATE MISMATCH: Components in tab state but not rendering');
      console.log(`   Tab has ${finalStatus.tabComponents} components`);
      console.log(`   Grid shows ${finalStatus.gridComponents} components`);
    } else if (finalStatus.tabComponents < 2) {
      console.log('❌ BUG CONFIRMED: Second component not added to tab state');
      console.log('   This is a TabLayoutManager issue');
    } else {
      console.log('❌ BUG CONFIRMED: Components exist but not rendering');
      console.log('   This is a DynamicCanvas issue');
    }
    
  } catch (error) {
    console.error('💥 Debug failed:', error.message);
    await page.screenshot({ path: 'debug-logs/multi-error.png', fullPage: true });
  } finally {
    console.log('🏁 Debug completed. Check debug-logs/ for screenshots.');
    await browser.close();
  }
}

debugMultipleComponents().catch(console.error);