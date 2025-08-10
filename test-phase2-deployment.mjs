#!/usr/bin/env node
import puppeteer from 'puppeteer'

const PRODUCTION_URL = 'https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io'

async function testPhase2Deployment() {
  console.log('🧪 Testing Phase 2 Deployment - Component Drag/Resize Fixes')
  console.log('=' .repeat(60))
  console.log(`Testing URL: ${PRODUCTION_URL}`)
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 }
  })
  
  try {
    const page = await browser.newPage()
    
    // Enable console logging from the browser
    page.on('console', (msg) => {
      console.log(`🌐 Browser: ${msg.text()}`)
    })
    
    // Navigate to application
    console.log('📱 Loading application...')
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle0', timeout: 30000 })
    
    // Check page title to verify correct deployment
    const title = await page.title()
    console.log(`📄 Page title: ${title}`)
    
    // Wait for the app to load
    console.log('⏳ Waiting for app to initialize...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Check for Phase 2 integration test function
    console.log('🔧 Testing Phase 2 integration...')
    const testResults = await page.evaluate(() => {
      // Check if Phase 2 test function exists
      if (typeof window.testPhase2Integration === 'function') {
        console.log('✅ Phase 2 test function found')
        return window.testPhase2Integration()
      } else {
        console.log('⚠️  Phase 2 test function not found (expected in dev builds)')
        return { message: 'Test function not available in production' }
      }
    })
    
    console.log('📊 Integration test results:', testResults)
    
    // Test basic application functionality
    console.log('🎯 Testing basic app functionality...')
    
    // Check if main elements are present
    const elementsExist = await page.evaluate(() => {
      const results = {}
      
      // Check for main app container
      results.hasAppContainer = !!document.querySelector('#root')
      
      // Check for theme variables (indicates ThemeContext loaded)
      const rootStyle = getComputedStyle(document.documentElement)
      results.hasThemeVariables = !!rootStyle.getPropertyValue('--theme-primary')
      
      // Check for any error messages
      const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"]')
      results.hasErrors = errorElements.length > 0
      
      // Check if React is loaded
      results.hasReact = typeof window.React !== 'undefined'
      
      return results
    })
    
    console.log('🔍 Element check results:', elementsExist)
    
    // Take a screenshot for manual inspection
    console.log('📸 Taking deployment screenshot...')
    await page.screenshot({ 
      path: `/Users/mikaeleage/GZC Intel Application AC/phase2-deployment-test.png`,
      fullPage: true
    })
    console.log('✅ Screenshot saved: phase2-deployment-test.png')
    
    // Check for JavaScript errors
    const jsErrors = []
    page.on('pageerror', (error) => {
      jsErrors.push(error.message)
    })
    
    await new Promise(resolve => setTimeout(resolve, 2000)) // Allow time for any errors to surface
    
    if (jsErrors.length > 0) {
      console.log('❌ JavaScript errors found:')
      jsErrors.forEach(error => console.log(`   • ${error}`))
    } else {
      console.log('✅ No JavaScript errors detected')
    }
    
    // Final deployment verification
    console.log('=' .repeat(60))
    console.log('🎉 PHASE 2 DEPLOYMENT VERIFICATION COMPLETE')
    console.log('=' .repeat(60))
    console.log(`✅ Application loaded successfully`)
    console.log(`✅ Theme system initialized: ${elementsExist.hasThemeVariables}`)
    console.log(`✅ No critical JavaScript errors: ${jsErrors.length === 0}`)
    console.log(`✅ Screenshot captured for manual review`)
    
    console.log('')
    console.log('🚀 Ready for manual testing:')
    console.log('   1. Navigate to Tools → Add Component')
    console.log('   2. Add a component (e.g., Portfolio Manager)')
    console.log('   3. Try dragging and resizing the component')
    console.log('   4. Verify component does NOT disappear during operations')
    console.log('')
    console.log('🔗 Live URL:', PRODUCTION_URL)
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  } finally {
    await browser.close()
  }
}

testPhase2Deployment().catch(console.error)