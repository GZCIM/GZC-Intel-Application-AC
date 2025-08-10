#!/usr/bin/env node

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io';

async function debugComponents() {
  console.log('🔍 Debugging Component Loading');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    slowMo: 1000,
    defaultViewport: { width: 1600, height: 1000 }
  });
  
  const page = await browser.newPage();

  // Capture console logs
  page.on('console', msg => {
    console.log(`🖥️  BROWSER: ${msg.type()}: ${msg.text()}`);
  });

  try {
    console.log('🔄 Loading application...');
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Click Tools
    console.log('🔧 Clicking Tools...');
    await page.evaluate(() => {
      const toolsBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent?.includes('Tools'));
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
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Debug component inventory state
    console.log('🔍 Checking component inventory...');
    const inventoryDebug = await page.evaluate(() => {
      // Access the component inventory from the global scope (if available in dev mode)
      const inventory = window.componentInventory;
      
      if (inventory) {
        const allComponents = inventory.getAllComponents();
        const searchResult = inventory.searchComponents('');
        const portfolioComponent = inventory.getComponent('portfolio');
        const volatilityComponent = inventory.getComponent('bloomberg-volatility');
        
        return {
          inventoryExists: true,
          totalComponents: allComponents.length,
          searchResultCount: searchResult.length,
          portfolioExists: !!portfolioComponent,
          volatilityExists: !!volatilityComponent,
          allComponentIds: allComponents.map(c => c.id),
          portfolioComponent: portfolioComponent,
          volatilityComponent: volatilityComponent
        };
      }
      
      return { inventoryExists: false };
    });
    
    console.log('📊 Component Inventory Debug:', JSON.stringify(inventoryDebug, null, 2));
    
    // Check what's actually rendered in the modal
    console.log('🔍 Checking modal content...');
    const modalContent = await page.evaluate(() => {
      const modalElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent || '';
        return text.includes('Add Component') && text.includes('Local Components');
      });
      
      if (modalElements.length > 0) {
        const modal = modalElements[0];
        
        // Get all component cards
        const componentCards = Array.from(modal.querySelectorAll('div')).filter(div => {
          const style = window.getComputedStyle(div);
          return style.cursor === 'pointer' && div.textContent && div.textContent.length > 10 && div.textContent.length < 200;
        });
        
        return {
          modalExists: true,
          modalText: modal.textContent?.substring(0, 200),
          componentCardsFound: componentCards.length,
          componentCards: componentCards.map(card => ({
            text: card.textContent?.trim().substring(0, 100),
            classes: Array.from(card.classList),
            style: {
              cursor: window.getComputedStyle(card).cursor,
              display: window.getComputedStyle(card).display,
              opacity: window.getComputedStyle(card).opacity
            }
          }))
        };
      }
      
      return { modalExists: false };
    });
    
    console.log('🎯 Modal Content Debug:', JSON.stringify(modalContent, null, 2));
    
    // Take screenshot for visual inspection
    await page.screenshot({ 
      path: '/Users/mikaeleage/GZC Intel Application AC/Main_Frontend/test-scripts/component-debug.png',
      fullPage: false 
    });
    
    console.log('📸 Debug screenshot saved');
    
  } catch (error) {
    console.error('💥 Debug failed:', error.message);
  } finally {
    console.log('🔍 Keeping browser open for manual inspection');
  }
}

debugComponents().catch(console.error);