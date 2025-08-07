import React, { useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { FeatherIcon } from './icons/FeatherIcon'

export const MarketIntelPanel = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { currentTheme: theme } = useTheme()
  
  return (
    <div style={{
      width: isCollapsed ? '60px' : '320px',
      height: 'calc(100vh - 88px)', // Dynamic height: full viewport minus header minus footer
      backgroundColor: theme.surface,
      borderRight: `1px solid ${theme.border}`,
      padding: isCollapsed ? '16px 12px' : '16px',
      paddingBottom: isCollapsed ? '16px' : '16px', // Consistent padding
      overflowY: 'auto',
      transition: 'width 0.3s ease',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header with collapse button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        minHeight: '32px'
      }}>
        {!isCollapsed && (
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: theme.primary,
            opacity: theme.name === 'GZC Light' || theme.name === 'Arctic' || theme.name === 'Parchment' || theme.name === 'Pearl' ? 0.9 : 1,
            margin: 0,
            letterSpacing: '0.5px'
          }}>
            Market Intel
          </h3>
        )}
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            background: 'none',
            border: 'none',
            color: theme.textSecondary,
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            marginLeft: isCollapsed ? 0 : 'auto'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.surface
            e.currentTarget.style.color = theme.text
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = theme.textSecondary
          }}
        >
          <FeatherIcon 
            name={isCollapsed ? "chevron-right" : "chevron-left"} 
            size={16} 
          />
        </button>
      </div>
      
      {/* AI Agent Panel with Tabs */}
      {!isCollapsed && (
        <>
          {/* Tab Navigation */}
          <AIAgentTabs />
          
          {/* AI Agent Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <AIAgentContent />
          </div>
        </>
      )}
      
      {/* Collapsed state - just icons */}
      {isCollapsed && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: theme.surface }} title="AI Agents">
            <FeatherIcon name="cpu" size={16} color={theme.primary} />
          </div>
          <div style={{ padding: '8px', borderRadius: '6px' }} title="Notifications">
            <FeatherIcon name="bell" size={16} color={theme.textSecondary} />
          </div>
          <div style={{ padding: '8px', borderRadius: '6px' }} title="Reports">
            <FeatherIcon name="file-text" size={16} color={theme.textSecondary} />
          </div>
          <div style={{ padding: '8px', borderRadius: '6px' }} title="Azure Jobs">
            <FeatherIcon name="cloud" size={16} color={theme.textSecondary} />
          </div>
        </div>
      )}

      {/* Professional Status Footer - only show when expanded */}
      {!isCollapsed && (
        <div style={{
          marginTop: 'auto',
          paddingTop: '16px',
          borderTop: `1px solid ${theme.borderLight}`,
          fontSize: '10px',
          color: theme.textTertiary
        }}>
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: theme.success }}>●</span> All Systems Operational
          </div>
          <div style={{ marginBottom: '6px' }}>
            Version: 1.0.0 | Build: 202507
          </div>
          <div>
            Professional Architecture | Content-Agnostic
          </div>
        </div>
      )}
    </div>
  )
}

// AI Agent Tabs Component
const AIAgentTabs = () => {
  const [activeTab, setActiveTab] = useState('agents')
  const { currentTheme: theme } = useTheme()
  
  const tabs = [
    { id: 'agents', label: 'AI Agents', icon: 'cpu' },
    { id: 'notifications', label: 'Alerts', icon: 'bell' },
    { id: 'reports', label: 'Reports', icon: 'file-text' },
    { id: 'azure', label: 'Azure Jobs', icon: 'cloud' }
  ]

  return (
    <div style={{
      display: 'flex',
      borderBottom: `1px solid ${theme.borderLight}`,
      marginBottom: '16px'
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '8px 4px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === tab.id ? `2px solid ${theme.primary}` : '2px solid transparent',
            transition: 'all 0.2s ease'
          }}
        >
          <FeatherIcon 
            name={tab.icon} 
            size={14} 
            color={activeTab === tab.id ? theme.primary : theme.textSecondary} 
          />
          <span style={{
            fontSize: '10px',
            color: activeTab === tab.id ? theme.primary : theme.textSecondary,
            marginTop: '2px',
            fontWeight: activeTab === tab.id ? 600 : 400
          }}>
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  )
}

// AI Agent Content Component
const AIAgentContent = () => {
  const { currentTheme: theme } = useTheme()
  
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {/* Active AI Agents */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '11px',
          fontWeight: 600,
          color: theme.textSecondary,
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Active AI Agents
        </h4>
        
        <AIAgentCard
          name="Market Sentiment Analyzer"
          status="running"
          lastUpdate="2 min ago"
          icon="brain"
        />
        
        <AIAgentCard
          name="Risk Assessment Bot"
          status="idle"
          lastUpdate="15 min ago"
          icon="shield"
        />
        
        <AIAgentCard
          name="News Impact Scorer"
          status="running"
          lastUpdate="1 min ago"
          icon="newspaper"
        />
      </div>

      {/* Recent Notifications */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '11px',
          fontWeight: 600,
          color: theme.textSecondary,
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Recent Alerts
        </h4>
        
        <NotificationCard
          type="info"
          message="Federal Reserve speech at 2:00 PM EST"
          time="10 min ago"
        />
        
        <NotificationCard
          type="warning"
          message="Unusual volume spike in EUR/USD"
          time="25 min ago"
        />
        
        <NotificationCard
          type="success"
          message="Weekly report generated successfully"
          time="1 hour ago"
        />
      </div>

      {/* Azure Job Queue */}
      <div>
        <h4 style={{
          fontSize: '11px',
          fontWeight: 600,
          color: theme.textSecondary,
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Azure Job Queue
        </h4>
        
        <AzureJobCard
          jobName="Data Pipeline Sync"
          status="completed"
          progress={100}
          eta="Completed"
        />
        
        <AzureJobCard
          jobName="ML Model Training"
          status="running"
          progress={67}
          eta="8 min remaining"
        />
        
        <AzureJobCard
          jobName="Report Distribution"
          status="queued"
          progress={0}
          eta="Starting soon"
        />
      </div>
    </div>
  )
}

// AI Agent Card Component
const AIAgentCard = ({ name, status, lastUpdate, icon }: {
  name: string
  status: 'running' | 'idle' | 'error'
  lastUpdate: string
  icon: string
}) => {
  const { currentTheme: theme } = useTheme()
  
  const statusColor = status === 'running' ? theme.success : 
                     status === 'idle' ? theme.textSecondary : 
                     theme.danger

  return (
    <div style={{
      padding: '8px',
      marginBottom: '6px',
      backgroundColor: theme.surface,
      borderRadius: '4px',
      border: `1px solid ${theme.borderLight}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
        <FeatherIcon 
          name={icon} 
          size={12} 
          color={theme.primary} 
          style={{ 
            opacity: theme.name.includes('Light') || theme.name === 'Arctic' || theme.name === 'Parchment' || theme.name === 'Pearl' ? 0.7 : 1 
          }} 
        />
        <span style={{
          fontSize: '10px',
          fontWeight: 500,
          color: theme.text,
          marginLeft: '6px',
          flex: 1
        }}>
          {name}
        </span>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: statusColor,
          opacity: theme.name.includes('Light') || theme.name === 'Arctic' || theme.name === 'Parchment' || theme.name === 'Pearl' ? 0.8 : 1
        }} />
      </div>
      <div style={{
        fontSize: '9px',
        color: theme.textTertiary
      }}>
        {lastUpdate}
      </div>
    </div>
  )
}

// Notification Card Component
const NotificationCard = ({ type, message, time }: {
  type: 'info' | 'warning' | 'success' | 'error'
  message: string
  time: string
}) => {
  const { currentTheme: theme } = useTheme()
  
  const typeColors = {
    info: theme.primary,
    warning: theme.warning,
    success: theme.success,
    error: theme.danger
  }

  const typeIcons = {
    info: 'info',
    warning: 'alert-triangle',
    success: 'check-circle',
    error: 'x-circle'
  }

  return (
    <div style={{
      padding: '8px',
      marginBottom: '6px',
      backgroundColor: theme.background,
      borderRadius: '4px',
      borderLeft: `3px solid ${typeColors[type]}`
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <FeatherIcon name={typeIcons[type]} size={10} color={typeColors[type]} />
        <div style={{ marginLeft: '6px', flex: 1 }}>
          <div style={{
            fontSize: '10px',
            color: theme.text,
            lineHeight: '12px',
            marginBottom: '2px'
          }}>
            {message}
          </div>
          <div style={{
            fontSize: '9px',
            color: theme.textTertiary
          }}>
            {time}
          </div>
        </div>
      </div>
    </div>
  )
}

// Azure Job Card Component
const AzureJobCard = ({ jobName, status, progress, eta }: {
  jobName: string
  status: 'running' | 'completed' | 'queued' | 'error'
  progress: number
  eta: string
}) => {
  const { currentTheme: theme } = useTheme()
  
  const statusColors = {
    running: theme.primary,
    completed: theme.success,
    queued: theme.textSecondary,
    error: theme.danger
  }

  return (
    <div style={{
      padding: '8px',
      marginBottom: '6px',
      backgroundColor: theme.surface,
      borderRadius: '4px',
      border: `1px solid ${theme.borderLight}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{
          fontSize: '10px',
          fontWeight: 500,
          color: theme.text
        }}>
          {jobName}
        </span>
        <span style={{
          fontSize: '9px',
          color: statusColors[status],
          textTransform: 'uppercase',
          fontWeight: 600
        }}>
          {status}
        </span>
      </div>
      
      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: '2px',
        backgroundColor: theme.borderLight,
        borderRadius: '1px',
        marginBottom: '4px'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          backgroundColor: statusColors[status],
          borderRadius: '1px',
          transition: 'width 0.3s ease'
        }} />
      </div>
      
      <div style={{
        fontSize: '9px',
        color: theme.textTertiary
      }}>
        {eta}
      </div>
    </div>
  )
}