import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

interface PriceTickerProps {
  symbols?: string[]
  refreshInterval?: number
}

interface TickerData {
  symbol: string
  price: number
  change: number
  changePercent: number
}

export const PriceTicker: React.FC<PriceTickerProps> = ({
  symbols = ['BTC', 'ETH', 'SPX', 'EUR'],
  refreshInterval = 5000
}) => {
  const { currentTheme } = useTheme()
  const [tickers, setTickers] = useState<TickerData[]>([])

  useEffect(() => {
    // Initialize with random data
    const initData = symbols.map(symbol => ({
      symbol,
      price: Math.random() * 10000 + 1000,
      change: (Math.random() - 0.5) * 200,
      changePercent: (Math.random() - 0.5) * 10
    }))
    setTickers(initData)

    // Simulate price updates
    const interval = setInterval(() => {
      setTickers(prev => prev.map(ticker => ({
        ...ticker,
        price: ticker.price + (Math.random() - 0.5) * 50,
        change: ticker.change + (Math.random() - 0.5) * 10,
        changePercent: ticker.changePercent + (Math.random() - 0.5) * 0.5
      })))
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [symbols, refreshInterval])

  return (
    <div style={{
      height: '100%',
      width: '100%',
      backgroundColor: currentTheme.surface,
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <h3 style={{
        margin: 0,
        fontSize: '14px',
        fontWeight: '600',
        color: currentTheme.text,
        paddingBottom: '8px',
        borderBottom: `1px solid ${currentTheme.border}`
      }}>
        Price Ticker
      </h3>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        overflowY: 'auto'
      }}>
        {tickers.map(ticker => (
          <motion.div
            key={ticker.symbol}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              backgroundColor: currentTheme.background,
              borderRadius: '6px',
              border: `1px solid ${currentTheme.border}`
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                fontSize: '12px',
                fontWeight: '600',
                color: currentTheme.text
              }}>
                {ticker.symbol}
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{
                fontSize: '12px',
                fontWeight: '500',
                color: currentTheme.text
              }}>
                ${ticker.price.toFixed(2)}
              </span>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: ticker.change > 0 ? currentTheme.success : currentTheme.danger
              }}>
                <span style={{ fontSize: '10px' }}>
                  {ticker.change > 0 ? '▲' : '▼'}
                </span>
                <span style={{ fontSize: '11px', fontWeight: '500' }}>
                  {Math.abs(ticker.changePercent).toFixed(2)}%
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{
        fontSize: '10px',
        color: currentTheme.textSecondary,
        textAlign: 'center',
        paddingTop: '8px',
        borderTop: `1px solid ${currentTheme.border}`
      }}>
        Updates every {refreshInterval / 1000}s
      </div>
    </div>
  )
}