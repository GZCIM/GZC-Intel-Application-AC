#!/usr/bin/env node

/**
 * Production test for multiple component addition
 */

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io';

async function testProductionComponents() {
  console.log('🔍 Testing production multiple component functionality...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    slowMo: 1500,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();
  
  // Capture React and application console logs
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('DynamicCanvas') || 
        text.includes('TabLayoutManager') ||
        text.includes('Component selected') ||
        text.includes('UPDATE TAB CALLED') ||
        text.includes('UPDATED TAB COMPONENTS')) {
      console.log(`[APP LOG] ${text}`);
    }
  });

  try {
    console.log('📱 Loading production app...');
    await page.goto(PRODUCTION_URL, { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });
    
    // Wait for React to mount
    console.log('⏳ Waiting for app to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if we can find any interactive elements
    const hasElements = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const toolsBtn = Array.from(buttons).find(btn => btn.textContent?.includes('Tools'));
      return {
        buttonCount: buttons.length,
        hasToolsButton: !!toolsBtn,
        pageTitle: document.title,
        hasRoot: !!document.querySelector('#root')
      };
    });
    
    console.log('📊 Page state:', hasElements);
    
    if (!hasElements.hasRoot) {
      console.log('❌ React app not loaded properly - no #root element');
      return;
    }
    
    if (!hasElements.hasToolsButton) {
      console.log('❌ Tools button not found - checking for other interactive elements...');
      
      const alternativeElements = await page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll('button'));
        return allButtons.map(btn => ({
          text: btn.textContent,
          id: btn.id,
          className: btn.className
        })).slice(0, 10); // First 10 buttons
      });
      
      console.log('Available buttons:', alternativeElements);
      await browser.close();
      return;
    }
    
    console.log('✅ App loaded successfully - testing component addition...');
    
    // Click Tools button
    console.log('🎯 Clicking Tools menu...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const toolsBtn = buttons.find(btn => btn.textContent?.includes('Tools'));
      if (toolsBtn) {
        toolsBtn.click();
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Click Add Component
    console.log('🎯 Clicking Add Component...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(btn => btn.textContent?.includes('Add Component'));
      if (addBtn) {
        console.log('Found Add Component button, clicking...');
        addBtn.click();
      } else {
        console.log('Add Component button not found');
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if component modal opened
    const modalCheck = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"], .modal, .portal');
      const allDivs = Array.from(document.querySelectorAll('div'));
      const allModals = allDivs.filter(div => 
        div.style.position === 'fixed' || 
        div.className.includes('modal') ||
        div.className.includes('portal')
      );
      
      return {
        hasModal: !!modal,
        modalCount: allModals.length,
        modalContent: modal ? modal.textContent?.substring(0, 200) : 'No modal found',
        allButtons: Array.from(document.querySelectorAll('button')).map(btn => ({
          text: btn.textContent?.trim(),
          visible: btn.style.display !== 'none' && btn.offsetParent !== null
        })).filter(btn => btn.visible).slice(0, 10)
      };
    });
    
    console.log('📊 Modal check:', modalCheck);
    
    // Try to add first component
    console.log('🎯 Adding first component...');
    await page.evaluate(() => {
      // Look for component selection elements in the modal
      const selectors = [
        '.component-item', 
        '.component-card', 
        '[data-component-id]', 
        'button[data-testid]',
        '.modal button',
        '.portal button',
        '[role="dialog"] button'
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`Found ${elements.length} elements with selector ${selector}`);
          console.log(`First element text: ${elements[0].textContent?.trim()}`);
          elements[0].click();
          return;
        }
      }
      
      // Debug: show all clickable elements
      const allClickable = document.querySelectorAll('button, [onclick], [role="button"]');
      console.log(`Total clickable elements: ${allClickable.length}`);
      
      // Try first visible button that's not navigation
      const buttons = Array.from(document.querySelectorAll('button'));
      const modalButtons = buttons.filter(btn => {
        const rect = btn.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && 
               !btn.textContent?.includes('Tools') &&
               !btn.textContent?.includes('Settings');
      });
      
      if (modalButtons.length > 0) {
        console.log(`Clicking first modal button: ${modalButtons[0].textContent?.trim()}`);
        modalButtons[0].click();
      }
    });
    
    console.log('⏳ Waiting for first component to process...');
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Check component count
    const firstCheck = await page.evaluate(() => {
      const gridItems = document.querySelectorAll('.react-grid-item, [data-grid], .grid-item');
      return {
        gridComponents: gridItems.length,
        hasCanvas: !!document.querySelector('.layout'),
        canvasText: document.querySelector('.layout')?.textContent?.substring(0, 100) || 'No canvas found'
      };
    });
    
    console.log('📊 After first component:', firstCheck);
    
    if (firstCheck.gridComponents > 0) {
      console.log('✅ First component added successfully - testing second component...');
      
      // Add second component using same process
      console.log('🎯 Adding SECOND component...');
      
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const toolsBtn = buttons.find(btn => btn.textContent?.includes('Tools'));
        if (toolsBtn) toolsBtn.click();
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const addBtn = buttons.find(btn => btn.textContent?.includes('Add Component'));
        if (addBtn) addBtn.click();
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Select second component (try different component)
      await page.evaluate(() => {
        const selectors = ['.component-item', '.component-card', '[data-component-id]'];
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 1) {
            console.log(`Selecting SECOND component via ${selector}`);
            elements[1].click(); // Second component
            return;
          }
        }
        
        // Fallback: different button in modal
        const modal = document.querySelector('[role="dialog"], .modal, .portal');
        if (modal) {
          const buttons = modal.querySelectorAll('button');
          if (buttons.length > 1) {
            console.log(`Clicking second button in modal: ${buttons[1].textContent}`);
            buttons[1].click();
          }
        }
      });
      
      console.log('⏳ Waiting for second component to process...');
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      const finalCheck = await page.evaluate(() => {
        const gridItems = document.querySelectorAll('.react-grid-item, [data-grid], .grid-item');
        return {
          gridComponents: gridItems.length,
          componentDetails: Array.from(gridItems).map(item => ({
            id: item.id || 'no-id',
            className: item.className,
            content: item.textContent?.substring(0, 30) || 'no-content'
          }))
        };
      });
      
      console.log('📊 FINAL RESULT:', finalCheck);
      
      if (finalCheck.gridComponents >= 2) {
        console.log('🎉 SUCCESS: Multiple components working! Found', finalCheck.gridComponents, 'components');
      } else {
        console.log('❌ BUG PERSISTS: Only', finalCheck.gridComponents, 'component(s) showing');
        console.log('Component details:', finalCheck.componentDetails);
      }
    } else {
      console.log('❌ First component failed to add - no grid items found');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  } finally {
    console.log('🏁 Production test completed');
    await browser.close();
  }
}

testProductionComponents().catch(console.error);