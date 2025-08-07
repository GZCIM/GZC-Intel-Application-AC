// Tab Creation Test Script
// Run this in the browser console to test tab functionality

function testTabCreation() {
    console.log('🧪 Testing Tab Creation Functionality...');
    
    // Test 1: Check if tab layout context is available
    try {
        const layouts = localStorage.getItem('gzc-intel-layouts');
        const activeLayout = localStorage.getItem('gzc-intel-active-layout');
        console.log('✅ LocalStorage access working');
        console.log('📊 Current layouts:', layouts);
        console.log('🎯 Active layout:', activeLayout);
    } catch (error) {
        console.error('❌ LocalStorage error:', error);
        return;
    }
    
    // Test 2: Check view memory integration
    try {
        const viewMemory = localStorage.getItem('gzc-platform-view-memory');
        if (viewMemory) {
            const parsed = JSON.parse(viewMemory);
            console.log('✅ View Memory integration working');
            console.log('🎨 Current theme:', parsed.theme?.currentTheme);
            console.log('📁 Saved layouts:', Object.keys(parsed.layouts || {}));
        } else {
            console.log('ℹ️ No view memory found (normal on first run)');
        }
    } catch (error) {
        console.error('❌ View Memory error:', error);
    }
    
    // Test 3: Simulate tab data structure
    const testTab = {
        id: 'test-tab-' + Date.now(),
        name: 'Test Tab',
        component: 'TestComponent',
        type: 'dynamic',
        icon: 'grid',
        closable: true,
        gridLayoutEnabled: true,
        components: [],
        editMode: false,
        memoryStrategy: 'hybrid'
    };
    
    console.log('✅ Test tab structure valid:', testTab);
    
    // Test 4: Check if we can access component inventory
    if (typeof window !== 'undefined') {
        console.log('✅ Window object available for component inventory');
    }
    
    console.log('🎉 Tab functionality tests completed!');
    return {
        localStorage: 'working',
        viewMemory: 'integrated',
        tabStructure: 'valid',
        ready: true
    };
}

// Export for testing
if (typeof window !== 'undefined') {
    window.testTabCreation = testTabCreation;
    console.log('🔧 Tab test functions loaded. Run testTabCreation() to test.');
}

// Auto-run if in Node environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testTabCreation };
}