import WebSocket from 'ws';

async function checkChromeDebugger() {
    // Get the WebSocket debugger URL
    const response = await fetch('http://localhost:9222/json');
    const targets = await response.json();
    
    const page = targets.find(t => t.type === 'page' && t.url.includes('localhost:3501'));
    if (!page) {
        console.log('❌ No page found at localhost:3501');
        return;
    }
    
    console.log('📍 Connecting to Chrome DevTools...');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    
    ws.on('open', () => {
        console.log('✅ Connected to Chrome DevTools\n');
        
        // Enable Runtime
        ws.send(JSON.stringify({
            id: 1,
            method: 'Runtime.enable'
        }));
        
        // Enable Log
        ws.send(JSON.stringify({
            id: 2,
            method: 'Log.enable'
        }));
        
        // Evaluate console for errors
        ws.send(JSON.stringify({
            id: 3,
            method: 'Runtime.evaluate',
            params: {
                expression: `
                    (() => {
                        const results = {
                            errors: [],
                            warnings: [],
                            networkErrors: []
                        };
                        
                        // Check for network errors
                        const resources = performance.getEntriesByType('resource');
                        resources.forEach(r => {
                            if (r.responseStatus >= 400) {
                                results.networkErrors.push({
                                    status: r.responseStatus,
                                    url: r.name
                                });
                            }
                        });
                        
                        // Check for React errors
                        const root = document.getElementById('root');
                        if (root && root.textContent.includes('Error')) {
                            results.errors.push('React Error Boundary triggered');
                        }
                        
                        // Check MSAL
                        results.msalLoaded = !!window.msalInstance;
                        if (window.msalInstance) {
                            try {
                                const accounts = window.msalInstance.getAllAccounts();
                                results.msalAccounts = accounts.length;
                            } catch (e) {
                                results.errors.push('MSAL error: ' + e.message);
                            }
                        }
                        
                        return results;
                    })()
                `,
                returnByValue: true
            }
        }));
    });
    
    ws.on('message', (data) => {
        const message = JSON.parse(data);
        
        // Handle Runtime.evaluate response
        if (message.id === 3 && message.result) {
            const results = message.result.result.value;
            
            console.log('=== CHROME DEVTOOLS CHECK ===\n');
            
            if (results.networkErrors.length > 0) {
                console.log('❌ NETWORK ERRORS:');
                results.networkErrors.forEach(e => {
                    console.log(`   ${e.status}: ${e.url}`);
                });
            } else {
                console.log('✅ No network errors');
            }
            
            if (results.errors.length > 0) {
                console.log('\n❌ JAVASCRIPT ERRORS:');
                results.errors.forEach(e => console.log('  ', e));
            } else {
                console.log('✅ No JavaScript errors');
            }
            
            console.log(`✅ MSAL: ${results.msalLoaded ? 'Loaded' : 'Not loaded'}`);
            if (results.msalAccounts !== undefined) {
                console.log(`   Accounts: ${results.msalAccounts}`);
            }
            
            console.log('\n=== SUMMARY ===');
            if (results.errors.length === 0 && results.networkErrors.length === 0) {
                console.log('✅ NO ERRORS - Application is working');
            } else {
                console.log('❌ ERRORS FOUND - Check above');
            }
            
            ws.close();
        }
        
        // Handle Log entries
        if (message.method === 'Log.entryAdded') {
            const entry = message.params.entry;
            if (entry.level === 'error') {
                console.log('❌ Console Error:', entry.text);
            }
        }
    });
}

checkChromeDebugger().catch(console.error);