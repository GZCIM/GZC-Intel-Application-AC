import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

// Declare mermaid on window
declare global {
  interface Window {
    mermaid: any;
  }
}

interface DocSection {
  title: string;
  content: React.ReactNode;
}

// Mermaid diagram with zoom, scroll, and drag controls
const MermaidDiagram: React.FC<{ chart: string; id: string; isActive: boolean }> = ({ chart, id, isActive }) => {
  const { currentTheme: theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [renderKey, setRenderKey] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });
  
  // Force re-render when tab becomes active or theme changes
  useEffect(() => {
    if (isActive) {
      setRenderKey(prev => prev + 1);
    }
  }, [isActive, theme.name]);
  
  // Render diagram when active
  useEffect(() => {
    const renderDiagram = async () => {
      if (window.mermaid && containerRef.current && isActive) {
        try {
          // Clear any existing content
          containerRef.current.innerHTML = '';
          
          // Create a new div for this render with fixed sizing
          const diagramDiv = document.createElement('div');
          diagramDiv.className = 'mermaid';
          diagramDiv.textContent = chart;
          diagramDiv.style.width = '1600px';  // Doubled width for horizontal scrolling
          diagramDiv.style.height = '800px';  // Doubled height
          containerRef.current.appendChild(diagramDiv);
          
          // Render with mermaid
          await window.mermaid.run({
            nodes: [diagramDiv]
          });
          
          // Apply zoom to the SVG
          const svg = diagramDiv.querySelector('svg');
          if (svg) {
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.transform = `scale(${zoomLevel})`;
            svg.style.transformOrigin = 'top left';
          }
          
        } catch (error) {
          console.error(`Mermaid rendering error for ${id}:`, error);
          if (containerRef.current) {
            containerRef.current.innerHTML = `
              <div style="padding: 16px; text-align: left; font-size: 11px; color: ${theme.textSecondary};">
                <div style="margin-bottom: 8px;">⚠️ Diagram failed to render</div>
                <details>
                  <summary style="cursor: pointer; margin-bottom: 8px;">Show diagram code</summary>
                  <pre style="background: ${theme.background}; padding: 8px; border-radius: 3px; overflow: auto; font-size: 10px;">${chart}</pre>
                </details>
              </div>
            `;
          }
        }
      }
    };

    if (isActive && renderKey > 0) {
      // Delay to ensure DOM is ready
      setTimeout(renderDiagram, 300);
    }
  }, [renderKey, isActive, chart, id, theme, zoomLevel]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scrollContainerRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setScrollStart({ 
        x: scrollContainerRef.current.scrollLeft, 
        y: scrollContainerRef.current.scrollTop 
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scrollContainerRef.current) {
      const deltaX = dragStart.x - e.clientX;
      const deltaY = dragStart.y - e.clientY;
      
      scrollContainerRef.current.scrollLeft = scrollStart.x + deltaX;
      scrollContainerRef.current.scrollTop = scrollStart.y + deltaY;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Global mouse up handler
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => setIsDragging(false);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging]);
  
  return (
    <div 
      style={{ 
        margin: '8px 0',
        backgroundColor: theme.surfaceAlt,
        border: `1px solid ${theme.border}`,
        borderRadius: '4px',
        overflow: 'hidden'
      }}
    >
      {/* Zoom Controls */}
      {isActive && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: theme.surface,
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '10px', color: theme.textSecondary }}>
            Zoom: {Math.round(zoomLevel * 100)}% • Click & drag to pan • Scroll both ways
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                backgroundColor: theme.background,
                border: `1px solid ${theme.border}`,
                borderRadius: '2px',
                color: theme.text,
                cursor: 'pointer'
              }}
            >
              −
            </button>
            <span style={{ fontSize: '10px', color: theme.text, minWidth: '30px', textAlign: 'center' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.1))}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                backgroundColor: theme.background,
                border: `1px solid ${theme.border}`,
                borderRadius: '2px',
                color: theme.text,
                cursor: 'pointer'
              }}
            >
              +
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                backgroundColor: theme.background,
                border: `1px solid ${theme.border}`,
                borderRadius: '2px',
                color: theme.text,
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}
      
      {/* Scrollable Diagram Container with Drag Support */}
      <div 
        ref={scrollContainerRef}
        style={{ 
          height: '600px', // Doubled container height
          overflow: 'auto', // Both horizontal and vertical scrolling
          backgroundColor: theme.background,
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div 
          ref={containerRef}
          style={{ 
            background: 'transparent', 
            margin: 0,
            minWidth: '1600px',  // Doubled width to enable horizontal scrolling
            minHeight: '800px',  // Doubled height
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: isDragging ? 'none' : 'auto'
          }}
        >
          {!isActive && (
            <div style={{ 
              color: theme.textTertiary, 
              fontSize: '12px'
            }}>
              Switch to this tab to view diagram
            </div>
          )}
          {isActive && renderKey === 0 && (
            <div style={{ 
              color: theme.textTertiary, 
              fontSize: '12px'
            }}>
              Preparing diagram...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const Documentation: React.FC = () => {
  const { currentTheme: theme } = useTheme();
  const [activeSection, setActiveSection] = useState(0);
  const [mermaidLoaded, setMermaidLoaded] = useState(false);

  const sections: DocSection[] = [
    {
      title: 'Current Architecture',
      content: (
        <div>
          <p style={{ marginBottom: '20px', color: theme.textSecondary }}>
            GZC Intel App is a modern financial intelligence dashboard built with React, TypeScript, and Vite. 
            It features a comprehensive theme system, drag-and-drop widgets, and professional trading interface.
          </p>
          <MermaidDiagram 
            id="current-architecture"
            isActive={activeSection === 0}
            chart={`graph TD
    UI[React + TypeScript] --> Theme[Theme System]
    UI --> Tabs[Tab Management]
    UI --> DnD[React Grid Layout]
    
    Theme --> Header[Professional Header]
    Theme --> Intel[Market Intel Panel]
    Theme --> Docs[Documentation]
    Theme --> Analytics[Analytics Tab]
    
    Theme --> Context[React Context]
    Context --> Local[LocalStorage]
    Context --> Memory[View Memory]
    Memory --> Inspector[Memory Inspector]
    
    Tabs --> Header
    Tabs --> Intel
    Tabs --> Docs
    Tabs --> Analytics`}
          />
        </div>
      )
    },
    {
      title: 'Theme System',
      content: (
        <div>
          <p style={{ marginBottom: '20px', color: theme.textSecondary }}>
            The application features 11 professionally designed themes, each optimized for different use cases and preferences.
          </p>
          <MermaidDiagram 
            id="theme-system"
            isActive={activeSection === 1}
            chart={`graph TD
    TP[Theme Provider] --> GD[GZC Dark]
    TP --> AD[Analytics Dark]
    TP --> TG[Terminal Green]
    TP --> TO[Trading Operations]
    TP --> MT[Midnight Trading]
    TP --> QA[Quantum Analytics]
    TP --> PR[Professional]
    
    TP --> GL[GZC Light]
    TP --> AR[Arctic]
    TP --> PA[Parchment]
    TP --> PE[Pearl]
    
    TP --> LS[LocalStorage]
    TP --> CV[CSS Variables]
    TP --> VM[View Memory]
    
    LS --> VM
    CV --> GD
    CV --> GL
    VM --> LS`}
          />
          <div style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '4px',
            padding: '16px',
            marginTop: '20px'
          }}>
            <h4 style={{ marginBottom: '8px', color: theme.primary }}>Current Theme: {theme.name}</h4>
            <p style={{ margin: 0, fontSize: '12px' }}>
              Each theme includes carefully selected colors for text, backgrounds, borders, and status indicators.
              All themes maintain the GZC institutional green for success states and branding consistency.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Component Architecture',
      content: (
        <div>
          <p style={{ marginBottom: '20px', color: theme.textSecondary }}>
            The application uses a modular component architecture with lazy loading and dynamic imports.
          </p>
          <MermaidDiagram 
            id="component-architecture"
            isActive={activeSection === 2}
            chart={`graph TD
    App[App.tsx] --> TP[ThemeProvider]
    App --> TLP[TabLayoutProvider]
    App --> EB[ErrorBoundary]
    
    TP --> PH[ProfessionalHeader]
    TP --> MIP[MarketIntelPanel]
    TP --> TC[TabContainer]
    
    TLP --> TC
    EB --> PH
    EB --> MIP
    
    TC --> AT[Analytics Tab]
    TC --> DT[Documentation Tab]
    
    VM[ViewMemory Hook] --> TP
    VM --> TLP
    
    PH --> Tabs[Tab Management]
    MIP --> Alerts[AI Agents]
    TC --> Widgets[Widget System]`}
          />
        </div>
      )
    },
    {
      title: 'Recent Updates',
      content: (
        <div>
          <h4 style={{ marginBottom: '16px' }}>Latest Changes</h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div style={{
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              padding: '16px'
            }}>
              <h5 style={{ color: theme.success, marginBottom: '8px' }}>✓ Completed Features</h5>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px' }}>
                <li>11 professional themes with instant switching</li>
                <li>Theme persistence in localStorage</li>
                <li>Professional header with GZC logo</li>
                <li>Market Intel panel with AI agents</li>
                <li>Drag & drop tab reordering</li>
                <li>P&L display with real-time updates</li>
                <li>Documentation with mermaid diagrams</li>
                <li>Responsive layout system</li>
              </ul>
            </div>
            <div style={{
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              padding: '16px'
            }}>
              <h5 style={{ color: theme.warning, marginBottom: '8px' }}>🔄 In Progress</h5>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px' }}>
                <li>Analytics widgets implementation</li>
                <li>Real-time market data integration</li>
                <li>Portfolio management features</li>
                <li>Advanced charting components</li>
              </ul>
            </div>
            <div style={{
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              padding: '16px'
            }}>
              <h5 style={{ color: theme.info, marginBottom: '8px' }}>📋 Planned Features</h5>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px' }}>
                <li>WebSocket for real-time updates</li>
                <li>Advanced risk analytics</li>
                <li>Multi-asset portfolio tracking</li>
                <li>AI-powered market insights</li>
                <li>Customizable dashboards</li>
                <li>Export/Import configurations</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Technical Stack',
      content: (
        <div>
          <h4 style={{ marginBottom: '16px' }}>Frontend Technologies</h4>
          <div style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '4px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <pre style={{
              backgroundColor: theme.background,
              padding: '12px',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto',
              color: theme.text,
              margin: 0
            }}>
{`{
  "core": {
    "react": "^18.3.1",
    "typescript": "~5.6.2",
    "vite": "^6.0.5",
    "react-router-dom": "^7.1.1"
  },
  "ui": {
    "react-grid-layout": "^1.5.0",
    "framer-motion": "^11.15.0",
    "recharts": "^2.15.0",
    "react-hot-toast": "^2.4.1"
  },
  "development": {
    "vitest": "^2.1.8",
    "@testing-library/react": "^16.1.0",
    "storybook": "^8.5.0-alpha.26",
    "eslint": "^9.17.0"
  },
  "features": {
    "themes": 11,
    "tabs": "dynamic",
    "state": "context + localStorage",
    "styling": "CSS-in-JS"
  }
}`}
            </pre>
          </div>
          <div style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '4px',
            padding: '16px'
          }}>
            <h5 style={{ color: theme.primary, marginBottom: '12px' }}>Key Features</h5>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
              <div>
                <strong style={{ color: theme.text }}>Performance</strong>
                <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                  <li>Lazy loading with code splitting</li>
                  <li>Memoized components</li>
                  <li>Virtual scrolling ready</li>
                  <li>Optimized re-renders</li>
                </ul>
              </div>
              <div>
                <strong style={{ color: theme.text }}>Developer Experience</strong>
                <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                  <li>Hot Module Replacement</li>
                  <li>TypeScript strict mode</li>
                  <li>ESLint + Prettier</li>
                  <li>Comprehensive testing</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Development Guide',
      content: (
        <div>
          <h4 style={{ marginBottom: '16px' }}>Getting Started</h4>
          <div style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '4px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <h5 style={{ color: theme.primary, marginBottom: '12px' }}>Development Commands</h5>
            <pre style={{
              backgroundColor: theme.background,
              padding: '12px',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto',
              color: theme.text,
              margin: 0
            }}>
{`# Install dependencies
npm install

# Start development server
npm run dev              # http://localhost:3500

# Run with debugging
npm run dev:debug        # Chrome DevTools enabled

# Testing
npm test                 # Run tests
npm run test:ui          # Vitest UI
npm run test:coverage    # Coverage report

# Build
npm run build            # Production build
npm run build:analyze    # Bundle analysis

# Code quality
npm run lint             # ESLint
npm run type-check       # TypeScript`}
            </pre>
          </div>
          <div style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '4px',
            padding: '16px'
          }}>
            <h5 style={{ color: theme.primary, marginBottom: '12px' }}>Adding a New Theme</h5>
            <pre style={{
              backgroundColor: theme.background,
              padding: '12px',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto',
              color: theme.text,
              margin: 0
            }}>
{`// src/theme/themes.ts
export const themes: Record<string, Theme> = {
  // ... existing themes
  'my-theme': {
    name: 'My Theme',
    primary: '#color',
    secondary: '#color',
    accent: '#color',
    background: '#color',
    surface: '#color',
    surfaceAlt: '#color',
    text: '#color',
    textSecondary: '#color',
    textTertiary: '#color',
    border: '#color',
    borderLight: '#color',
    success: GZC_GREEN.base,
    danger: '#color',
    warning: '#color',
    info: '#color',
    muted: '#color',
    gradient: 'linear-gradient(...)',
    headerColor: '#color',
    shadows: { /* shadow config */ },
    ...sharedConfig
  }
}`}
            </pre>
          </div>
        </div>
      )
    }
  ];

  useEffect(() => {
    // Load Mermaid library only once
    if (!window.mermaid) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
      script.async = true;
      script.onload = () => {
        // Simple theme detection
        const isDarkTheme = !theme.name.includes('Light') && 
                           theme.name !== 'Arctic' && 
                           theme.name !== 'Parchment' && 
                           theme.name !== 'Pearl';
        
        // Use mermaid's built-in themes with larger sizing
        window.mermaid.initialize({ 
          startOnLoad: false, // We'll manually trigger rendering
          theme: isDarkTheme ? 'dark' : 'default',
          securityLevel: 'loose',
          flowchart: {
            nodeSpacing: 50,
            rankSpacing: 60,
            curve: 'linear'
          },
          themeVariables: {
            fontSize: '16px',
            fontFamily: 'Inter, system-ui, sans-serif'
          }
        });
        setMermaidLoaded(true);
      };
      document.body.appendChild(script);
    } else {
      // Mermaid already loaded, just update theme
      const isDarkTheme = !theme.name.includes('Light') && 
                         theme.name !== 'Arctic' && 
                         theme.name !== 'Parchment' && 
                         theme.name !== 'Pearl';
      
      window.mermaid.initialize({ 
        startOnLoad: false,
        theme: isDarkTheme ? 'dark' : 'default',
        securityLevel: 'loose',
        flowchart: {
          nodeSpacing: 60,
          rankSpacing: 80,
          curve: 'linear'
        },
        themeVariables: {
          fontSize: '16px',
          fontFamily: 'Inter, system-ui, sans-serif'
        }
      });
      setMermaidLoaded(true);
    }
  }, [theme.name]);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      // Clear any existing diagrams
      document.querySelectorAll('.mermaid svg').forEach(el => el.remove());
    };
  }, []);

  return (
    <div style={{
      height: 'calc(100vh - 88px)', // Match MarketIntelPanel height: header(48px) + footer(40px)
      padding: '8px',
      color: theme.text
    }}>
      <div style={{
        display: 'flex',
        gap: '8px',
        height: 'calc(100% - 16px)' // Subtract padding
      }}>
        {/* Navigation */}
        <div style={{
          width: '200px',
          backgroundColor: theme.surface,
          borderRadius: '4px',
          border: `1px solid ${theme.border}`,
          padding: '8px',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{
            fontSize: '10px',
            fontWeight: theme.typography.h3.fontWeight,
            marginBottom: '8px',
            color: theme.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Contents
          </h3>
          {sections.map((section, index) => (
            <div
              key={index}
              onClick={() => setActiveSection(index)}
              style={{
                padding: '6px 8px',
                marginBottom: '2px',
                borderRadius: '2px',
                cursor: 'pointer',
                fontSize: '11px',
                backgroundColor: activeSection === index 
                  ? theme.name.includes('Light') || theme.name === 'Arctic' || theme.name === 'Parchment' || theme.name === 'Pearl'
                    ? 'rgba(0, 0, 0, 0.05)'
                    : 'rgba(255, 255, 255, 0.05)'
                  : 'transparent',
                borderLeft: activeSection === index ? `2px solid ${theme.primary}` : '2px solid transparent',
                transition: 'all 0.2s ease',
                color: activeSection === index ? theme.primary : theme.text
              }}
              onMouseEnter={(e) => {
                if (activeSection !== index) {
                  e.currentTarget.style.backgroundColor = theme.name.includes('Light') || theme.name === 'Arctic' || theme.name === 'Parchment' || theme.name === 'Pearl'
                    ? 'rgba(0, 0, 0, 0.02)'
                    : 'rgba(255, 255, 255, 0.02)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeSection !== index) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {section.title}
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          backgroundColor: theme.surface,
          borderRadius: '4px',
          border: `1px solid ${theme.border}`,
          padding: '16px',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '12px',
            color: theme.text
          }}>
            {sections[activeSection].title}
          </h2>
          <div style={{
            fontSize: theme.typography.body.fontSize,
            lineHeight: 1.6
          }}>
            {sections[activeSection].content}
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '8px',
        padding: '6px 8px',
        backgroundColor: theme.surface,
        borderRadius: '4px',
        border: `1px solid ${theme.border}`,
        textAlign: 'center',
        fontSize: '9px',
        color: theme.textSecondary,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Updated: {new Date().toLocaleDateString()}</span>
        <span>v1.0.0</span>
        <span>{theme.name}</span>
      </div>
    </div>
  );
};