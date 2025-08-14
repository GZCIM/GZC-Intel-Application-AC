# 2025-08-14: Bloomberg Volatility Component - Tooltip DOM Manipulation Fix

## Problem
User reported persistent DOM manipulation error "Failed to execute 'removeChild' on 'Node'" in the Bloomberg Volatility Analysis component. The error occurred when switching currency pairs and was caused by D3.js tooltips conflicting with React's DOM management.

## Solution
Refactored D3.js tooltips to use React state management instead of direct DOM manipulation:
1. Replaced D3.js tooltip divs with React state-managed components
2. Changed from `d3.select().append("div")` to `setTermTooltip()` and `setSmileTooltip()`
3. Added tooltip React components directly in JSX with absolute positioning
4. Eliminated all `.remove()` calls on tooltips

## Changes
- **File: VolatilityAnalysis.tsx:61-63** - Changed tooltip state to accept React.ReactNode content
- **File: VolatilityAnalysis.tsx:323-325** - Replaced D3 tooltip cleanup with state reset
- **File: VolatilityAnalysis.tsx:689-741** - Refactored term chart tooltips to use React state
- **File: VolatilityAnalysis.tsx:951-1007** - Refactored smile chart tooltips to use React state
- **File: VolatilityAnalysis.tsx:1366-1410** - Added React tooltip component for smile chart
- **File: VolatilityAnalysis.tsx:1445-1489** - Added React tooltip component for term chart

## Testing
- Built successfully with `npx vite build`
- Started dev server and tested locally at http://localhost:9000
- Verified tooltips work without DOM errors
- Confirmed currency pair switching no longer triggers errors

## Deployment
- Version: v20250814-131203
- Revision: gzc-intel-application-ac--0000216
- Status: Active and running
- URL: https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io

## Lessons
- D3.js direct DOM manipulation conflicts with React's virtual DOM
- Using React state for tooltips is safer than D3.js DOM operations
- The `.remove()` method in D3.js can cause "removeChild" errors when React also manages the same DOM nodes
- Container-relative positioning works better than document.body tooltips