#!/usr/bin/env node

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io';

async function testAddComponentModal() {
  console.log('🎯 Testing Add Component modal...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    slowMo: 1500,
    args: ['--no-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();

  try {
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    console.log('🎯 Step 1: Click Tools menu...');
    await page.click('button:has-text("Tools")').catch(() => {
      return page.evaluate(() => {
        const toolsBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent?.includes('Tools'));
        if (toolsBtn) toolsBtn.click();
      });
    });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('🎯 Step 2: Click Add Component...');
    const clickResult = await page.evaluate(() => {
      // Look for Add Component text more specifically
      const elements = Array.from(document.querySelectorAll('*'));
      const addComponentEl = elements.find(el => {
        const text = el.textContent || '';
        return text.includes('🧩Add Component') || (text.includes('Add Component') && !text.includes('Add Component Button'));
      });
      
      if (addComponentEl && addComponentEl.offsetParent !== null) {
        console.log('Found Add Component element:', addComponentEl.tagName, addComponentEl.textContent?.substring(0, 50));
        addComponentEl.click();
        return { success: true, element: addComponentEl.tagName };
      }
      return { success: false, message: 'Add Component element not found or not visible' };
    });
    
    console.log('🎯 Click result:', clickResult);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🎯 Step 3: Check for modal...');
    const modalCheck = await page.evaluate(() => {
      // Look for modal indicators
      const modals = document.querySelectorAll('[role="dialog"], .modal, .portal');
      const overlays = document.querySelectorAll('div[style*="position: fixed"], div[style*="z-index"]');
      
      // Check for component-related content
      const componentTexts = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent || '';
        return text.includes('GZC Portfolio') || 
               text.includes('Bloomberg Volatility') ||
               text.includes('Component Portal') ||
               text.includes('Select a component');
      });
      
      return {
        modalElements: modals.length,
        overlayElements: overlays.length,
        componentRelatedElements: componentTexts.length,
        componentTexts: componentTexts.map(el => ({
          tag: el.tagName,
          text: (el.textContent || '').substring(0, 100)
        })).slice(0, 5), // First 5 matches
        pageHeight: document.body.scrollHeight,
        hasPortal: !!document.querySelector('.portal, [data-portal]')
      };
    });
    
    console.log('🎯 Modal check result:', modalCheck);
    
    if (modalCheck.modalElements > 0 || modalCheck.componentRelatedElements > 0) {
      console.log('✅ SUCCESS: Component modal appears to be open!');
      
      // Try to find and click a component
      console.log('🎯 Step 4: Try to select a component...');
      const componentClick = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        const portfolioEl = elements.find(el => 
          (el.textContent || '').includes('GZC Portfolio') && el.offsetParent !== null
        );
        
        if (portfolioEl) {
          portfolioEl.click();
          return { success: true, clicked: 'GZC Portfolio' };
        }
        return { success: false, message: 'No component found to click' };
      });
      
      console.log('🎯 Component selection result:', componentClick);
      
      if (componentClick.success) {
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        // Check if component was added to canvas
        const canvasCheck = await page.evaluate(() => {
          const gridItems = document.querySelectorAll('.react-grid-item, [data-grid]');
          const canvasElements = document.querySelectorAll('.layout, .canvas');
          
          return {
            gridItems: gridItems.length,
            canvasElements: canvasElements.length,
            pageText: document.body.textContent?.substring(0, 200)
          };
        });
        
        console.log('🎯 Canvas check:', canvasCheck);
        
        if (canvasCheck.gridItems > 0) {
          console.log('🎉 ULTIMATE SUCCESS: Component added to canvas!');
        } else {
          console.log('⚠️ Component selection worked but no grid items found');
        }
      }
      
    } else {
      console.log('❌ ISSUE: Component modal did not open properly');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    console.log('🏁 Test completed');
    await browser.close();
  }
}

testAddComponentModal().catch(console.error);