# GZC Intel App - Production

Professional financial intelligence dashboard for GZC Investment Management.

## 🚀 Production Repository

This is the production repository for GZC Intel App. This repository is maintained separately from the development version.

## 🏗️ Architecture Overview

### Content-Agnostic Design
- **Shell Layer**: Navigation and layout structure independent of content
- **Component Registry**: Dynamic component loading with capability declarations
- **Theme System**: Professional styling with semantic tokens
- **Error Boundaries**: Comprehensive error isolation and recovery

### Key Features
- ✅ **Drag/Drop/Resize Components**: Advanced layout management from Port 3000
- ✅ **Professional Styling**: Backend integrations and themes from Port 3200  
- ✅ **Modular Architecture**: Alex's proven component structure
- ✅ **Performance Optimized**: React 19, Vite 5, O(1) operations
- ✅ **Real Data Integration**: No mock data, production-ready connections

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Installation
```bash
git clone https://github.com/Mich120232024/gzc-intel-app.git
cd gzc-intel-app
npm install
```

### Development
```bash
# Standard development
npm run dev

# Development with Chrome debugging
npm run dev:debug

# Run tests in watch mode
npm test

# Interactive test UI
npm run test:ui
```

### Production Build
```bash
npm run build
npm run preview

# Analyze bundle size
npm run build:analyze
```

## 📁 Project Structure

```
src/
├── core/                    # Core system architecture
│   ├── layout/             # Grid and layout management
│   ├── registry/           # Component registry system
│   ├── tabs/               # Tab system and management
│   └── theme/              # Theme provider and system
├── components/             # Reusable components
│   ├── analytics/          # Analytics and visualization
│   ├── imported/           # Alex's production components
│   └── layout/             # Layout components
├── modules/                # Feature modules
│   ├── portfolio/          # Portfolio management
│   ├── shell/              # Application shell
│   ├── trading/            # Trading interfaces
│   └── ui-library/         # Shared UI components
├── pages/                  # Page components
├── services/               # External services
└── styles/                 # Global styles
```

## 🎯 Component System

### Professional Component Contracts
Every component declares its capabilities:

```typescript
interface ComponentContract {
  metadata: {
    id: string;
    version: string;
    category: string;
  };
  capabilities: {
    sizing: FlexibleSizing;
    modes: SupportedModes;
    data: DataRequirements;
  };
  lifecycle: {
    initialize(): void;
    mount(): void;
    resize(): void;
    destroy(): void;
  };
}
```

### Content-Agnostic Principles
- Structure knows nothing about content
- Layout engine handles space, not content logic
- Components are self-describing and self-contained
- Theme system uses semantic tokens only

## 🔧 Development Standards

### Professional Development Tools
- 🎯 **Event Monitor**: Real-time conflict detection (`eventMonitor.getReport()`)
- 🔍 **Chrome DevTools AI**: Gemini-powered debugging insights
- ✅ **Vitest Testing**: Lightning-fast unit tests with coverage
- 📊 **Bundle Analyzer**: Visualize and optimize bundle size

### Anti-Patterns Avoided
- ❌ **Dual Provider Patterns**: Prevents context conflicts
- ❌ **Mock Data Infections**: Real integrations from day one
- ❌ **Provider Nesting Hell**: Maximum 3 levels enforced
- ❌ **Hardcoded Assumptions**: Everything configurable

### Quality Gates
- 🔒 **Error Boundaries**: Every level protected
- 📊 **Performance Budgets**: Defined and enforced
- 🧪 **Evidence-Based**: All claims verified with data
- 🔐 **Security First**: Azure Key Vault integration

## 🎨 Styling System

### Professional Theme Architecture
- **Quantum Theme**: Production-ready professional styling
- **CSS Framework Harmony**: Bootstrap + Tailwind coexistence
- **Dark Mode Standards**: 93% trader preference compliance
- **Accessibility**: WCAG 4.5:1 contrast requirements

### Color Psychology (Trading UI)
- 🟢 **Green**: Gains and positive movements
- 🔴 **Red**: Losses and negative movements  
- 🔵 **Blue**: Neutral states and information
- ⚫ **Muted Dark**: Professional backgrounds (not pure black)

## 📊 Performance Optimization

### React Performance Patterns
- **O(1) Map Lookups**: Replace array.find() patterns
- **Filter-Before-Map**: Sequence operations efficiently
- **Component Virtualization**: Handle 10K+ items smoothly
- **Memoization**: Microsecond-level optimization

### Vite 5 Optimization
- **Rolldown-Era Chunking**: Advanced bundle splitting
- **ESNext Targeting**: Modern browser optimization
- **Persistent Cache**: Development speed enhancement
- **Bundle Limits**: 50KB Tailwind control

## 🚢 Deployment Strategy

### Azure Container Apps + Kubernetes
- **Main Shell**: Azure Container Apps for stability
- **Resource-Intensive Components**: Kubernetes for scalability
- **Redis Caching**: Personalized user workspaces
- **Component Templates**: Analyst-friendly development

### User-Centric Loading
- Each user gets personalized app with selected components
- Redis-cached configurations for fast startup
- Component registry enables on-demand loading
- Template system for rapid component creation

## 📖 Documentation

### Developer Guides
- **[Development Guide](./docs/DEVELOPMENT_GUIDE.md)**: Complete development workflow
- **[Chrome DevTools AI](./docs/CHROME_DEVTOOLS_AI.md)**: AI-powered debugging
- **[Vitest Testing](./docs/VITEST_TESTING.md)**: Testing framework guide
- **[Bundle Analyzer](./docs/BUNDLE_ANALYZER.md)**: Bundle optimization

### Quarterly Maintenance
- **GitHub Repository**: Knowledge preservation system
- **Automated Validation**: Style and architecture compliance
- **Documentation Standards**: Professional technical writing
- **Handoff Ready**: Clean, understandable codebase for Alex

## 🤝 Contributing

### For Analysts
1. **Use Component Templates**: Start with provided templates
2. **Follow Contracts**: Declare component capabilities
3. **Test Integration**: Verify with template validation
4. **Document Patterns**: Update registry with discoveries

### For Developers
1. **Read Architecture Docs**: Understand content-agnostic principles
2. **Follow Anti-Patterns**: Avoid documented failure modes
3. **Maintain Quality Gates**: Evidence-based development
4. **Professional Standards**: Enterprise-grade code only

## 🏆 Success Metrics

### Quality Indicators
- **Zero Provider Conflicts**: No context collisions
- **Sub-100ms Renders**: Performance budget compliance
- **100% Real Data**: No mock implementations
- **Professional UI**: Trading industry standards

### Architecture Compliance
- **Content Agnostic**: Structure independent of content
- **Flexible Extension**: New components without refactoring
- **Error Isolation**: Failures don't cascade
- **Security Compliant**: Key Vault integration verified

## 📄 License

MIT License - See LICENSE file for details

## 🔗 Links

- **Repository**: https://github.com/Mich120232024/gzc-intel-app
- **Issues**: https://github.com/Mich120232024/gzc-intel-app/issues
- **Documentation**: /docs (coming soon)

---

**Built with Professional Integrity** ⚡  
*Content-agnostic architecture for maximum flexibility*

🤖 Generated with [Claude Code](https://claude.ai/code)
