#!/usr/bin/env node

/**
 * Fixed Puppeteer test to investigate the multiple component addition bug
 */

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io';

async function testMultipleComponentBug() {
  console.log('🚀 Starting multiple component bug investigation...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    slowMo: 1000,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Listen for console messages and errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`[BROWSER ERROR] ${msg.text()}`);
    } else if (msg.text().includes('DynamicCanvas') || msg.text().includes('Component')) {
      console.log(`[COMPONENT LOG] ${msg.text()}`);
    }
  });
  
  page.on('pageerror', (error) => {
    console.error(`[PAGE ERROR] ${error.message}`);
  });

  try {
    console.log('📱 Navigating to production app...');
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    
    console.log('⏳ Waiting for app to fully load...');
    await page.waitForSelector('#root', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for React to fully render
    
    // Take initial screenshot
    await page.screenshot({ path: 'debug-logs/01-initial-load.png', fullPage: true });
    
    // Get all buttons to understand the interface
    console.log('📋 Getting all buttons on the page...');
    const allButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.map(btn => ({
        text: btn.textContent?.trim(),
        className: btn.className,
        id: btn.id,
        style: btn.style.cssText
      }));
    });
    
    console.log('🎯 All buttons found:');
    allButtons.forEach((btn, i) => {
      if (btn.text) {
        console.log(`  ${i}: "${btn.text}" (class: ${btn.className})`);
      }
    });
    
    // Find Tools button specifically
    const toolsButtonFound = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const toolsBtn = buttons.find(btn => 
        btn.textContent?.toLowerCase().includes('tools')
      );
      return toolsBtn ? {
        text: toolsBtn.textContent,
        className: toolsBtn.className,
        rect: toolsBtn.getBoundingClientRect()
      } : null;
    });
    
    if (toolsButtonFound) {
      console.log('✅ Found Tools button:', toolsButtonFound);
      
      // Click the Tools button
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const toolsBtn = buttons.find(btn => 
          btn.textContent?.toLowerCase().includes('tools')
        );
        if (toolsBtn) toolsBtn.click();
      });
      
      console.log('🎯 Clicked Tools button');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await page.screenshot({ path: 'debug-logs/02-tools-clicked.png', fullPage: true });
      
      // Look for modal or component selection interface
      const modalFound = await page.evaluate(() => {
        const modals = document.querySelectorAll('.modal, [role="dialog"], .component-portal, .component-selector');
        if (modals.length > 0) {
          const modal = modals[0];
          return {
            found: true,
            className: modal.className,
            visible: modal.style.display !== 'none',
            rect: modal.getBoundingClientRect()
          };
        }
        return { found: false };
      });
      
      console.log('🔍 Modal check result:', modalFound);
      
      if (modalFound.found) {
        // Get available components
        const availableComponents = await page.evaluate(() => {
          const componentSelectors = [
            '.component-item',
            '.component-card', 
            '[data-component]',
            'button[data-testid*="component"]',
            '.modal button',
            '[role="dialog"] button'
          ];
          
          for (const selector of componentSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              return Array.from(elements).map((el, i) => ({
                index: i,
                text: el.textContent?.trim(),
                className: el.className,
                tagName: el.tagName,
                dataset: Object.keys(el.dataset).length > 0 ? el.dataset : undefined
              }));
            }
          }
          return [];
        });
        
        console.log('📦 Available components:', availableComponents);
        
        if (availableComponents.length > 0) {
          // Test adding first component
          console.log('🎯 Attempting to add first component...');
          
          await page.evaluate(() => {
            const selectors = ['.component-item', '.component-card', '[data-component]', '.modal button', '[role="dialog"] button'];
            for (const selector of selectors) {
              const elements = document.querySelectorAll(selector);
              if (elements.length > 0) {
                elements[0].click();
                break;
              }
            }
          });
          
          await new Promise(resolve => setTimeout(resolve, 3000));
          await page.screenshot({ path: 'debug-logs/03-first-component-clicked.png', fullPage: true });
          
          // Check if component was added to the grid
          const gridComponents = await page.evaluate(() => {
            const gridSelectors = [
              '.react-grid-item',
              '.grid-item',
              '[data-grid]',
              '.component-wrapper',
              '.dynamic-canvas .component'
            ];
            
            let totalComponents = 0;
            for (const selector of gridSelectors) {
              const elements = document.querySelectorAll(selector);
              if (elements.length > 0) {
                totalComponents = elements.length;
                break;
              }
            }
            
            // Also check tab.components from console logs
            return {
              gridComponents: totalComponents,
              tabState: window.tabHelpers?.getCurrentTab?.() || null
            };
          });
          
          console.log('📊 After first component:', gridComponents);
          
          if (gridComponents.gridComponents > 0) {
            console.log('✅ First component successfully added');
            
            // Now try adding second component
            console.log('🎯 Attempting to add second component...');
            
            // Reopen Tools modal
            await page.evaluate(() => {
              const buttons = Array.from(document.querySelectorAll('button'));
              const toolsBtn = buttons.find(btn => 
                btn.textContent?.toLowerCase().includes('tools')
              );
              if (toolsBtn) toolsBtn.click();
            });
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Click second component
            await page.evaluate(() => {
              const selectors = ['.component-item', '.component-card', '[data-component]', '.modal button', '[role="dialog"] button'];
              for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 1) {
                  elements[1].click(); // Second component
                  break;
                }
              }
            });
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            await page.screenshot({ path: 'debug-logs/04-second-component-attempt.png', fullPage: true });
            
            // Check final result
            const finalResult = await page.evaluate(() => {
              const gridSelectors = [
                '.react-grid-item',
                '.grid-item', 
                '[data-grid]',
                '.component-wrapper',
                '.dynamic-canvas .component'
              ];
              
              let totalComponents = 0;
              for (const selector of gridSelectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                  totalComponents = elements.length;
                  break;
                }
              }
              
              return {
                gridComponents: totalComponents,
                tabState: window.tabHelpers?.getCurrentTab?.() || null,
                localStorage: {
                  tabLayout: localStorage.getItem('tabLayout')?.substring(0, 200),
                  userTabs: localStorage.getItem('userTabs')?.substring(0, 200)
                }
              };
            });
            
            console.log('📊 FINAL RESULT:', finalResult);
            
            if (finalResult.gridComponents >= 2) {
              console.log('✅ SUCCESS: Multiple components working!');
            } else {
              console.log('❌ BUG CONFIRMED: Second component failed to add');
              console.log(`   Grid shows ${finalResult.gridComponents} components`);
            }
            
          } else {
            console.log('❌ BUG CONFIRMED: First component failed to add');
          }
        } else {
          console.log('❌ No components found in modal');
        }
      } else {
        console.log('❌ Component modal did not open');
      }
      
    } else {
      console.log('❌ Tools button not found');
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