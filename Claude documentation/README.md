# GZC Intel Application Documentation

## 📚 Streamlined Documentation (5 Essential Files)

This documentation has been consolidated from 50+ scattered files into 5 focused, practical guides:

### 📄 Core Documentation

1. **[01-QUICK-START.md](01-QUICK-START.md)** - Get running in 2 minutes
   - Local development setup
   - Deployment commands
   - Common tasks

2. **[02-DEVELOPMENT-GUIDE.md](02-DEVELOPMENT-GUIDE.md)** - How to develop
   - Workspace rules and philosophy
   - Component architecture
   - Code standards

3. **[03-TROUBLESHOOTING.md](03-TROUBLESHOOTING.md)** - Fix problems fast
   - Common issues with solutions
   - Diagnostic commands
   - Emergency procedures

4. **[04-ARCHITECTURE.md](04-ARCHITECTURE.md)** - System design
   - High-level architecture
   - Component structure
   - Data flow

5. **[05-API-REFERENCE.md](05-API-REFERENCE.md)** - API documentation
   - Backend endpoints
   - Bloomberg API
   - Frontend APIs

### 📂 Additional Resources

- **[11-Journal/](11-Journal/)** - Daily development logs and history

## 🚀 Start Here

New to the project? Read files in this order:
1. **Quick Start** - Get the app running
2. **Architecture** - Understand the system
3. **Development Guide** - Start coding

Having issues? Jump straight to **Troubleshooting**.

## 🔑 Key Information

**Production URL**: https://gzc-intel-application-ac.delightfulground-653e61be.eastus.azurecontainerapps.io

**Local Ports**:
- Frontend: 3500
- Backend: 5100
- Bloomberg API: 8080

**Azure Resources**:
- Container App: `gzc-intel-application-ac`
- Resource Group: `gzc-kubernetes-rg`
- Registry: `gzcacr.azurecr.io`

## ⚠️ Critical Reminders

1. **ALWAYS** work in `Main_Frontend/` for frontend changes
2. **NEVER** use `:latest` Docker tag
3. **Container app name is `gzc-intel-application-ac`** (NOT gzc-intel-app)

---

*Documentation consolidated on 2025-01-08 from 50+ files into 5 essential guides*

-- Claude Code @ 2025-01-08T18:41:30Z