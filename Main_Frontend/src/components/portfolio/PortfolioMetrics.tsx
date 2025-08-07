import React from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import { PortfolioMetrics as MetricsType, TimeRange } from '../../types/portfolio'

interface PortfolioMetricsProps {
  metrics: MetricsType
  timeRange: TimeRange
}

export const PortfolioMetrics: React.FC<PortfolioMetricsProps> = ({
  metrics,
  timeRange
}) => {
  const { currentTheme: theme } = useTheme()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const formatRatio = (value: number) => {
    return value.toFixed(2)
  }

  const metricsData = [
    {
      label: 'Total Value',
      value: formatCurrency(metrics.totalValue),
      change: null,
      icon: '💰'
    },
    {
      label: 'Market Value',
      value: formatCurrency(metrics.marketValue),
      change: null,
      icon: '📊'
    },
    {
      label: 'Day P&L',
      value: formatCurrency(metrics.dayPnL),
      change: formatPercent(metrics.dayPnLPercent),
      changeColor: metrics.dayPnL >= 0 ? theme.success : theme.danger,
      icon: '📈'
    },
    {
      label: 'Total P&L',
      value: formatCurrency(metrics.totalPnL),
      change: formatPercent(metrics.totalPnLPercent),
      changeColor: metrics.totalPnL >= 0 ? theme.success : theme.danger,
      icon: '💹'
    },
    {
      label: 'Realized P&L',
      value: formatCurrency(metrics.realizedPnL),
      change: null,
      icon: '✅'
    },
    {
      label: 'Unrealized P&L',
      value: formatCurrency(metrics.unrealizedPnL),
      change: null,
      changeColor: metrics.unrealizedPnL >= 0 ? theme.success : theme.danger,
      icon: '⏳'
    },
    {
      label: 'Cash',
      value: formatCurrency(metrics.cash),
      change: null,
      icon: '💵'
    },
    {
      label: 'Leverage',
      value: `${formatRatio(metrics.leverage)}x`,
      change: null,
      icon: '⚖️'
    },
    {
      label: 'Sharpe Ratio',
      value: formatRatio(metrics.sharpeRatio),
      change: null,
      icon: '📏'
    },
    {
      label: 'Max Drawdown',
      value: formatPercent(metrics.maxDrawdown),
      change: null,
      changeColor: theme.danger,
      icon: '📉'
    },
    {
      label: 'Win Rate',
      value: formatPercent(metrics.winRate),
      change: null,
      icon: '🎯'
    },
    {
      label: 'Beta',
      value: formatRatio(metrics.beta),
      change: null,
      icon: '📐'
    }
  ]

  return (
    <div style={{
      padding: '16px 20px',
      backgroundColor: theme.surface,
      borderBottom: `1px solid ${theme.border}`
    }}>
      {/* Main Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '16px'
      }}>
        {metricsData.slice(0, 6).map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: theme.background,
              borderRadius: '8px',
              border: `1px solid ${theme.border}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>{metric.icon}</span>
              <div>
                <div style={{
                  fontSize: '11px',
                  color: theme.textSecondary,
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {metric.label}
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: metric.changeColor || theme.text,
                  marginTop: '2px'
                }}>
                  {metric.value}
                </div>
              </div>
            </div>
            
            {metric.change && (
              <div style={{
                fontSize: '12px',
                fontWeight: '500',
                color: metric.changeColor,
                textAlign: 'right'
              }}>
                {metric.change}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Secondary Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px'
      }}>
        {metricsData.slice(6).map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (index + 6) * 0.05 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: theme.background,
              borderRadius: '6px',
              border: `1px solid ${theme.border}`
            }}
          >
            <span style={{ fontSize: '14px' }}>{metric.icon}</span>
            <div>
              <div style={{
                fontSize: '10px',
                color: theme.textSecondary,
                fontWeight: '500'
              }}>
                {metric.label}
              </div>
              <div style={{
                fontSize: '13px',
                fontWeight: '600',
                color: metric.changeColor || theme.text
              }}>
                {metric.value}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Exposure Breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '12px',
        marginTop: '16px',
        paddingTop: '16px',
        borderTop: `1px solid ${theme.border}`
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: theme.textSecondary, marginBottom: '4px' }}>
            NET EXPOSURE
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: theme.text }}>
            {formatCurrency(metrics.netExposure)}
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: theme.textSecondary, marginBottom: '4px' }}>
            GROSS EXPOSURE
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: theme.text }}>
            {formatCurrency(metrics.grossExposure)}
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: theme.textSecondary, marginBottom: '4px' }}>
            LONG EXPOSURE
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: theme.success }}>
            {formatCurrency(metrics.longExposure)}
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: theme.textSecondary, marginBottom: '4px' }}>
            SHORT EXPOSURE
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: theme.danger }}>
            {formatCurrency(metrics.shortExposure)}
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: theme.textSecondary, marginBottom: '4px' }}>
            VOLATILITY
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: theme.text }}>
            {formatPercent(metrics.volatility)}
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: theme.textSecondary, marginBottom: '4px' }}>
            ALPHA
          </div>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            color: metrics.alpha >= 0 ? theme.success : theme.danger 
          }}>
            {formatPercent(metrics.alpha)}
          </div>
        </div>
      </div>
    </div>
  )
}