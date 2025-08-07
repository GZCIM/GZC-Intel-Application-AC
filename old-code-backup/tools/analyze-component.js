#!/usr/bin/env node

/**
 * Component Analysis Tool
 * Analyzes a standalone React app to prepare for integration
 * Usage: node analyze-component.js /path/to/component/src
 */

const fs = require('fs');
const path = require('path');

function analyzeComponent(srcPath) {
  const analysis = {
    components: [],
    dependencies: new Set(),
    apiCalls: [],
    contexts: [],
    utils: [],
    styles: [],
    npmPackages: new Set()
  };

  // Recursively scan directory
  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        scanDirectory(fullPath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        analyzeFile(fullPath);
      } else if (file.endsWith('.css') || file.endsWith('.scss')) {
        analysis.styles.push(path.relative(srcPath, fullPath));
      }
    });
  }

  // Analyze individual file
  function analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(srcPath, filePath);
    
    // Detect components
    if (relativePath.includes('components/') && filePath.endsWith('.tsx')) {
      const componentMatch = content.match(/export\s+(?:default\s+)?(?:function|const)\s+(\w+)/);
      if (componentMatch) {
        analysis.components.push({
          name: componentMatch[1],
          path: relativePath,
          isDefault: content.includes('export default')
        });
      }
    }
    
    // Detect imports
    const imports = content.matchAll(/import\s+.*?\s+from\s+['"](.+?)['"]/g);
    for (const match of imports) {
      const importPath = match[1];
      
      // External packages
      if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
        analysis.npmPackages.add(importPath.split('/')[0]);
      }
      
      // Contexts
      if (importPath.includes('context') || importPath.includes('Context')) {
        analysis.contexts.push(importPath);
      }
      
      // Utils
      if (importPath.includes('utils/')) {
        analysis.utils.push(importPath);
      }
    }
    
    // Detect API calls
    const apiCalls = content.matchAll(/fetch\s*\(\s*['"`]([^'"`]+)/g);
    for (const match of apiCalls) {
      analysis.apiCalls.push({
        url: match[1],
        file: relativePath
      });
    }
    
    // Detect axios/other HTTP clients
    if (content.includes('axios') || content.includes('api.')) {
      const apiPatterns = content.matchAll(/api\.\w+|axios\.\w+/g);
      for (const match of apiPatterns) {
        analysis.dependencies.add('API client usage: ' + match[0]);
      }
    }
  }

  scanDirectory(srcPath);
  
  return analysis;
}

// Format and display results
function displayAnalysis(analysis) {
  console.log('\n=== COMPONENT ANALYSIS REPORT ===\n');
  
  console.log('📦 COMPONENTS FOUND:');
  analysis.components.forEach(comp => {
    console.log(`  - ${comp.name} (${comp.path}) ${comp.isDefault ? '[default export]' : '[named export]'}`);
  });
  
  console.log('\n📚 NPM PACKAGES:');
  Array.from(analysis.npmPackages).sort().forEach(pkg => {
    console.log(`  - ${pkg}`);
  });
  
  console.log('\n🔌 API ENDPOINTS:');
  analysis.apiCalls.forEach(api => {
    console.log(`  - ${api.url} (in ${api.file})`);
  });
  
  console.log('\n🎨 STYLES:');
  analysis.styles.forEach(style => {
    console.log(`  - ${style}`);
  });
  
  console.log('\n📋 INTEGRATION CHECKLIST:');
  console.log('  [ ] Create component directory in main app');
  console.log('  [ ] Copy main components:', analysis.components.map(c => c.name).join(', '));
  console.log('  [ ] Install npm packages:', Array.from(analysis.npmPackages).join(', '));
  console.log('  [ ] Copy/adapt contexts:', analysis.contexts.length);
  console.log('  [ ] Copy utility files:', analysis.utils.length);
  console.log('  [ ] Update import paths');
  console.log('  [ ] Configure API endpoints');
  console.log('  [ ] Add to ComponentInventory');
  console.log('  [ ] Add to enhancedComponentRegistry');
  console.log('  [ ] Test integration');
  
  // Generate integration code snippets
  console.log('\n📝 GENERATED CODE SNIPPETS:\n');
  
  // Component Inventory entry
  const mainComponent = analysis.components[0];
  if (mainComponent) {
    console.log('// Add to ComponentInventory.ts:');
    console.log(`this.addComponent({
  id: '${mainComponent.name.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase().substring(1)}',
  name: '${mainComponent.name}',
  displayName: '${mainComponent.name.replace(/([A-Z])/g, ' $1').trim()}',
  category: 'your-category',
  subcategory: 'your-subcategory',
  description: 'Description here',
  defaultSize: { w: 8, h: 6 },
  minSize: { w: 6, h: 4 },
  tags: ['tag1', 'tag2'],
  complexity: 'complex',
  quality: 'production',
  source: 'internal'
})`);
    
    console.log('\n// Add to enhancedComponentRegistry.ts:');
    console.log(`'${mainComponent.name.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase().substring(1)}': {
  loader: () => import('../../components/${mainComponent.name}/${mainComponent.name}'),
  metadata: {
    id: '${mainComponent.name.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase().substring(1)}',
    displayName: '${mainComponent.name.replace(/([A-Z])/g, ' $1').trim()}',
    category: 'your-category'
  }
}`);
  }
}

// Main execution
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node analyze-component.js /path/to/component/src');
  process.exit(1);
}

const srcPath = path.resolve(args[0]);
if (!fs.existsSync(srcPath)) {
  console.error('Error: Path does not exist:', srcPath);
  process.exit(1);
}

const analysis = analyzeComponent(srcPath);
displayAnalysis(analysis);