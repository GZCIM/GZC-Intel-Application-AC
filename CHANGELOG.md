# CHANGELOG - GZC Intel Application AC

## [v20250809-143545] - 2025-01-09

### Fixed
- **Component Modal Visibility**: Fixed AnimatePresence implementation in ComponentPortalModal.tsx
  - Modal now properly displays when clicking "Tools → Add Component"
  - Added proper conditional rendering inside AnimatePresence
  - Included proper keys and exit animations for motion components
- **Component Addition Workflow**: Users can now successfully add multiple components to tabs
  - Bloomberg Volatility component properly loads
  - All 4 components from ComponentInventory are accessible
  - Components successfully add to the grid layout

### Technical Details
- Modified `Main_Frontend/src/components/ComponentPortalModal.tsx` lines 177-186
- Fixed React portal rendering with proper AnimatePresence wrapper
- Ensured modal renders to document.body with z-index 999999

### Testing
- Created comprehensive Puppeteer test suite for modal functionality
- Verified component inventory initialization
- Confirmed grid state updates when components are added

---

## [v20250808-171205] - 2025-01-08

### Fixed
- **Component Persistence**: Components no longer disappear after being added
- **Edit Mode Stability**: Edit mode now persists correctly when adding components
- **Portfolio Manager**: Fixed null/undefined checks preventing crashes

### Added
- User memory architecture with PostgreSQL and Azure AD
- MSAL integration for authentication
- Database service with Bearer token support

---

## [v20250807-215452] - 2025-01-07

### Initial Production Release
- Dynamic canvas with drag-and-drop grid layout
- Tab management system
- Component inventory with categories
- Professional header with system status
- Theme context (light/dark mode)
- WebSocket connections for real-time data
- Integration with Bloomberg API endpoints

---

## Known Issues

### Non-blocking Issues
- CORS errors with portfolio-backend service
- Mixed content warnings for Bloomberg API (HTTP vs HTTPS)
- TypeScript build errors (use `npx vite build` to bypass)

### Resolved Issues
- ✅ Component modal visibility (fixed in v20250809-143545)
- ✅ Component persistence (fixed in v20250808-171205)
- ✅ Edit mode stability (fixed in v20250808-171205)

---

## Deployment Information

**Production URL**: https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io

**Container Registry**: gzcacr.azurecr.io/gzc-intel-app

**Azure Container App**: gzc-intel-application-ac

**Resource Group**: gzc-kubernetes-rg

---

*Maintained by Claude Code*
*Last Updated: 2025-01-09*