import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import { useQuoteContext } from '../../contexts/QuoteContext'
import { useUser } from '../../contexts/UserContext'
import { PortfolioTable } from './PortfolioTable'
import { PortfolioMetrics } from './PortfolioMetrics'
import { PortfolioChart } from './PortfolioChart'
import { 
  PortfolioPosition, 
  PortfolioMetrics as MetricsType,
  PortfolioFilter,
  TimeRange 
} from '../../types/portfolio'
import { generateMockPortfolio } from '../../utils/mockPortfolioData'

interface PortfolioProps {
  width?: number | string
  height?: number | string
  mockMode?: boolean
}

export const Portfolio: React.FC<PortfolioProps> = ({
  width = '100%',
  height = '100%',
  mockMode = true
}) => {
  const { currentTheme: theme } = useTheme()
  const { user: currentUser } = useUser()
  const { subscribeToSymbol, getQuote } = useQuoteContext()
  
  const [positions, setPositions] = useState<PortfolioPosition[]>([])
  const [metrics, setMetrics] = useState<MetricsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<PortfolioFilter>({
    search: '',
    side: 'ALL',
    profitable: undefined
  })
  const [timeRange, setTimeRange] = useState<TimeRange>('1D')
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'chart'>('table')

  // Initialize with mock data or fetch real data
  useEffect(() => {
    const loadPortfolioData = async () => {
      setLoading(true)
      
      if (mockMode) {
        // Use mock data
        const mockData = generateMockPortfolio(currentUser?.id || 'default')
        setPositions(mockData.positions)
        setMetrics(mockData.metrics)
        
        // Subscribe to quotes for all positions
        mockData.positions.forEach(pos => {
          subscribeToSymbol(pos.symbol)
        })
      } else {
        // TODO: Fetch real portfolio data from API
        try {
          // const response = await fetch(`/api/portfolio/${currentUser?.id}`)
          // const data = await response.json()
          // setPositions(data.positions)
          // setMetrics(data.metrics)
        } catch (error) {
          console.error('Failed to load portfolio:', error)
        }
      }
      
      setLoading(false)
    }

    loadPortfolioData()
  }, [currentUser, mockMode, subscribeToSymbol])

  // Update positions with real-time quotes
  const updatedPositions = useMemo(() => {
    return positions.map(position => {
      const quote = getQuote(position.symbol)
      if (!quote) return position

      const currentPrice = quote.last
      const marketValue = position.quantity * currentPrice
      const costBasis = position.quantity * position.averagePrice
      const unrealizedPnL = marketValue - costBasis
      const pnlPercent = (unrealizedPnL / costBasis) * 100

      return {
        ...position,
        currentPrice,
        marketValue,
        unrealizedPnL,
        totalPnL: position.realizedPnL + unrealizedPnL,
        pnlPercent
      }
    })
  }, [positions, getQuote])

  // Apply filters
  const filteredPositions = useMemo(() => {
    return updatedPositions.filter(position => {
      // Search filter
      if (filter.search) {
        const searchLower = filter.search.toLowerCase()
        if (!position.symbol.toLowerCase().includes(searchLower)) {
          return false
        }
      }

      // Side filter
      if (filter.side !== 'ALL' && position.side !== filter.side) {
        return false
      }

      // Profitable filter
      if (filter.profitable !== undefined) {
        const isProfitable = position.totalPnL > 0
        if (filter.profitable !== isProfitable) {
          return false
        }
      }

      // Asset class filter
      if (filter.assetClass && filter.assetClass.length > 0) {
        if (!filter.assetClass.includes(position.assetClass)) {
          return false
        }
      }

      return true
    })
  }, [updatedPositions, filter])

  // Calculate updated metrics
  const updatedMetrics = useMemo(() => {
    if (!metrics) return null

    const totalMarketValue = filteredPositions.reduce((sum, pos) => sum + pos.marketValue, 0)
    const totalUnrealizedPnL = filteredPositions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0)
    const totalPnL = filteredPositions.reduce((sum, pos) => sum + pos.totalPnL, 0)

    return {
      ...metrics,
      marketValue: totalMarketValue,
      unrealizedPnL: totalUnrealizedPnL,
      totalPnL,
      totalPnLPercent: (totalPnL / (totalMarketValue - totalPnL)) * 100
    }
  }, [metrics, filteredPositions])

  return (
    <div style={{
      width,
      height,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: theme.background,
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${theme.border}`,
        backgroundColor: theme.surface
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: theme.text
          }}>
            Portfolio
          </h2>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* View Mode Selector */}
            <div style={{
              display: 'flex',
              backgroundColor: theme.background,
              borderRadius: '6px',
              padding: '2px',
              border: `1px solid ${theme.border}`
            }}>
              {(['table', 'grid', 'chart'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: viewMode === mode ? theme.primary : 'transparent',
                    color: viewMode === mode ? theme.background : theme.text,
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              style={{
                padding: '6px 12px',
                backgroundColor: theme.background,
                color: theme.text,
                border: `1px solid ${theme.border}`,
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {(['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', 'ALL'] as TimeRange[]).map(range => (
                <option key={range} value={range}>{range}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      {updatedMetrics && (
        <PortfolioMetrics 
          metrics={updatedMetrics}
          timeRange={timeRange}
        />
      )}

      {/* Filters */}
      <div style={{
        padding: '12px 20px',
        borderBottom: `1px solid ${theme.border}`,
        backgroundColor: theme.surface
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          {/* Search */}
          <input
            type="text"
            placeholder="Search symbols..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            style={{
              flex: 1,
              maxWidth: '300px',
              padding: '6px 12px',
              backgroundColor: theme.background,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none'
            }}
          />

          {/* Side Filter */}
          <select
            value={filter.side}
            onChange={(e) => setFilter({ ...filter, side: e.target.value as any })}
            style={{
              padding: '6px 12px',
              backgroundColor: theme.background,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Positions</option>
            <option value="LONG">Long Only</option>
            <option value="SHORT">Short Only</option>
          </select>

          {/* Profitable Filter */}
          <button
            onClick={() => setFilter({ 
              ...filter, 
              profitable: filter.profitable === true ? false : filter.profitable === false ? undefined : true 
            })}
            style={{
              padding: '6px 12px',
              backgroundColor: filter.profitable === true 
                ? theme.success 
                : filter.profitable === false 
                  ? theme.danger 
                  : theme.background,
              color: filter.profitable !== undefined ? theme.background : theme.text,
              border: `1px solid ${filter.profitable !== undefined ? 'transparent' : theme.border}`,
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            {filter.profitable === true ? '✓ Profitable' : filter.profitable === false ? '✗ Losing' : 'All P&L'}
          </button>

          <div style={{ flex: 1 }} />

          {/* Position Count */}
          <span style={{
            fontSize: '12px',
            color: theme.textSecondary
          }}>
            {filteredPositions.length} positions
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        padding: viewMode === 'chart' ? '0' : '0'
      }}>
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: theme.textSecondary
          }}>
            Loading portfolio...
          </div>
        ) : viewMode === 'table' ? (
          <PortfolioTable 
            positions={filteredPositions}
            onPositionClick={(position) => console.log('Position clicked:', position)}
          />
        ) : viewMode === 'chart' ? (
          <PortfolioChart 
            positions={filteredPositions}
            timeRange={timeRange}
          />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
            padding: '16px'
          }}>
            {filteredPositions.map(position => (
              <motion.div
                key={position.symbol}
                whileHover={{ scale: 1.02 }}
                style={{
                  padding: '16px',
                  backgroundColor: theme.surface,
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`,
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '12px'
                }}>
                  <div>
                    <h4 style={{ margin: 0, color: theme.text }}>{position.symbol}</h4>
                    <span style={{ fontSize: '12px', color: theme.textSecondary }}>
                      {position.side} • {position.assetClass}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: position.totalPnL >= 0 ? theme.success : theme.danger
                  }}>
                    {position.totalPnL >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: theme.textSecondary }}>Value</span>
                  <span style={{ color: theme.text }}>
                    ${position.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}