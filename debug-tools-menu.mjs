#!/usr/bin/env node

/**
 * Debug Tools Menu functionality
 */

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io';

async function debugToolsMenu() {
  console.log('🔧 Debugging Tools Menu...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    slowMo: 2000,
    args: ['--no-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();
  
  page.on('console', (msg) => {
    const text = msg.text();
    console.log(`[BROWSER] ${text}`);
  });

  try {
    console.log('📱 Loading production app...');
    await page.goto(PRODUCTION_URL, { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });
    
    await page.waitForSelector('#root', { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Debug: Check initial state
    const initialState = await page.evaluate(() => {
      return {
        hasRoot: !!document.querySelector('#root'),
        buttonCount: document.querySelectorAll('button').length,
        toolsButton: !!Array.from(document.querySelectorAll('button')).find(btn => btn.textContent?.includes('Tools')),
        pageTitle: document.title
      };
    });
    
    console.log('🔍 Initial state:', initialState);
    
    if (!initialState.toolsButton) {
      console.log('❌ No Tools button found');
      await browser.close();
      return;
    }
    
    // Click Tools button
    console.log('🎯 Clicking Tools button...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const toolsBtn = buttons.find(btn => btn.textContent?.includes('Tools'));
      if (toolsBtn) {
        console.log('BROWSER: Clicking Tools button');
        toolsBtn.click();
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check what menu items are available
    const menuState = await page.evaluate(() => {
      // Check for menu items
      const allButtons = Array.from(document.querySelectorAll('button'));
      const allDivs = Array.from(document.querySelectorAll('div'));
      const allElements = [...allButtons, ...allDivs];
      
      const menuItems = allElements.filter(el => 
        el.textContent?.includes('Add Component') ||
        el.textContent?.includes('Authorization') ||
        el.textContent?.includes('Bloomberg')
      );
      
      return {
        totalButtons: allButtons.length,
        menuItemsFound: menuItems.length,
        menuTexts: menuItems.map(item => ({
          tagName: item.tagName,
          text: item.textContent?.trim(),
          visible: item.offsetParent !== null,
          className: item.className
        })),
        // Check for Add Component specifically
        hasAddComponent: !!allElements.find(el => el.textContent?.includes('Add Component'))
      };
    });
    
    console.log('🔍 Menu state:', menuState);
    
    if (menuState.hasAddComponent) {
      console.log('✅ Add Component found in menu - clicking...');
      
      await page.evaluate(() => {
        const allElements = [...Array.from(document.querySelectorAll('button')), ...Array.from(document.querySelectorAll('div'))];
        const addComponentEl = allElements.find(el => el.textContent?.includes('Add Component'));
        if (addComponentEl) {
          console.log('BROWSER: Clicking Add Component');
          addComponentEl.click();
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if modal opened
      const modalState = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"], .modal, .portal');
        const modalContent = modal?.textContent || 'No modal content';
        
        return {
          hasModal: !!modal,
          modalContent: modalContent.substring(0, 200),
          modalVisible: modal ? modal.offsetParent !== null : false
        };
      });
      
      console.log('🔍 Modal state:', modalState);
      
      if (modalState.hasModal) {
        console.log('✅ Component portal modal opened successfully!');
      } else {
        console.log('❌ Component portal modal failed to open');
      }
      
    } else {
      console.log('❌ Add Component not found in Tools menu');
      console.log('Available menu items:', menuState.menuTexts);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  } finally {
    console.log('🏁 Debug completed');
    await browser.close();
  }
}

debugToolsMenu().catch(console.error);