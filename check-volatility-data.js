const axios = require('axios');

async function checkVolatilityData() {
    const pair = 'EURUSD';
    const tenors = ["ON", "1W", "2W", "1M", "2M", "3M", "6M", "9M", "1Y", "18M", "2Y"];
    
    try {
        console.log(`Fetching volatility surface for ${pair}...`);
        console.log('Tenors:', tenors);
        
        // Call the K8s gateway through production proxy
        const response = await axios.post(
            `https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io/api/bloomberg/api/volatility-surface/${pair}`,
            tenors,
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('\n=== RESPONSE STRUCTURE ===');
        console.log('Response keys:', Object.keys(response.data));
        console.log('Success:', response.data.success);
        console.log('Pair:', response.data.pair);
        console.log('Tenors in response:', response.data.tenors);
        
        if (response.data.data) {
            console.log('\n=== DATA STRUCTURE ===');
            console.log('Data keys:', Object.keys(response.data.data));
            
            if (response.data.data.securities_data) {
                const securities = response.data.data.securities_data;
                console.log(`Total securities: ${securities.length}`);
                
                // Group by tenor
                const byTenor = {};
                securities.forEach(sec => {
                    if (sec.success) {
                        const ticker = sec.security;
                        // Extract tenor from ticker like "EURUSDV1M BGN Curncy"
                        const match = ticker.match(/EURUSD.*?(\d+[DWMY])\s/);
                        if (match) {
                            const tenor = match[1];
                            if (!byTenor[tenor]) byTenor[tenor] = [];
                            byTenor[tenor].push({
                                ticker: ticker.replace(' BGN Curncy', '').replace('EURUSD', ''),
                                value: sec.fields.PX_LAST
                            });
                        }
                    }
                });
                
                console.log('\n=== DATA BY TENOR ===');
                Object.keys(byTenor).forEach(tenor => {
                    console.log(`\n${tenor}:`);
                    byTenor[tenor].forEach(item => {
                        console.log(`  ${item.ticker}: ${item.value}`);
                    });
                });
            }
        }
        
        // Check if there's a surface property
        if (response.data.surface) {
            console.log('\n=== SURFACE PROPERTY FOUND ===');
            console.log('Surface keys:', Object.keys(response.data.surface));
        } else {
            console.log('\n⚠️  No surface property in response - frontend expects this!');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

checkVolatilityData();