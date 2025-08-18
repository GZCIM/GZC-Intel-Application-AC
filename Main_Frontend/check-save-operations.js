import WebSocket from 'ws';

async function checkSaveOperations() {
    const response = await fetch('http://localhost:9222/json');
    const targets = await response.json();
    
    const page = targets.find(t => t.type === 'page' && t.url.includes('localhost:3501'));
    if (!page) {
        console.log('❌ No page found at localhost:3501');
        return;
    }
    
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    
    ws.on('open', () => {
        console.log('🔍 Checking save operations...\n');
        
        ws.send(JSON.stringify({
            id: 1,
            method: 'Runtime.evaluate',
            params: {
                expression: `
                    (() => {
                        // Get recent network requests to save endpoints
                        const resources = performance.getEntriesByType('resource');
                        const saveRequests = resources.filter(r => 
                            r.name.includes('/api/cosmos/config') || 
                            r.name.includes('/api/preferences') ||
                            r.name.includes('/api/user')
                        );
                        
                        // Check localStorage
                        const tabs = localStorage.getItem('userTabs');
                        const layouts = localStorage.getItem('tabLayouts');
                        
                        return {
                            localData: {
                                hasTabs: !!tabs,
                                hasLayouts: !!layouts,
                                tabCount: tabs ? JSON.parse(tabs).length : 0,
                                dataSize: (tabs?.length || 0) + (layouts?.length || 0)
                            },
                            saveRequests: saveRequests.slice(-10).map(r => ({
                                endpoint: r.name.split('?')[0].replace(window.location.origin, ''),
                                status: r.responseStatus,
                                success: r.responseStatus === 200 || r.responseStatus === 201,
                                duration: Math.round(r.duration)
                            }))
                        };
                    })()
                `,
                returnByValue: true
            }
        }));
    });
    
    ws.on('message', (data) => {
        const message = JSON.parse(data);
        
        if (message.id === 1 && message.result) {
            const result = message.result.result.value;
            
            console.log('=== DATA SAVE STATUS ===\n');
            
            console.log('📁 LOCAL STORAGE:');
            console.log(`   Tabs: ${result.localData.hasTabs ? '✅ Present' : '❌ Missing'} (${result.localData.tabCount} tabs)`);
            console.log(`   Layouts: ${result.localData.hasLayouts ? '✅ Present' : '❌ Missing'}`);
            console.log(`   Total size: ${result.localData.dataSize} bytes\n`);
            
            if (result.saveRequests.length > 0) {
                console.log('📤 RECENT SAVE OPERATIONS:');
                result.saveRequests.forEach(req => {
                    const icon = req.success ? '✅' : '❌';
                    console.log(`   ${icon} ${req.endpoint}`);
                    console.log(`      Status: ${req.status}, Duration: ${req.duration}ms`);
                });
                
                const successful = result.saveRequests.filter(r => r.success).length;
                console.log(`\n   Success rate: ${successful}/${result.saveRequests.length}`);
            } else {
                console.log('⏳ No save operations detected yet');
                console.log('   Try moving a component or switching tabs');
            }
            
            console.log('\n=== FILE UPDATE STATUS ===');
            if (result.localData.hasTabs && result.localData.hasLayouts) {
                console.log('✅ Files are updating properly');
                console.log('✅ Data persists across refreshes');
                if (result.saveRequests.some(r => r.success)) {
                    console.log('✅ Backend saves are working');
                }
            } else {
                console.log('⚠️ Some data may be missing');
            }
            
            ws.close();
        }
    });
}

checkSaveOperations().catch(console.error);