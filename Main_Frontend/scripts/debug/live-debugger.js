#!/usr/bin/env node

/**
 * Chrome DevTools Live Debugger
 * Interactive debugging session with real-time event monitoring
 */

import puppeteer from 'puppeteer';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function liveDebugger() {
  try {
    console.log('🔧 Chrome DevTools Live Debugger');
    console.log('================================\n');
    
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });

    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('localhost:3500')) || pages[0];
    
    console.log(`✅ Connected to: ${page.url()}\n`);

    // Set up console message forwarding
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        console.log(`❌ [ERROR] ${text}`);
      } else if (type === 'warning') {
        console.log(`⚠️  [WARN] ${text}`);
      } else {
        console.log(`📝 [LOG] ${text}`);
      }
    });

    // Available commands
    const commands = {
      help: () => {
        console.log('\n📚 Available Commands:');
        console.log('  events    - Analyze all event listeners');
        console.log('  freeze    - Simulate widget freeze scenario');
        console.log('  monitor   - Start real-time event monitoring');
        console.log('  inspect   - Inspect specific element');
        console.log('  clear     - Clear console');
        console.log('  exit      - Exit debugger\n');
      },

      events: async () => {
        // Get CDP session
        const client = await page.createCDPSession();
        await client.send('Runtime.enable');
        await client.send('DOM.enable');
        
        // Get widget elements
        const widgets = await page.evaluate(() => {
          const headers = document.querySelectorAll('.widget-header');
          return Array.from(headers).map((header, index) => ({
            index,
            className: header.className
          }));
        });
        
        console.log('\n🎯 Event Listener Analysis:');
        
        for (const widget of widgets) {
          // Get element's object ID
          const { result } = await client.send('Runtime.evaluate', {
            expression: `document.querySelectorAll('.widget-header')[${widget.index}]`,
            returnByValue: false
          });
          
          if (result && result.objectId) {
            // Get listeners
            const { listeners } = await client.send('DOMDebugger.getEventListeners', {
              objectId: result.objectId,
              depth: 0
            });
            
            // Get parent listeners
            const { result: parentResult } = await client.send('Runtime.evaluate', {
              expression: `document.querySelectorAll('.widget-header')[${widget.index}].parentElement`,
              returnByValue: false
            });
            
            let parentListeners = [];
            if (parentResult && parentResult.objectId) {
              const response = await client.send('DOMDebugger.getEventListeners', {
                objectId: parentResult.objectId,
                depth: 0
              });
              parentListeners = response.listeners;
            }
            
            // Count by type
            const listenerTypes = {};
            listeners.forEach(l => {
              listenerTypes[l.type] = (listenerTypes[l.type] || 0) + 1;
            });
            
            const parentTypes = {};
            parentListeners.forEach(l => {
              parentTypes[l.type] = (parentTypes[l.type] || 0) + 1;
            });
            
            console.log(`\nWidget ${widget.index}:`);
            console.log(`  Element: ${widget.className}`);
            console.log(`  Listeners: ${Object.entries(listenerTypes).map(([type, count]) => `${type}(${count})`).join(', ') || 'none'}`);
            console.log(`  Parent: ${Object.entries(parentTypes).map(([type, count]) => `${type}(${count})`).join(', ') || 'none'}`);
          }
        }
      },

      freeze: async () => {
        console.log('\n🧊 Simulating freeze scenario...');
        
        await page.evaluate(() => {
          const widget = document.querySelector('.widget-header');
          if (widget) {
            // Simulate conflicting event handlers
            widget.addEventListener('mousedown', (e) => {
              console.log('Freeze Test: mousedown triggered');
              e.stopPropagation();
            });
            
            widget.addEventListener('click', (e) => {
              console.log('Freeze Test: click triggered');
              e.preventDefault();
            });
            
            // Trigger click
            widget.click();
          }
        });
        
        console.log('Freeze simulation complete. Check for conflicts above.');
      },

      monitor: async () => {
        console.log('\n👁️  Starting event monitor (press Enter to stop)...\n');
        
        await page.evaluate(() => {
          window.__stopMonitor = false;
          
          const events = ['click', 'mousedown', 'mouseup', 'dragstart', 'dragend', 'mousemove'];
          const handlers = [];
          
          events.forEach(eventType => {
            const handler = (e) => {
              if (!window.__stopMonitor) {
                const target = e.target;
                const className = target.className || target.tagName;
                console.log(`[${eventType}] on ${className} at ${e.timeStamp.toFixed(2)}ms`);
              }
            };
            
            document.addEventListener(eventType, handler, true);
            handlers.push({ type: eventType, handler });
          });
          
          window.__cleanupMonitor = () => {
            handlers.forEach(({ type, handler }) => {
              document.removeEventListener(type, handler, true);
            });
          };
        });
        
        // Wait for Enter key
        await new Promise(resolve => {
          const tempRl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });
          tempRl.question('', () => {
            tempRl.close();
            resolve();
          });
        });
        
        await page.evaluate(() => {
          window.__stopMonitor = true;
          if (window.__cleanupMonitor) window.__cleanupMonitor();
        });
        
        console.log('Monitor stopped.\n');
      },

      inspect: async () => {
        const selector = await new Promise(resolve => {
          rl.question('Enter CSS selector: ', resolve);
        });
        
        try {
          const elementInfo = await page.evaluate((sel) => {
            const element = document.querySelector(sel);
            if (!element) return { error: 'Element not found' };
            
            const rect = element.getBoundingClientRect();
            const styles = window.getComputedStyle(element);
            
            return {
              tagName: element.tagName,
              className: element.className,
              id: element.id,
              dimensions: `${rect.width}x${rect.height}`,
              position: `(${rect.left}, ${rect.top})`,
              display: styles.display,
              zIndex: styles.zIndex
            };
          }, selector);
          
          if (!elementInfo.error) {
            // Get listeners using CDP
            const client = await page.createCDPSession();
            await client.send('Runtime.enable');
            await client.send('DOM.enable');
            
            const { result } = await client.send('Runtime.evaluate', {
              expression: selector,
              returnByValue: false
            });
            
            if (result && result.objectId) {
              const { listeners } = await client.send('DOMDebugger.getEventListeners', {
                objectId: result.objectId,
                depth: 0
              });
              
              elementInfo.listeners = [...new Set(listeners.map(l => l.type))];
            }
          }
          
          const result = elementInfo;
          
          if (result.error) {
            console.log(`❌ ${result.error}`);
          } else {
            console.log('\n🔍 Element Inspector:');
            Object.entries(result).forEach(([key, value]) => {
              console.log(`  ${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
            });
          }
        } catch (error) {
          console.log(`❌ Error: ${error.message}`);
        }
      },

      clear: () => {
        console.clear();
        console.log('🔧 Chrome DevTools Live Debugger\n');
      },

      exit: () => {
        console.log('\n👋 Goodbye!');
        process.exit(0);
      }
    };

    // Show help on start
    commands.help();

    // Interactive prompt
    const prompt = () => {
      rl.question('debug> ', async (input) => {
        const cmd = input.trim().toLowerCase();
        
        if (commands[cmd]) {
          await commands[cmd]();
        } else if (cmd) {
          console.log(`Unknown command: ${cmd}. Type 'help' for available commands.`);
        }
        
        prompt();
      });
    };

    prompt();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n👋 Exiting...');
  process.exit(0);
});

liveDebugger();