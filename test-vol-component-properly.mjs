#!/usr/bin/env node

/**
 * PROPER DEBUG TEST: Complete vol component loading workflow
 * Tests the EXACT user flow to identify what's broken
 */

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io';

async function testVolComponentProperly() {
  console.log('🔧 PROPER VOL COMPONENT TEST - Full workflow debugging');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    slowMo: 1000,
    args: ['--no-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();
  
  // Capture ALL console messages to see errors
  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    console.log(`[${type.toUpperCase()}] ${text}`);
  });

  // Capture page errors
  page.on('pageerror', (error) => {
    console.error('🚨 PAGE ERROR:', error.message);
  });

  try {
    console.log('📱 Loading production app...');
    await page.goto(PRODUCTION_URL, { 
      waitUntil: 'networkidle0', 
      timeout: 60000 
    });
    
    // Wait for React to fully load
    console.log('⏳ Waiting for app initialization...');
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // STEP 1: Verify Tools button exists and click it
    console.log('\n🎯 STEP 1: Click Tools menu');
    const toolsClick = await page.evaluate(() => {
      const toolsBtn = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent?.includes('Tools')
      );
      if (toolsBtn) {
        toolsBtn.click();
        return { success: true, text: toolsBtn.textContent };
      }
      return { success: false, error: 'Tools button not found' };
    });
    
    console.log('Tools click result:', toolsClick);
    if (!toolsClick.success) {
      throw new Error('FAILED: Tools button not found');
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // STEP 2: Find and click Add Component button
    console.log('\n🎯 STEP 2: Click Add Component');
    const addComponentClick = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(btn => 
        btn.textContent?.includes('Add Component') && 
        btn.offsetParent !== null
      );
      if (addBtn) {
        console.log('BROWSER: Clicking Add Component button');
        addBtn.click();
        return { success: true, text: addBtn.textContent };
      }
      return { success: false, error: 'Add Component button not found or not visible' };
    });
    
    console.log('Add Component click result:', addComponentClick);
    if (!addComponentClick.success) {
      throw new Error('FAILED: Add Component button not clickable');
    }
    
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // STEP 3: Check if modal opened and find vol component
    console.log('\n🎯 STEP 3: Look for vol component in modal');
    const modalCheck = await page.evaluate(() => {
      // Check for modal presence
      const modals = document.querySelectorAll('[role="dialog"], .modal, .portal');
      const hasModal = modals.length > 0;
      
      // Look for volatility/vol component text
      const allElements = Array.from(document.querySelectorAll('*'));
      const volElements = allElements.filter(el => {
        const text = (el.textContent || '').toLowerCase();
        return text.includes('volatility') || 
               text.includes('bloomberg') || 
               text.includes('vol ') ||
               text.includes('surface');
      });
      
      const componentOptions = allElements.filter(el => {
        const text = el.textContent || '';
        const isClickable = el.tagName === 'BUTTON' || 
                           el.onclick !== null || 
                           el.getAttribute('role') === 'button' ||
                           el.style.cursor === 'pointer';
        return text.length > 5 && text.length < 50 && isClickable && el.offsetParent !== null;
      });
      
      return {
        hasModal,
        modalCount: modals.length,
        volElementsFound: volElements.length,
        volTexts: volElements.slice(0, 5).map(el => ({
          tag: el.tagName,
          text: (el.textContent || '').substring(0, 80),
          clickable: el.tagName === 'BUTTON' || el.onclick !== null
        })),
        clickableComponents: componentOptions.slice(0, 10).map(el => ({
          tag: el.tagName,
          text: (el.textContent || '').trim(),
          id: el.id || 'no-id',
          className: el.className || 'no-class'
        }))
      };
    });
    
    console.log('Modal check result:', JSON.stringify(modalCheck, null, 2));
    
    if (!modalCheck.hasModal && modalCheck.volElementsFound === 0) {
      throw new Error('FAILED: No modal opened and no vol components found');
    }
    
    // STEP 4: Try to click vol component
    console.log('\n🎯 STEP 4: Click vol component');
    const volClick = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      
      // Look for Bloomberg Volatility specifically
      let volElement = allElements.find(el => {
        const text = (el.textContent || '').toLowerCase();
        return text.includes('bloomberg') && 
               text.includes('volatility') && 
               el.offsetParent !== null &&
               (el.tagName === 'BUTTON' || el.onclick || el.getAttribute('role') === 'button');
      });
      
      // Fallback: any volatility element
      if (!volElement) {
        volElement = allElements.find(el => {
          const text = (el.textContent || '').toLowerCase();
          return text.includes('volatility') && 
                 el.offsetParent !== null &&
                 text.length < 100; // Not huge text blocks
        });
      }
      
      if (volElement) {
        console.log('BROWSER: Clicking vol element:', volElement.tagName, volElement.textContent?.substring(0, 50));
        volElement.click();
        return { success: true, element: volElement.tagName, text: volElement.textContent?.substring(0, 50) };
      }
      
      return { success: false, error: 'No vol component found to click' };
    });
    
    console.log('Vol component click result:', volClick);
    if (!volClick.success) {
      console.log('⚠️  Could not find vol component to click - checking available options...');
      
      // Debug: Show what IS available to click
      const availableOptions = await page.evaluate(() => {
        const allElements = Array.from(document.querySelectorAll('*'));
        return allElements
          .filter(el => el.offsetParent !== null && 
                       (el.textContent || '').length > 3 && 
                       (el.textContent || '').length < 100 &&
                       (el.tagName === 'BUTTON' || el.onclick || el.getAttribute('role') === 'button'))
          .slice(0, 15)
          .map(el => ({
            tag: el.tagName,
            text: (el.textContent || '').trim()
          }));
      });
      
      console.log('Available clickable options:', availableOptions);
    } else {
      console.log('✅ Vol component clicked successfully');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // STEP 5: Check if component was added to canvas
      console.log('\n🎯 STEP 5: Check if component loaded on canvas');
      const canvasCheck = await page.evaluate(() => {
        const gridItems = document.querySelectorAll('.react-grid-item, [data-grid]');
        const canvasContent = Array.from(gridItems).map(item => ({
          id: item.id || 'no-id',
          text: (item.textContent || '').substring(0, 100),
          className: item.className
        }));
        
        // Check for error messages
        const errorElements = Array.from(document.querySelectorAll('*')).filter(el => {
          const text = (el.textContent || '').toLowerCase();
          return text.includes('error') || text.includes('failed') || text.includes('not found');
        });
        
        return {
          gridItemCount: gridItems.length,
          canvasContent,
          hasErrors: errorElements.length > 0,
          errorMessages: errorElements.slice(0, 3).map(el => el.textContent?.substring(0, 100))
        };
      });
      
      console.log('Canvas check result:', JSON.stringify(canvasCheck, null, 2));
      
      if (canvasCheck.gridItemCount > 0) {
        console.log('🎉 SUCCESS: Vol component loaded on canvas!');
      } else {
        console.log('❌ FAILED: No components on canvas');
        if (canvasCheck.hasErrors) {
          console.log('🚨 ERRORS FOUND:', canvasCheck.errorMessages);
        }
      }
    }
    
  } catch (error) {
    console.error('💥 TEST FAILED:', error.message);
    
    // Debug: Take screenshot of current state
    await page.screenshot({ 
      path: '/Users/mikaeleage/GZC Intel Application AC/debug-screenshot.png',
      fullPage: true 
    });
    console.log('📸 Debug screenshot saved to debug-screenshot.png');
    
  } finally {
    console.log('\n🏁 Test completed - leaving browser open for manual inspection');
    // Don't close browser so user can inspect manually
    // await browser.close();
  }
}

testVolComponentProperly().catch(console.error);