#!/usr/bin/env node

import puppeteer from 'puppeteer';

const PRODUCTION_URL = 'https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io';

async function inspectToolsMenu() {
  console.log('🔍 Inspecting Tools menu structure...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    slowMo: 2000,
    args: ['--no-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();

  try {
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    console.log('🎯 Step 1: Click Tools and inspect menu...');
    await page.evaluate(() => {
      const toolsBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent?.includes('Tools'));
      if (toolsBtn) {
        toolsBtn.click();
        console.log('BROWSER: Tools menu clicked');
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Detailed inspection of menu elements
    const menuAnalysis = await page.evaluate(() => {
      // Find all elements that might be menu items
      const allElements = Array.from(document.querySelectorAll('*'));
      
      const menuCandidates = allElements.filter(el => {
        const text = el.textContent || '';
        const isVisible = el.offsetParent !== null;
        const hasMenuText = text.includes('Add Component') || 
                           text.includes('Authorization') ||
                           text.includes('Bloomberg');
        
        return hasMenuText && isVisible;
      });
      
      const menuDetails = menuCandidates.map(el => ({
        tagName: el.tagName,
        id: el.id || 'no-id',
        className: el.className || 'no-class',
        textContent: (el.textContent || '').trim().substring(0, 100),
        style: {
          position: el.style.position,
          display: el.style.display,
          visibility: el.style.visibility,
          zIndex: el.style.zIndex
        },
        boundingRect: el.getBoundingClientRect(),
        clickable: el.tagName === 'BUTTON' || el.onclick !== null || el.getAttribute('role') === 'button'
      }));
      
      // Also check for specific Add Component elements
      const addComponentElements = allElements.filter(el => {
        const text = el.textContent || '';
        return text.includes('Add Component') && !text.includes('Add Component Button');
      });
      
      return {
        totalMenuCandidates: menuCandidates.length,
        menuDetails: menuDetails,
        addComponentSpecific: addComponentElements.map(el => ({
          tagName: el.tagName,
          textContent: (el.textContent || '').substring(0, 50),
          visible: el.offsetParent !== null,
          rect: el.getBoundingClientRect(),
          clickable: el.tagName === 'BUTTON' || el.onclick !== null
        }))
      };
    });
    
    console.log('🔍 Menu analysis:');
    console.log('Total candidates:', menuAnalysis.totalMenuCandidates);
    console.log('Menu details:', JSON.stringify(menuAnalysis.menuDetails, null, 2));
    console.log('Add Component specific:', JSON.stringify(menuAnalysis.addComponentSpecific, null, 2));
    
    // Try to find a clickable Add Component element
    const clickAttempt = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      
      // Look for the most specific Add Component element
      for (const el of allElements) {
        const text = el.textContent || '';
        if (text.includes('Add Component') && 
            !text.includes('Add Component Button') && 
            el.offsetParent !== null &&
            (el.tagName === 'DIV' || el.tagName === 'BUTTON' || el.onclick)) {
          
          // Check if it's actually clickable area
          const rect = el.getBoundingClientRect();
          if (rect.width > 10 && rect.height > 10) {
            console.log('BROWSER: Attempting click on:', el.tagName, text.substring(0, 30));
            el.click();
            return { success: true, element: el.tagName, text: text.substring(0, 30) };
          }
        }
      }
      return { success: false, message: 'No suitable Add Component element found' };
    });
    
    console.log('🎯 Click attempt result:', clickAttempt);
    
    if (clickAttempt.success) {
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      // Check if anything changed (modal opened, etc.)
      const afterClickCheck = await page.evaluate(() => {
        return {
          modals: document.querySelectorAll('[role="dialog"], .modal').length,
          portals: document.querySelectorAll('.portal, [data-portal]').length,
          overlays: document.querySelectorAll('div[style*="position: fixed"]').length,
          totalDivs: document.querySelectorAll('div').length
        };
      });
      
      console.log('🔍 After click check:', afterClickCheck);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    console.log('🏁 Inspection completed');
    await browser.close();
  }
}

inspectToolsMenu().catch(console.error);