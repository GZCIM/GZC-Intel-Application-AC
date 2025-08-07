import React, { useMemo } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { PortfolioPosition, TimeRange } from '../../types/portfolio'

interface PortfolioChartProps {
  positions: PortfolioPosition[]
  timeRange: TimeRange
}

export const PortfolioChart: React.FC<PortfolioChartProps> = ({
  positions,
  timeRange
}) => {
  const { currentTheme: theme } = useTheme()

  // Calculate allocation by asset class
  const allocationData = useMemo(() => {
    const totalValue = positions.reduce((sum, pos) => sum + Math.abs(pos.marketValue), 0)
    
    const allocations = positions.reduce((acc, pos) => {
      const value = Math.abs(pos.marketValue)
      acc[pos.assetClass] = (acc[pos.assetClass] || 0) + value
      return acc
    }, {} as Record<string, number>)

    return Object.entries(allocations).map(([assetClass, value]) => ({
      assetClass,
      value,
      percentage: (value / totalValue) * 100
    })).sort((a, b) => b.value - a.value)
  }, [positions])

  // P&L by position for bar chart
  const pnlData = useMemo(() => {
    return positions
      .sort((a, b) => Math.abs(b.totalPnL) - Math.abs(a.totalPnL))
      .slice(0, 10) // Top 10 by absolute P&L
  }, [positions])

  const colors = [
    theme.primary,
    theme.success,
    theme.warning,
    theme.info,
    theme.secondary,
    '#E91E63',
    '#9C27B0',
    '#673AB7',
    '#3F51B5',
    '#2196F3'
  ]

  return (
    <div style={{
      padding: '20px',
      height: '100%',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px'
    }}>
      {/* Asset Allocation Pie Chart */}
      <div style={{
        backgroundColor: theme.surface,
        borderRadius: '8px',
        border: `1px solid ${theme.border}`,
        padding: '16px'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: theme.text
        }}>
          Asset Allocation
        </h3>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '300px'
        }}>
          <svg width="280" height="280" viewBox="0 0 280 280">
            {allocationData.map((item, index) => {
              const angle = (item.percentage / 100) * 360
              const startAngle = allocationData
                .slice(0, index)
                .reduce((sum, prev) => sum + (prev.percentage / 100) * 360, 0)
              
              const x1 = 140 + 100 * Math.cos((startAngle - 90) * Math.PI / 180)
              const y1 = 140 + 100 * Math.sin((startAngle - 90) * Math.PI / 180)
              const x2 = 140 + 100 * Math.cos((startAngle + angle - 90) * Math.PI / 180)
              const y2 = 140 + 100 * Math.sin((startAngle + angle - 90) * Math.PI / 180)
              
              const largeArcFlag = angle > 180 ? 1 : 0
              
              const pathData = [
                `M 140 140`,
                `L ${x1} ${y1}`,
                `A 100 100 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ')
              
              return (
                <path
                  key={item.assetClass}
                  d={pathData}
                  fill={colors[index % colors.length]}
                  stroke={theme.background}
                  strokeWidth="2"
                />
              )
            })}
          </svg>
        </div>
        
        <div style={{ marginTop: '16px' }}>
          {allocationData.map((item, index) => (
            <div
              key={item.assetClass}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    backgroundColor: colors[index % colors.length]
                  }}
                />
                <span style={{ fontSize: '12px', color: theme.text }}>
                  {item.assetClass}
                </span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: theme.text }}>
                {item.percentage.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* P&L Bar Chart */}
      <div style={{
        backgroundColor: theme.surface,
        borderRadius: '8px',
        border: `1px solid ${theme.border}`,
        padding: '16px'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: theme.text
        }}>
          Top P&L Contributors
        </h3>
        
        <div style={{ height: '320px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pnlData.map((position, index) => {
            const maxAbsPnL = Math.max(...pnlData.map(p => Math.abs(p.totalPnL)))
            const barWidth = Math.abs(position.totalPnL) / maxAbsPnL * 100
            
            return (
              <div
                key={position.symbol}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  height: '28px'
                }}
              >
                <div style={{
                  width: '60px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: theme.text,
                  textAlign: 'right'
                }}>
                  {position.symbol}
                </div>
                
                <div style={{
                  flex: 1,
                  height: '20px',
                  backgroundColor: theme.background,
                  borderRadius: '4px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div
                    style={{
                      width: `${barWidth}%`,
                      height: '100%',
                      backgroundColor: position.totalPnL >= 0 ? theme.success : theme.danger,
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
                
                <div style={{
                  width: '80px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: position.totalPnL >= 0 ? theme.success : theme.danger,
                  textAlign: 'right'
                }}>
                  {position.totalPnL >= 0 ? '+' : ''}${Math.abs(position.totalPnL).toFixed(0)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}