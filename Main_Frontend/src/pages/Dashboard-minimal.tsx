import React from 'react'
import { motion } from 'framer-motion'
import { useComponentRegistry } from '../core/registry'

export function Dashboard() {
  const registryState = useComponentRegistry()

  // Calculate real statistics
  const registryStats = {
    total: registryState.components.size,
    ready: Array.from(registryState.components.values()).filter(c => c.status === 'ready').length,
    loading: registryState.loading.size,
    errors: Array.from(registryState.components.values()).filter(c => c.status === 'error').length
  }

  const systemStats = {
    uptime: Math.floor((Date.now() - performance.timeOrigin) / 1000),
    port: window.location.port || '3500',
    protocol: window.location.protocol
  }

  return (
    <div className="container-fluid p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="row mb-4">
          <div className="col">
            <h2 className="h3 mb-1">GZC Intel Dashboard</h2>
            <p className="text-muted">Live system status and component registry</p>
          </div>
        </div>

        {/* System Stats */}
        <div className="row g-4 mb-5">
          <div className="col-lg-6 col-md-6">
            <div className="card h-100">
              <div className="card-body text-center">
                <div className="display-6 mb-2">
                  {systemStats.uptime > 0 ? '🟢' : '🔴'}
                </div>
                <h5 className="card-title">System Status</h5>
                <p className="card-text text-success">
                  {systemStats.uptime > 0 ? 'Online' : 'Offline'}
                </p>
                <small className="text-muted">
                  Port {systemStats.port} • {Math.floor(systemStats.uptime / 60)}m uptime
                </small>
              </div>
            </div>
          </div>

          <div className="col-lg-6 col-md-6">
            <div className="card h-100">
              <div className="card-body text-center">
                <div className="display-6 mb-2">🧩</div>
                <h5 className="card-title">Components</h5>
                <p className="card-text text-primary">
                  {registryStats.ready} Active
                </p>
                <small className="text-muted">
                  {registryStats.total} total • {registryStats.errors} errors
                </small>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}