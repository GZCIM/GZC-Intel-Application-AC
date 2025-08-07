// Test all components are loadable
import { componentRegistry } from '../core/tabs/componentRegistry';

export async function testAllComponents() {
  const results: { [key: string]: { success: boolean; error?: string } } = {};
  
  for (const [componentId, loader] of Object.entries(componentRegistry)) {
    try {
      console.log(`Testing ${componentId}...`);
      const module = await loader();
      if (module.default) {
        results[componentId] = { success: true };
        console.log(`✅ ${componentId} loaded successfully`);
      } else {
        results[componentId] = { success: false, error: 'No default export' };
        console.log(`❌ ${componentId} has no default export`);
      }
    } catch (error) {
      results[componentId] = { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
      console.log(`❌ ${componentId} failed:`, error);
    }
  }
  
  return results;
}

// Run test if this file is executed directly
if (import.meta.url === `file://${__filename}`) {
  testAllComponents().then(results => {
    console.log('\n=== Component Test Results ===');
    const failed = Object.entries(results).filter(([_, result]) => !result.success);
    console.log(`Total: ${Object.keys(results).length}`);
    console.log(`Success: ${Object.keys(results).length - failed.length}`);
    console.log(`Failed: ${failed.length}`);
    
    if (failed.length > 0) {
      console.log('\nFailed components:');
      failed.forEach(([id, result]) => {
        console.log(`- ${id}: ${result.error}`);
      });
    }
  });
}