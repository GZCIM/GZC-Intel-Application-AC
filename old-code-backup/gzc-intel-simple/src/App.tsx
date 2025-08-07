import React, { useState } from 'react'
import Dashboard from './components/Dashboard'
import Tools from './components/Tools'
import Bloomberg from './components/Bloomberg'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', component: Dashboard },
    { id: 'tools', label: 'Tools', component: Tools },
    { id: 'bloomberg', label: 'Bloomberg Vol', component: Bloomberg }
  ]

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || Dashboard

  return (
    <div className="app-container">
      <header className="header">
        <h1>GZC Intel App</h1>
        <p>Simple Local Version with Tools Tab</p>
      </header>

      <nav className="nav-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="tab-content">
        <ActiveComponent />
      </main>
    </div>
  )
}

export default App