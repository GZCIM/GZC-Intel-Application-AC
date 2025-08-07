#!/usr/bin/env node

/**
 * Chrome DevTools Performance Monitor
 * Tracks performance metrics and identifies bottlenecks
 */

import puppeteer from 'puppeteer';

async function monitorPerformance() {
  try {
    console.log('📊 Starting Performance Monitor...');
    
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });

    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('localhost:3500')) || pages[0];
    
    console.log(`📄 Monitoring: ${page.url()}\n`);

    // Enable performance metrics
    await page.evaluateOnNewDocument(() => {
      window.__performanceMetrics = [];
      
      // Monitor long tasks
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            window.__performanceMetrics.push({
              type: 'long-task',
              duration: entry.duration,
              timestamp: performance.now()
            });
            console.warn(`⚠️  Long task detected: ${entry.duration.toFixed(2)}ms`);
          }
        }
      });
      
      observer.observe({ entryTypes: ['longtask', 'measure', 'navigation'] });
      
      // Monitor event loop blocking
      let lastCheck = performance.now();
      const checkInterval = 16; // 60fps target
      
      function checkEventLoop() {
        const now = performance.now();
        const delta = now - lastCheck - checkInterval;
        
        if (delta > 10) {
          window.__performanceMetrics.push({
            type: 'event-loop-block',
            delay: delta,
            timestamp: now
          });
          console.warn(`🚨 Event loop blocked for ${delta.toFixed(2)}ms`);
        }
        
        lastCheck = now;
        requestAnimationFrame(checkEventLoop);
      }
      
      requestAnimationFrame(checkEventLoop);
    });

    // Monitor specific widget interactions
    await page.evaluate(() => {
      // Track drag operations
      document.addEventListener('dragstart', (e) => {
        const startTime = performance.now();
        console.log(`🎯 Drag started on: ${e.target.className}`);
        
        const dragEnd = () => {
          const duration = performance.now() - startTime;
          console.log(`✅ Drag completed in ${duration.toFixed(2)}ms`);
          document.removeEventListener('dragend', dragEnd);
        };
        
        document.addEventListener('dragend', dragEnd);
      }, true);
      
      // Track click performance
      document.addEventListener('click', (e) => {
        const startTime = performance.now();
        console.log(`🖱️  Click on: ${e.target.className}`);
        
        // Measure next frame
        requestAnimationFrame(() => {
          const duration = performance.now() - startTime;
          if (duration > 16) {
            console.warn(`⚠️  Slow click response: ${duration.toFixed(2)}ms`);
          }
        });
      }, true);
    });

    // Collect metrics every 5 seconds
    setInterval(async () => {
      const metrics = await page.metrics();
      const customMetrics = await page.evaluate(() => window.__performanceMetrics || []);
      
      console.log('\n📈 Performance Snapshot:');
      console.log('======================');
      console.log(`Heap Used: ${(metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`DOM Nodes: ${metrics.Nodes}`);
      console.log(`Event Listeners: ${metrics.JSEventListeners}`);
      console.log(`Layout Count: ${metrics.LayoutCount}`);
      console.log(`Style Recalcs: ${metrics.RecalcStyleCount}`);
      
      if (customMetrics.length > 0) {
        console.log(`\nRecent Issues (last 5s):`);
        customMetrics.forEach(metric => {
          if (metric.type === 'long-task') {
            console.log(`  - Long Task: ${metric.duration.toFixed(2)}ms`);
          } else if (metric.type === 'event-loop-block') {
            console.log(`  - Event Loop Block: ${metric.delay.toFixed(2)}ms`);
          }
        });
        // Clear metrics
        await page.evaluate(() => { window.__performanceMetrics = []; });
      }
      
    }, 5000);

    console.log('✅ Performance monitoring active. Press Ctrl+C to stop.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n👋 Stopping performance monitor...');
  process.exit(0);
});

monitorPerformance();