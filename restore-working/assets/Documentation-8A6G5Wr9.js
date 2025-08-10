import{j as e}from"./ui-vendor-k0rDQjvt.js";import{r as i}from"./react-vendor-C_4inHyB.js";import{u as j}from"./index-DG8D6RJe.js";const y=({chart:r,id:s,isActive:c})=>{const{currentTheme:t}=j(),p=i.useRef(null),a=i.useRef(null),[n,l]=i.useState(0),[m,h]=i.useState(1),[u,g]=i.useState(!1),[f,T]=i.useState({x:0,y:0}),[b,v]=i.useState({x:0,y:0});i.useEffect(()=>{c&&l(o=>o+1)},[c,t.name]),i.useEffect(()=>{const o=async()=>{if(window.mermaid&&p.current&&c)try{p.current.innerHTML="";const d=document.createElement("div");d.className="mermaid",d.textContent=r,d.style.width="1600px",d.style.height="800px",p.current.appendChild(d),await window.mermaid.run({nodes:[d]});const x=d.querySelector("svg");x&&(x.style.width="100%",x.style.height="100%",x.style.transform=`scale(${m})`,x.style.transformOrigin="top left")}catch(d){console.error(`Mermaid rendering error for ${s}:`,d),p.current&&(p.current.innerHTML=`
              <div style="padding: 16px; text-align: left; font-size: 11px; color: ${t.textSecondary};">
                <div style="margin-bottom: 8px;">⚠️ Diagram failed to render</div>
                <details>
                  <summary style="cursor: pointer; margin-bottom: 8px;">Show diagram code</summary>
                  <pre style="background: ${t.background}; padding: 8px; border-radius: 3px; overflow: auto; font-size: 10px;">${r}</pre>
                </details>
              </div>
            `)}};c&&n>0&&setTimeout(o,300)},[n,c,r,s,t,m]);const S=o=>{a.current&&(g(!0),T({x:o.clientX,y:o.clientY}),v({x:a.current.scrollLeft,y:a.current.scrollTop}),o.preventDefault())},C=o=>{if(u&&a.current){const d=f.x-o.clientX,x=f.y-o.clientY;a.current.scrollLeft=b.x+d,a.current.scrollTop=b.y+x}},k=()=>{g(!1)};return i.useEffect(()=>{if(u){const o=()=>g(!1);return document.addEventListener("mouseup",o),()=>document.removeEventListener("mouseup",o)}},[u]),e.jsxs("div",{style:{margin:"8px 0",backgroundColor:t.surfaceAlt,border:`1px solid ${t.border}`,borderRadius:"4px",overflow:"hidden"},children:[c&&e.jsxs("div",{style:{padding:"8px 12px",backgroundColor:t.surface,borderBottom:`1px solid ${t.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"},children:[e.jsxs("span",{style:{fontSize:"10px",color:t.textSecondary},children:["Zoom: ",Math.round(m*100),"% • Click & drag to pan • Scroll both ways"]}),e.jsxs("div",{style:{display:"flex",gap:"8px",alignItems:"center"},children:[e.jsx("button",{onClick:()=>h(o=>Math.max(.5,o-.1)),style:{padding:"4px 8px",fontSize:"10px",backgroundColor:t.background,border:`1px solid ${t.border}`,borderRadius:"2px",color:t.text,cursor:"pointer"},children:"−"}),e.jsxs("span",{style:{fontSize:"10px",color:t.text,minWidth:"30px",textAlign:"center"},children:[Math.round(m*100),"%"]}),e.jsx("button",{onClick:()=>h(o=>Math.min(2,o+.1)),style:{padding:"4px 8px",fontSize:"10px",backgroundColor:t.background,border:`1px solid ${t.border}`,borderRadius:"2px",color:t.text,cursor:"pointer"},children:"+"}),e.jsx("button",{onClick:()=>h(1),style:{padding:"4px 8px",fontSize:"10px",backgroundColor:t.background,border:`1px solid ${t.border}`,borderRadius:"2px",color:t.text,cursor:"pointer"},children:"Reset"})]})]}),e.jsx("div",{ref:a,style:{height:"600px",overflow:"auto",backgroundColor:t.background,cursor:u?"grabbing":"grab",userSelect:"none"},onMouseDown:S,onMouseMove:C,onMouseUp:k,children:e.jsxs("div",{ref:p,style:{background:"transparent",margin:0,minWidth:"1600px",minHeight:"800px",display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:u?"none":"auto"},children:[!c&&e.jsx("div",{style:{color:t.textTertiary,fontSize:"12px"},children:"Switch to this tab to view diagram"}),c&&n===0&&e.jsx("div",{style:{color:t.textTertiary,fontSize:"12px"},children:"Preparing diagram..."})]})})]})},M=()=>{const{currentTheme:r}=j(),[s,c]=i.useState(0),[t,p]=i.useState(!1),a=[{title:"Current Architecture",content:e.jsxs("div",{children:[e.jsx("p",{style:{marginBottom:"20px",color:r.textSecondary},children:"GZC Intel App is a modern financial intelligence dashboard built with React, TypeScript, and Vite. It features a comprehensive theme system, drag-and-drop widgets, and professional trading interface."}),e.jsx(y,{id:"current-architecture",isActive:s===0,chart:`graph TD
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
    Tabs --> Analytics`})]})},{title:"Theme System",content:e.jsxs("div",{children:[e.jsx("p",{style:{marginBottom:"20px",color:r.textSecondary},children:"The application features 11 professionally designed themes, each optimized for different use cases and preferences."}),e.jsx(y,{id:"theme-system",isActive:s===1,chart:`graph TD
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
    VM --> LS`}),e.jsxs("div",{style:{backgroundColor:r.surface,border:`1px solid ${r.border}`,borderRadius:"4px",padding:"16px",marginTop:"20px"},children:[e.jsxs("h4",{style:{marginBottom:"8px",color:r.primary},children:["Current Theme: ",r.name]}),e.jsx("p",{style:{margin:0,fontSize:"12px"},children:"Each theme includes carefully selected colors for text, backgrounds, borders, and status indicators. All themes maintain the GZC institutional green for success states and branding consistency."})]})]})},{title:"Component Architecture",content:e.jsxs("div",{children:[e.jsx("p",{style:{marginBottom:"20px",color:r.textSecondary},children:"The application uses a modular component architecture with lazy loading and dynamic imports."}),e.jsx(y,{id:"component-architecture",isActive:s===2,chart:`graph TD
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
    TC --> Widgets[Widget System]`})]})},{title:"Recent Updates",content:e.jsxs("div",{children:[e.jsx("h4",{style:{marginBottom:"16px"},children:"Latest Changes"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))",gap:"12px",marginBottom:"20px"},children:[e.jsxs("div",{style:{backgroundColor:r.surface,border:`1px solid ${r.border}`,borderRadius:"4px",padding:"16px"},children:[e.jsx("h5",{style:{color:r.success,marginBottom:"8px"},children:"✓ Completed Features"}),e.jsxs("ul",{style:{margin:0,paddingLeft:"20px",fontSize:"12px"},children:[e.jsx("li",{children:"11 professional themes with instant switching"}),e.jsx("li",{children:"Theme persistence in localStorage"}),e.jsx("li",{children:"Professional header with GZC logo"}),e.jsx("li",{children:"Market Intel panel with AI agents"}),e.jsx("li",{children:"Drag & drop tab reordering"}),e.jsx("li",{children:"P&L display with real-time updates"}),e.jsx("li",{children:"Documentation with mermaid diagrams"}),e.jsx("li",{children:"Responsive layout system"})]})]}),e.jsxs("div",{style:{backgroundColor:r.surface,border:`1px solid ${r.border}`,borderRadius:"4px",padding:"16px"},children:[e.jsx("h5",{style:{color:r.warning,marginBottom:"8px"},children:"🔄 In Progress"}),e.jsxs("ul",{style:{margin:0,paddingLeft:"20px",fontSize:"12px"},children:[e.jsx("li",{children:"Analytics widgets implementation"}),e.jsx("li",{children:"Real-time market data integration"}),e.jsx("li",{children:"Portfolio management features"}),e.jsx("li",{children:"Advanced charting components"})]})]}),e.jsxs("div",{style:{backgroundColor:r.surface,border:`1px solid ${r.border}`,borderRadius:"4px",padding:"16px"},children:[e.jsx("h5",{style:{color:r.info,marginBottom:"8px"},children:"📋 Planned Features"}),e.jsxs("ul",{style:{margin:0,paddingLeft:"20px",fontSize:"12px"},children:[e.jsx("li",{children:"WebSocket for real-time updates"}),e.jsx("li",{children:"Advanced risk analytics"}),e.jsx("li",{children:"Multi-asset portfolio tracking"}),e.jsx("li",{children:"AI-powered market insights"}),e.jsx("li",{children:"Customizable dashboards"}),e.jsx("li",{children:"Export/Import configurations"})]})]})]})]})},{title:"Technical Stack",content:e.jsxs("div",{children:[e.jsx("h4",{style:{marginBottom:"16px"},children:"Frontend Technologies"}),e.jsx("div",{style:{backgroundColor:r.surface,border:`1px solid ${r.border}`,borderRadius:"4px",padding:"16px",marginBottom:"16px"},children:e.jsx("pre",{style:{backgroundColor:r.background,padding:"12px",borderRadius:"4px",fontSize:"12px",overflow:"auto",color:r.text,margin:0},children:`{
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
}`})}),e.jsxs("div",{style:{backgroundColor:r.surface,border:`1px solid ${r.border}`,borderRadius:"4px",padding:"16px"},children:[e.jsx("h5",{style:{color:r.primary,marginBottom:"12px"},children:"Key Features"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",fontSize:"12px"},children:[e.jsxs("div",{children:[e.jsx("strong",{style:{color:r.text},children:"Performance"}),e.jsxs("ul",{style:{margin:"4px 0",paddingLeft:"20px"},children:[e.jsx("li",{children:"Lazy loading with code splitting"}),e.jsx("li",{children:"Memoized components"}),e.jsx("li",{children:"Virtual scrolling ready"}),e.jsx("li",{children:"Optimized re-renders"})]})]}),e.jsxs("div",{children:[e.jsx("strong",{style:{color:r.text},children:"Developer Experience"}),e.jsxs("ul",{style:{margin:"4px 0",paddingLeft:"20px"},children:[e.jsx("li",{children:"Hot Module Replacement"}),e.jsx("li",{children:"TypeScript strict mode"}),e.jsx("li",{children:"ESLint + Prettier"}),e.jsx("li",{children:"Comprehensive testing"})]})]})]})]})]})},{title:"Development Guide",content:e.jsxs("div",{children:[e.jsx("h4",{style:{marginBottom:"16px"},children:"Getting Started"}),e.jsxs("div",{style:{backgroundColor:r.surface,border:`1px solid ${r.border}`,borderRadius:"4px",padding:"16px",marginBottom:"16px"},children:[e.jsx("h5",{style:{color:r.primary,marginBottom:"12px"},children:"Development Commands"}),e.jsx("pre",{style:{backgroundColor:r.background,padding:"12px",borderRadius:"4px",fontSize:"12px",overflow:"auto",color:r.text,margin:0},children:`# Install dependencies
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
npm run type-check       # TypeScript`})]}),e.jsxs("div",{style:{backgroundColor:r.surface,border:`1px solid ${r.border}`,borderRadius:"4px",padding:"16px"},children:[e.jsx("h5",{style:{color:r.primary,marginBottom:"12px"},children:"Adding a New Theme"}),e.jsx("pre",{style:{backgroundColor:r.background,padding:"12px",borderRadius:"4px",fontSize:"12px",overflow:"auto",color:r.text,margin:0},children:`// src/theme/themes.ts
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
}`})]})]})}];return i.useEffect(()=>{if(window.mermaid){const n=!r.name.includes("Light")&&r.name!=="Arctic"&&r.name!=="Parchment"&&r.name!=="Pearl";window.mermaid.initialize({startOnLoad:!1,theme:n?"dark":"default",securityLevel:"loose",flowchart:{nodeSpacing:60,rankSpacing:80,curve:"linear"},themeVariables:{fontSize:"16px",fontFamily:"Inter, system-ui, sans-serif"}}),p(!0)}else{const n=document.createElement("script");n.src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js",n.async=!0,n.onload=()=>{const l=!r.name.includes("Light")&&r.name!=="Arctic"&&r.name!=="Parchment"&&r.name!=="Pearl";window.mermaid.initialize({startOnLoad:!1,theme:l?"dark":"default",securityLevel:"loose",flowchart:{nodeSpacing:50,rankSpacing:60,curve:"linear"},themeVariables:{fontSize:"16px",fontFamily:"Inter, system-ui, sans-serif"}}),p(!0)},document.body.appendChild(n)}},[r.name]),i.useEffect(()=>()=>{document.querySelectorAll(".mermaid svg").forEach(n=>n.remove())},[]),e.jsxs("div",{style:{height:"calc(100vh - 88px)",padding:"8px",color:r.text},children:[e.jsxs("div",{style:{display:"flex",gap:"8px",height:"calc(100% - 16px)"},children:[e.jsxs("div",{style:{width:"200px",backgroundColor:r.surface,borderRadius:"4px",border:`1px solid ${r.border}`,padding:"8px",overflow:"auto",display:"flex",flexDirection:"column"},children:[e.jsx("h3",{style:{fontSize:"10px",fontWeight:r.typography.h3.fontWeight,marginBottom:"8px",color:r.textSecondary,textTransform:"uppercase",letterSpacing:"0.5px"},children:"Contents"}),a.map((n,l)=>e.jsx("div",{onClick:()=>c(l),style:{padding:"6px 8px",marginBottom:"2px",borderRadius:"2px",cursor:"pointer",fontSize:"11px",backgroundColor:s===l?r.name.includes("Light")||r.name==="Arctic"||r.name==="Parchment"||r.name==="Pearl"?"rgba(0, 0, 0, 0.05)":"rgba(255, 255, 255, 0.05)":"transparent",borderLeft:s===l?`2px solid ${r.primary}`:"2px solid transparent",transition:"all 0.2s ease",color:s===l?r.primary:r.text},onMouseEnter:m=>{s!==l&&(m.currentTarget.style.backgroundColor=r.name.includes("Light")||r.name==="Arctic"||r.name==="Parchment"||r.name==="Pearl"?"rgba(0, 0, 0, 0.02)":"rgba(255, 255, 255, 0.02)")},onMouseLeave:m=>{s!==l&&(m.currentTarget.style.backgroundColor="transparent")},children:n.title},l))]}),e.jsxs("div",{style:{flex:1,backgroundColor:r.surface,borderRadius:"4px",border:`1px solid ${r.border}`,padding:"16px",overflow:"auto",display:"flex",flexDirection:"column"},children:[e.jsx("h2",{style:{fontSize:"13px",fontWeight:"600",marginBottom:"12px",color:r.text},children:a[s].title}),e.jsx("div",{style:{fontSize:r.typography.body.fontSize,lineHeight:1.6},children:a[s].content})]})]}),e.jsxs("div",{style:{marginTop:"8px",padding:"6px 8px",backgroundColor:r.surface,borderRadius:"4px",border:`1px solid ${r.border}`,textAlign:"center",fontSize:"9px",color:r.textSecondary,display:"flex",justifyContent:"space-between",alignItems:"center"},children:[e.jsxs("span",{children:["Updated: ",new Date().toLocaleDateString()]}),e.jsx("span",{children:"v1.0.0"}),e.jsx("span",{children:r.name})]})]})};export{M as Documentation};
