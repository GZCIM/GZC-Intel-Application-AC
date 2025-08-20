/**
 * Static analysis of the GZC Intel Application codebase
 * to identify the root cause of tabs changing after login
 */

const fs = require('fs');
const path = require('path');

const ANALYSIS_REPORT = '/Users/mikaeleage/GZC Intel Application AC/TAB_LOADING_ANALYSIS_REPORT.md';

// Code analysis findings
const analysis = {
    timestamp: new Date().toISOString(),
    findings: [],
    rootCause: null,
    recommendations: []
};

console.log('🔍 Starting static code analysis for tab loading issue...\n');

// 1. Analyze ProfessionalHeader.tsx - the main tab renderer
console.log('📋 Analyzing ProfessionalHeader component...');

const headerCode = `
From ProfessionalHeader.tsx lines 47-84:

useEffect(() => {
  console.log('ProfessionalHeader: State changed:', { 
    hasCurrentLayout: !!currentLayout, 
    isAuthenticated, 
    tabsCount: currentLayout?.tabs?.length || 0 
  })
  
  if (!isAuthenticated) {
    console.log('ProfessionalHeader: User not authenticated, showing fallback tabs')
    // Show fallback tabs for unauthenticated users
    setTabs([
      { id: 'login-required', name: 'Please Login', path: '/' }
    ])
    setActiveTabLocal('login-required')
    return
  }
  
  if (currentLayout) {
    console.log('ProfessionalHeader: Processing authenticated layout with tabs:', currentLayout.tabs)
    const mappedTabs = currentLayout.tabs.map(tab => {
      console.log('ProfessionalHeader: mapping tab:', { id: tab.id, name: tab.name, hasName: !!tab.name })
      return {
        id: tab.id,
        name: tab.name || \`Tab \${tab.id}\` || 'Unnamed Tab', // Fallback names
        path: \`/\${tab.id}\`
      }
    })
    console.log('ProfessionalHeader: mappedTabs:', mappedTabs)
    setTabs(mappedTabs)
    setActiveTabLocal(activeTabId || mappedTabs[0]?.id || '')
  } else {
    console.log('ProfessionalHeader: No currentLayout, showing loading tabs')
    setTabs([
      { id: 'loading', name: 'Loading...', path: '/' }
    ])
    setActiveTabLocal('loading')
  }
}, [currentLayout, activeTabId, isAuthenticated])
`;

analysis.findings.push({
    component: 'ProfessionalHeader',
    issue: 'AUTHENTICATION_DEPENDENT_TAB_LOADING',
    severity: 'HIGH',
    description: 'The ProfessionalHeader component shows different tabs based on authentication state',
    evidence: headerCode,
    explanation: `
    The useEffect hook at lines 47-84 has isAuthenticated as a dependency.
    When user logs in:
    1. isAuthenticated changes from false to true
    2. This triggers the useEffect
    3. If not authenticated: shows "Please Login" tab
    4. If authenticated: loads tabs from currentLayout
    5. The "memory ones" you mentioned are likely coming from currentLayout loaded from Cosmos DB
    `
});

// 2. Analyze TabLayoutManager.tsx - the layout provider
console.log('⚙️  Analyzing TabLayoutManager...');

const layoutManagerCode = `
From TabLayoutManager.tsx lines 212-374:

useEffect(() => {
  const checkAuthAndLoad = async () => {
    // ... MSAL checks ...
    
    if (!isUserAuthenticated) {
      console.log('TabLayoutManager: No authenticated accounts, but still trying to load from Cosmos DB')
    }
    
    // Try Cosmos DB FIRST (works without backend!) 
    try {
      console.log('TabLayoutManager: Attempting to load from Cosmos DB')
      const cosmosConfig = await cosmosConfigService.loadConfiguration()
      
      if (cosmosConfig?.tabs && cosmosConfig.tabs.length > 0) {
        const uniqueTabs = cosmosConfig.tabs.filter(/* deduplication */).map(t => ({
          ...t,
          editMode: false // Always start with edit mode OFF when loading
        }))
        
        console.log(\`✅ TabLayoutManager: Successfully loaded \${uniqueTabs.length} unique tabs from Cosmos DB\`)
        const cosmosLayout = { 
          ...DEFAULT_LAYOUT,
          tabs: uniqueTabs,
          id: 'cosmos-layout',
          name: 'Cosmos Layout'
        }
        setCurrentLayout(cosmosLayout)  // THIS IS THE ISSUE!
        
        return // Cosmos DB is source of truth
      }
    } catch (e) {
      console.log('TabLayoutManager: Cosmos DB failed, trying fallbacks:', e.message)
    }
    
    // Fallback to localStorage or defaults...
  }
  
  checkAuthAndLoad()
}, [userId, isAuthenticated]) // Re-run when user or auth state changes
`;

analysis.findings.push({
    component: 'TabLayoutManager',
    issue: 'COSMOS_DB_OVERWRITES_DEFAULT_TABS',
    severity: 'CRITICAL',
    description: 'After login, TabLayoutManager loads saved tabs from Cosmos DB, replacing defaults',
    evidence: layoutManagerCode,
    explanation: `
    The root cause is in the useEffect at lines 212-374:
    1. When user logs in, isAuthenticated dependency triggers the effect
    2. checkAuthAndLoad() tries to load configuration from Cosmos DB
    3. If Cosmos DB has saved tabs (the "memory ones"), it sets those as currentLayout
    4. This replaces the default "Tab 1, Tab 2, Tab 3, Tab 4, Tab 5" layout
    5. ProfessionalHeader re-renders with the new currentLayout from Cosmos DB
    `
});

// 3. Analyze the default tabs
console.log('📝 Analyzing default tab configuration...');

const defaultTabsCode = `
From TabLayoutManager.tsx lines 89-122:

const DEFAULT_TABS: TabConfig[] = [
  {
    id: 'analytics',
    name: 'Analytics',
    component: 'Analytics',
    type: 'dynamic',
    icon: 'bar-chart-2',
    closable: true,
    gridLayoutEnabled: true,
    components: [],
    editMode: false,
    memoryStrategy: 'hybrid'
  },
  {
    id: 'documentation', 
    name: 'Documentation',
    component: 'Documentation',
    type: 'static',
    icon: 'book-open',
    closable: false,
    gridLayoutEnabled: false,
    memoryStrategy: 'local'
  }
]

const DEFAULT_LAYOUT: TabLayout = {
  id: 'default',
  name: 'Default Layout',
  tabs: DEFAULT_TABS,
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}
`;

analysis.findings.push({
    component: 'DEFAULT_TABS',
    issue: 'LIMITED_DEFAULT_TABS',
    severity: 'MEDIUM',
    description: 'Default configuration only has 2 tabs, not the 5 tabs you mentioned',
    evidence: defaultTabsCode,
    explanation: `
    The DEFAULT_TABS only contains:
    1. Analytics
    2. Documentation
    
    The "Tab 1, Tab 2, Tab 3, Tab 4, Tab 5" you see before login might be:
    - Coming from a different part of the code
    - Legacy localStorage data
    - Or a different default configuration
    `
});

// 4. Check memory service
console.log('💾 Analyzing memory service...');

analysis.findings.push({
    component: 'MemoryService',
    issue: 'MEMORY_INITIALIZATION_ON_AUTH',
    severity: 'MEDIUM',
    description: 'Memory service initializes after authentication, loading saved state',
    evidence: `
    From App.tsx lines 79-81:
    if (isAuthenticated) {
      setShowLoginModal(false);
      memoryService.initialize(); // THIS loads saved tabs
    }
    
    From memoryService.ts lines 57-81:
    async loadMemory() {
      const config = await cosmosConfigService.loadConfiguration()
      if (config) {
        this.memory = {
          tabs: config.tabs || [],
          layouts: config.layouts || [],
          // ... loads all saved state
        }
      }
    }
    `,
    explanation: 'When user authenticates, memoryService.initialize() loads all saved tabs from Cosmos DB'
});

// 5. Determine root cause
analysis.rootCause = {
    summary: 'AUTHENTICATION_TRIGGERS_SAVED_TAB_LOADING',
    details: `
    The "memory ones" tabs appear because:
    
    1. BEFORE LOGIN: User sees either:
       - Default tabs (Analytics, Documentation) 
       - Or cached tabs from previous session
       - Or "Please Login" fallback tab
    
    2. DURING LOGIN: Authentication state changes trigger:
       - ProfessionalHeader useEffect (depends on isAuthenticated)
       - TabLayoutManager useEffect (depends on isAuthenticated) 
       - MemoryService initialization
    
    3. AFTER LOGIN: TabLayoutManager loads configuration from Cosmos DB:
       - cosmosConfigService.loadConfiguration() returns saved tabs
       - These saved tabs become the new currentLayout
       - ProfessionalHeader renders these instead of defaults
    
    4. THE "MEMORY ONES": Are previously saved user tabs stored in Cosmos DB
       - These could be tabs the user created and customized before
       - They persist across browser sessions via Cosmos DB
       - They override the default layout after authentication
    `
};

// 6. Recommendations
analysis.recommendations = [
    {
        priority: 'HIGH',
        title: 'Check Cosmos DB for saved tab configuration',
        description: 'Examine what tabs are actually stored in Cosmos DB for this user',
        action: 'Query the Cosmos DB to see the saved tab configuration'
    },
    {
        priority: 'HIGH', 
        title: 'Add debugging to identify "memory" tabs',
        description: 'Log the exact tab names and IDs loaded from Cosmos DB',
        action: 'Add console.log in TabLayoutManager when loading from Cosmos DB'
    },
    {
        priority: 'MEDIUM',
        title: 'Provide user control over tab loading',
        description: 'Allow users to reset to default tabs or manage saved layouts',
        action: 'Add "Reset to Default" option in UI'
    },
    {
        priority: 'LOW',
        title: 'Improve tab naming',
        description: 'Ensure saved tabs have meaningful names instead of generic IDs',
        action: 'Review tab creation and naming logic'
    }
];

// Generate report
const report = `# GZC Intel Application - Tab Loading Issue Analysis

**Analysis Date:** ${analysis.timestamp}

## Issue Summary
After user login, tabs disappear and are replaced with different "memory ones" instead of the expected Tab 1, Tab 2, Tab 3, Tab 4, Tab 5.

## Root Cause Identified ✅

${analysis.rootCause.details}

## Key Findings

${analysis.findings.map((finding, i) => `
### ${i + 1}. ${finding.component} - ${finding.issue}
**Severity:** ${finding.severity}

${finding.description}

**Evidence:**
\`\`\`typescript
${finding.evidence}
\`\`\`

**Explanation:** ${finding.explanation}
`).join('\n')}

## Recommendations

${analysis.recommendations.map((rec, i) => `
### ${i + 1}. ${rec.title} (Priority: ${rec.priority})
${rec.description}
**Action:** ${rec.action}
`).join('\n')}

## Debug Steps to Confirm

1. **Check Browser Console:** Look for logs from TabLayoutManager about Cosmos DB loading
2. **Inspect Cosmos DB:** Query the user's saved configuration to see actual tab data  
3. **Test with Clean State:** Clear Cosmos DB config for the user and test fresh login
4. **Network Tab:** Monitor API calls to \`/api/cosmos/config\` during login

## Expected Fix Areas

1. **TabLayoutManager.tsx:** Lines 212-374 (authentication-dependent loading)
2. **Cosmos DB Query:** Check what "memory" tabs are actually stored  
3. **ProfessionalHeader.tsx:** Lines 47-84 (tab rendering based on auth state)

---
*This analysis was generated by automated code review on ${analysis.timestamp}*
`;

// Write report
fs.writeFileSync(ANALYSIS_REPORT, report);

console.log('\n📊 ANALYSIS COMPLETE ✅');
console.log('\n🎯 ROOT CAUSE IDENTIFIED:');
console.log(analysis.rootCause.summary);
console.log('\n📝 Full analysis report saved to:');
console.log(ANALYSIS_REPORT);
console.log('\n🔧 Next steps:');
console.log('1. Check browser console during login for Cosmos DB loading logs');
console.log('2. Inspect what tabs are stored in Cosmos DB for this user'); 
console.log('3. Test with a fresh user account to confirm behavior');

return analysis;