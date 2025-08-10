#!/usr/bin/env node

/**
 * Puppeteer test to investigate the multiple component addition bug
 * Tests the exact user flow that fails according to PROJECT_STATUS.md
 */

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io';

async function testMultipleComponentBug() {
  console.log('🚀 Starting multiple component bug investigation...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    slowMo: 500,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Listen for console messages and errors
  page.on('console', (msg) => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });
  
  page.on('pageerror', (error) => {
    console.error(`[PAGE ERROR] ${error.message}`);
  });
  
  page.on('requestfailed', (req) => {
    console.error(`[REQUEST FAILED] ${req.url()} - ${req.failure().errorText}`);
  });

  try {
    console.log('📱 Navigating to production app...');
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    
    console.log('⏳ Waiting for app to fully load...');
    await page.waitForSelector('.app-container, [data-testid="app"], #root', { timeout: 10000 });
    
    // Take initial screenshot
    await page.screenshot({ path: 'debug-logs/01-initial-load.png', fullPage: true });
    
    // Check if Tools button exists
    console.log('🔍 Looking for Tools button...');
    const toolsButton = await page.$('button:has-text("Tools"), [data-testid*="tools"], .tools-button');
    
    if (!toolsButton) {
      // Try alternative selectors
      const alternativeSelectors = [
        'button[class*="tool"]',
        'button[class*="Tool"]',
        '[data-cy*="tool"]',
        '[aria-label*="tool"]',
        'button:contains("Tools")',
        '.header button',
        '.professional-header button'
      ];
      
      console.log('🔍 Tools button not found with standard selector, trying alternatives...');
      for (const selector of alternativeSelectors) {
        const element = await page.$(selector);
        if (element) {
          console.log(`✅ Found potential Tools button with selector: ${selector}`);
          const text = await element.evaluate(el => el.textContent);
          console.log(`Button text: "${text}"`);
        }
      }
    }
    
    // Get all buttons to understand the interface
    console.log('📋 Getting all buttons on the page...');
    const allButtons = await page.$$eval('button', buttons => 
      buttons.map(btn => ({
        text: btn.textContent?.trim(),
        className: btn.className,
        id: btn.id,
        dataset: Object.keys(btn.dataset).length > 0 ? btn.dataset : undefined
      }))
    );
    
    console.log('🎯 All buttons found:', JSON.stringify(allButtons, null, 2));
    
    // Try to find and click the Tools button
    let foundTools = false;
    for (const buttonInfo of allButtons) {
      if (buttonInfo.text?.toLowerCase().includes('tools') || 
          buttonInfo.className?.toLowerCase().includes('tools') ||
          buttonInfo.id?.toLowerCase().includes('tools')) {
        
        console.log(`🎯 Found Tools button: ${JSON.stringify(buttonInfo)}`);
        
        try {
          await page.click(`button:has-text("${buttonInfo.text}")`);
          foundTools = true;
          console.log('✅ Clicked Tools button');
          
          await page.waitForTimeout(2000); // Wait for modal to open
          await page.screenshot({ path: 'debug-logs/02-tools-modal-open.png', fullPage: true });
          
          break;
        } catch (clickError) {
          console.log(`❌ Failed to click Tools button: ${clickError.message}`);
        }
      }
    }
    
    if (!foundTools) {
      console.log('❌ Could not find or click Tools button');
      
      // Check if we need to select a user first
      console.log('🔍 Looking for user selection...');
      const userDropdown = await page.$('select, .user-selector, [data-testid*="user"]');
      if (userDropdown) {
        console.log('👤 Found user selector, attempting to select a user...');
        await page.select('select', '0'); // Select first user
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'debug-logs/02b-user-selected.png', fullPage: true });
      }
      
      // Try right-click context menu
      console.log('🖱️ Trying right-click context menu for component addition...');
      await page.click('.main-content, .canvas, .dashboard', { button: 'right' });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'debug-logs/03-context-menu.png', fullPage: true });
    }
    
    // Look for component modal or component list
    console.log('🔍 Looking for component selection interface...');
    const componentModal = await page.$('.modal, .component-modal, .component-portal');
    
    if (componentModal) {
      console.log('✅ Found component modal');
      
      // Get available components
      const components = await page.$$eval('.component-item, .component-card, button[data-component]', 
        elements => elements.map(el => ({
          text: el.textContent?.trim(),
          dataset: el.dataset
        }))
      );
      
      console.log('📦 Available components:', JSON.stringify(components, null, 2));
      
      // Test adding first component
      if (components.length > 0) {
        console.log('🎯 Attempting to add first component...');
        await page.click('.component-item:first-child, .component-card:first-child');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'debug-logs/04-first-component-added.png', fullPage: true });
        
        // Check if component appeared
        const componentElements = await page.$$('.grid-item, .component, [data-grid]');
        console.log(`📊 Components on grid: ${componentElements.length}`);
        
        if (componentElements.length > 0) {
          console.log('✅ First component successfully added');
          
          // Try adding second component
          console.log('🎯 Attempting to add second component...');
          
          // Reopen Tools if needed
          const toolsBtn = await page.$('button:has-text("Tools")');
          if (toolsBtn) {
            await page.click('button:has-text("Tools")');
            await page.waitForTimeout(1000);
          }
          
          // Add second component
          const secondComponent = await page.$('.component-item:nth-child(2), .component-card:nth-child(2)');
          if (secondComponent) {
            await page.click('.component-item:nth-child(2), .component-card:nth-child(2)');
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'debug-logs/05-second-component-attempt.png', fullPage: true });
            
            // Check final result
            const finalComponents = await page.$$('.grid-item, .component, [data-grid]');
            console.log(`📊 Final components on grid: ${finalComponents.length}`);
            
            if (finalComponents.length >= 2) {
              console.log('✅ SUCCESS: Multiple components working!');
            } else {
              console.log('❌ BUG CONFIRMED: Second component not added');
              
              // Get React state information
              const reactState = await page.evaluate(() => {
                const root = document.getElementById('root');
                return {
                  hasReactFiber: !!root._reactInternalFiber || !!root._reactInternals,
                  localStorage: Object.keys(localStorage).map(key => ({
                    key,
                    value: localStorage.getItem(key)?.substring(0, 100)
                  }))
                };
              });
              
              console.log('🔍 React state info:', JSON.stringify(reactState, null, 2));
            }
          }
        } else {
          console.log('❌ BUG CONFIRMED: First component not added');
        }
      }
    } else {
      console.log('❌ Could not find component modal');
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    await page.screenshot({ path: 'debug-logs/error-screenshot.png', fullPage: true });
  } finally {
    console.log('🏁 Test completed. Check debug-logs/ for screenshots.');
    await browser.close();
  }
}

// Create debug logs directory
import { mkdirSync } from 'fs';
try {
  mkdirSync('debug-logs', { recursive: true });
} catch (e) {
  // Directory already exists
}

testMultipleComponentBug().catch(console.error);