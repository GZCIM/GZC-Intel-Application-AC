// Test inventory
const inv = require('./src/core/components/ComponentInventory.ts');
const components = inv.componentInventory.searchComponents('');
console.log('Total components:', components.length);
console.log('Components:', components.map(c => ({ id: c.id, name: c.name })));
console.log('Bloomberg component:', inv.componentInventory.getComponent('bloomberg-volatility'));
EOF < /dev/null