import { motion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/components', label: 'Components', icon: '🧩' },
    { path: '/docs', label: 'Documentation', icon: '📚' },
  ]

  return (
    <div className="min-h-screen bg-background text-text">
      {/* Header */}
      <motion.header 
        className="gzc-surface border-bottom gzc-border"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="container-fluid px-4 py-3">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <h1 className="h4 mb-0 me-4" style={{ color: 'var(--gzc-primary)' }}>
                🚀 GZC Intel
              </h1>
              <nav className="d-flex gap-3">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-link px-3 py-2 rounded text-decoration-none ${
                      location.pathname === item.path 
                        ? 'bg-primary text-white' 
                        : 'text-gzc-text-muted hover-scale'
                    }`}
                    style={{
                      backgroundColor: location.pathname === item.path ? 'var(--gzc-primary)' : 'transparent'
                    }}
                  >
                    <span className="me-2">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                <div 
                  className="rounded-circle"
                  style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: 'var(--gzc-success)',
                    boxShadow: '0 0 4px var(--gzc-success)'
                  }}
                />
                <small className="text-muted">Port 3500</small>
              </div>
              
              <button 
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  const themes = ['professional', 'institutional', 'enterprise']
                  const current = document.documentElement.getAttribute('data-theme') || 'professional'
                  const currentIndex = themes.indexOf(current)
                  const nextTheme = themes[(currentIndex + 1) % themes.length]
                  document.documentElement.setAttribute('data-theme', nextTheme)
                }}
              >
                🎨 Theme
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="gzc-surface border-top gzc-border mt-auto">
        <div className="container-fluid px-4 py-3">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              GZC Intel - Modular Trading Intelligence Platform
            </small>
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                <small className="text-muted">Month to Date P&L:</small>
                <small className="text-success fw-semibold">+$86,930.45</small>
                <span className="text-muted">|</span>
                <small className="text-muted">Daily P&L:</small>
                <small className="text-success fw-semibold">+$12,886.81</small>
              </div>
              <span className="text-muted">|</span>
              <div className="d-flex gap-3">
                <small className="text-muted">Foundation: ✅</small>
                <small className="text-muted">Components: 🚧</small>
                <small className="text-muted">Analytics: ⏳</small>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}