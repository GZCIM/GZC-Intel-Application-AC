// Test if UserTabContainer can be imported in Node
import { readFile } from 'fs/promises';

console.log('Testing UserTabContainer import...');

try {
  const content = await readFile('./src/components/UserTabContainer.tsx', 'utf8');
  console.log('File exists and contains:', content.substring(0, 200) + '...');
  
  // Check for export
  if (content.includes('export default UserTabContainer')) {
    console.log('✅ Default export found');
  } else {
    console.log('❌ No default export found');
  }
} catch (error) {
  console.error('Error reading file:', error);
}
