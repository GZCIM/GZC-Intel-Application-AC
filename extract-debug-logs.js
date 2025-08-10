const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Extracting debug logs from application...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    console.log('1. Navigating to application...');
    await page.goto('http://localhost:9000', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for app to load
    await new Promise(r => setTimeout(r, 3000));
    
    // Extract logs from localStorage
    console.log('2. Extracting logs from localStorage...');
    const logs = await page.evaluate(() => {
      const allLogs = {};
      
      // Get all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('debug-logs')) {
          try {
            allLogs[key] = JSON.parse(localStorage.getItem(key));
          } catch (e) {
            allLogs[key] = localStorage.getItem(key);
          }
        }
      }
      
      // Also check sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.includes('debug-logs')) {
          try {
            allLogs['session_' + key] = JSON.parse(sessionStorage.getItem(key));
          } catch (e) {
            allLogs['session_' + key] = sessionStorage.getItem(key);
          }
        }
      }
      
      return allLogs;
    });
    
    // Save logs to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logDir = path.join(__dirname, 'debug-logs');
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }
    
    const logFile = path.join(logDir, `debug-logs-${timestamp}.json`);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    
    console.log(`3. Logs saved to: ${logFile}`);
    
    // Also extract console logs by triggering some actions
    console.log('4. Triggering component add flow to capture logs...');
    
    // Capture console logs
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
    });
    
    // Try to trigger the component add flow
    await page.evaluate(() => {
      // Simulate right-click on the main area
      const mainArea = document.querySelector('main, [role="main"], #root > div > div > div');
      if (mainArea) {
        const event = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: 200,
          clientY: 200,
          button: 2
        });
        mainArea.dispatchEvent(event);
      }
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Try to click Enter Edit Mode
    await page.evaluate(() => {
      const menuItems = Array.from(document.querySelectorAll('div'));
      const editMode = menuItems.find(el => el.textContent === 'Enter Edit Mode');
      if (editMode) editMode.click();
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Right-click again
    await page.evaluate(() => {
      const mainArea = document.querySelector('main, [role="main"], #root > div > div > div');
      if (mainArea) {
        const event = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: 200,
          clientY: 200,
          button: 2
        });
        mainArea.dispatchEvent(event);
      }
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Try to click Add Component
    await page.evaluate(() => {
      const menuItems = Array.from(document.querySelectorAll('div'));
      const addComp = menuItems.find(el => el.textContent === 'Add Component');
      if (addComp) addComp.click();
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    // Save console logs
    const consoleLogFile = path.join(logDir, `console-logs-${timestamp}.json`);
    fs.writeFileSync(consoleLogFile, JSON.stringify(consoleLogs, null, 2));
    console.log(`5. Console logs saved to: ${consoleLogFile}`);
    
    // Extract final localStorage state
    const finalLogs = await page.evaluate(() => {
      return localStorage.getItem(Object.keys(localStorage).find(k => k.includes('debug-logs')));
    });
    
    if (finalLogs) {
      const finalLogFile = path.join(logDir, `final-logs-${timestamp}.json`);
      fs.writeFileSync(finalLogFile, finalLogs);
      console.log(`6. Final logs saved to: ${finalLogFile}`);
    }
    
    console.log('\n=== LOG EXTRACTION COMPLETE ===');
    console.log(`Check the ${logDir} directory for log files`);
    
  } catch (error) {
    console.error('Failed to extract logs:', error);
  } finally {
    await browser.close();
  }
})();