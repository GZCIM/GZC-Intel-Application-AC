# Production Target - GOLDEN STANDARD

## Live Production Application
**URL**: https://gzc-intel-app.agreeablepond-1a74a92d.eastus.azurecontainerapps.io

This is the **WORKING PRODUCTION VERSION** with:
- ✅ Tools tab
- ✅ Working WebSocket connections  
- ✅ Live FX quotes from Redis
- ✅ Portfolio management
- ✅ Real-time analytics
- ✅ All perfect settings

## Our Goal
Add Bloomberg Volatility Surface component to this EXACT configuration without breaking anything.

## Strategy
1. **Source Code**: Use repositories from GZCIM
2. **Configuration**: Use EXACT settings from Azure production
3. **Target**: Match the functionality at the URL above
4. **Addition**: Add Bloomberg component as new feature
5. **Deploy**: Replace current container with enhanced version

## Critical Success Factors
- Must maintain ALL existing functionality
- Must use SAME Azure environment variables
- Must preserve WebSocket connections
- Must keep Tools tab working
- Must maintain live data feeds

## Local Development vs Production
- **Local**: Use Docker container with production settings
- **Production**: This Azure Container App URL
- **Goal**: Make them identical + Bloomberg component

## Next Steps
1. Analyze source code repositories
2. Build Docker image matching production
3. Add Bloomberg component
4. Test locally
5. Deploy to Azure (replace current container)
6. Verify URL still works with new features

The URL above is our **SUCCESS METRIC** - it must continue working with all current features PLUS the new Bloomberg component.