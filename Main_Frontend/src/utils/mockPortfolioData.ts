import { PortfolioPosition, PortfolioMetrics, PortfolioSnapshot } from '../types/portfolio'

// Mock symbols with their asset classes
const MOCK_SYMBOLS = [
  { symbol: 'AAPL', assetClass: 'EQUITY', currency: 'USD' },
  { symbol: 'TSLA', assetClass: 'EQUITY', currency: 'USD' },
  { symbol: 'MSFT', assetClass: 'EQUITY', currency: 'USD' },
  { symbol: 'GOOGL', assetClass: 'EQUITY', currency: 'USD' },
  { symbol: 'AMZN', assetClass: 'EQUITY', currency: 'USD' },
  { symbol: 'NVDA', assetClass: 'EQUITY', currency: 'USD' },
  { symbol: 'META', assetClass: 'EQUITY', currency: 'USD' },
  { symbol: 'NFLX', assetClass: 'EQUITY', currency: 'USD' },
  { symbol: 'EURUSD', assetClass: 'FX', currency: 'USD' },
  { symbol: 'GBPUSD', assetClass: 'FX', currency: 'USD' },
  { symbol: 'USDJPY', assetClass: 'FX', currency: 'USD' },
  { symbol: 'GOLD', assetClass: 'COMMODITY', currency: 'USD' },
  { symbol: 'SILVER', assetClass: 'COMMODITY', currency: 'USD' },
  { symbol: 'OIL', assetClass: 'COMMODITY', currency: 'USD' },
  { symbol: 'BTC', assetClass: 'CRYPTO', currency: 'USD' },
  { symbol: 'ETH', assetClass: 'CRYPTO', currency: 'USD' },
  { symbol: 'US10Y', assetClass: 'BOND', currency: 'USD' },
  { symbol: 'US30Y', assetClass: 'BOND', currency: 'USD' },
  { symbol: 'SPY', assetClass: 'EQUITY', currency: 'USD' },
  { symbol: 'QQQ', assetClass: 'EQUITY', currency: 'USD' }
]

// Generate random position
function generateRandomPosition(userId: string): PortfolioPosition {
  const symbolData = MOCK_SYMBOLS[Math.floor(Math.random() * MOCK_SYMBOLS.length)]
  const side = Math.random() > 0.7 ? 'SHORT' : 'LONG'
  const quantity = Math.floor(Math.random() * 10000) + 100
  const averagePrice = Math.random() * 500 + 50
  const priceChange = (Math.random() - 0.5) * 0.1 // -5% to +5%
  const currentPrice = averagePrice * (1 + priceChange)
  
  const marketValue = quantity * currentPrice * (side === 'SHORT' ? -1 : 1)
  const costBasis = quantity * averagePrice
  const unrealizedPnL = (currentPrice - averagePrice) * quantity * (side === 'SHORT' ? -1 : 1)
  const realizedPnL = (Math.random() - 0.5) * 5000 // Random realized P&L
  const totalPnL = unrealizedPnL + realizedPnL
  const pnlPercent = (totalPnL / Math.abs(costBasis)) * 100
  
  return {
    symbol: symbolData.symbol,
    quantity: side === 'SHORT' ? -quantity : quantity,
    averagePrice,
    currentPrice,
    marketValue,
    unrealizedPnL,
    realizedPnL,
    totalPnL,
    pnlPercent,
    weight: 0, // Will be calculated later
    side,
    assetClass: symbolData.assetClass,
    currency: symbolData.currency,
    lastUpdate: new Date().toISOString()
  }
}

// Calculate portfolio metrics from positions
function calculateMetrics(positions: PortfolioPosition[]): PortfolioMetrics {
  const totalMarketValue = positions.reduce((sum, pos) => sum + Math.abs(pos.marketValue), 0)
  const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0)
  const totalRealizedPnL = positions.reduce((sum, pos) => sum + pos.realizedPnL, 0)
  const totalPnL = totalUnrealizedPnL + totalRealizedPnL
  const longExposure = positions
    .filter(pos => pos.side === 'LONG')
    .reduce((sum, pos) => sum + pos.marketValue, 0)
  const shortExposure = Math.abs(positions
    .filter(pos => pos.side === 'SHORT')
    .reduce((sum, pos) => sum + pos.marketValue, 0))
  
  const cash = 100000 + totalRealizedPnL // Starting cash plus realized gains
  const totalValue = cash + totalMarketValue
  const netExposure = longExposure - shortExposure
  const grossExposure = longExposure + shortExposure
  const leverage = grossExposure / totalValue
  
  // Mock additional metrics
  const sharpeRatio = 1.2 + Math.random() * 0.8
  const volatility = 0.15 + Math.random() * 0.1
  const beta = 0.8 + Math.random() * 0.4
  const alpha = (Math.random() - 0.5) * 0.1
  const maxDrawdown = -0.05 - Math.random() * 0.1
  const winRate = 0.55 + Math.random() * 0.2
  
  return {
    totalValue,
    cash,
    marketValue: totalMarketValue,
    dayPnL: totalPnL * 0.3, // Assume 30% of total P&L is today
    dayPnLPercent: (totalPnL * 0.3 / totalValue) * 100,
    totalPnL,
    totalPnLPercent: (totalPnL / totalValue) * 100,
    realizedPnL: totalRealizedPnL,
    unrealizedPnL: totalUnrealizedPnL,
    netExposure,
    grossExposure,
    longExposure,
    shortExposure,
    leverage,
    sharpeRatio,
    volatility: volatility * 100,
    beta,
    alpha: alpha * 100,
    maxDrawdown: maxDrawdown * 100,
    winRate: winRate * 100
  }
}

// Calculate position weights
function calculateWeights(positions: PortfolioPosition[], totalValue: number): PortfolioPosition[] {
  return positions.map(position => ({
    ...position,
    weight: (Math.abs(position.marketValue) / totalValue) * 100
  }))
}

// Generate mock portfolio for a user
export function generateMockPortfolio(userId: string): PortfolioSnapshot {
  const numPositions = 8 + Math.floor(Math.random() * 12) // 8-20 positions
  const positions = Array.from({ length: numPositions }, () => generateRandomPosition(userId))
  
  const metrics = calculateMetrics(positions)
  const positionsWithWeights = calculateWeights(positions, metrics.totalValue)
  
  return {
    timestamp: new Date().toISOString(),
    positions: positionsWithWeights,
    metrics,
    risk: {
      var95: -45000,
      var99: -67000,
      cvar95: -52000,
      cvar99: -78000,
      stressTest: [
        { scenario: 'Market Crash (-20%)', impact: -89000, impactPercent: -8.9 },
        { scenario: 'Interest Rate Spike', impact: -34000, impactPercent: -3.4 },
        { scenario: 'Currency Crisis', impact: -23000, impactPercent: -2.3 }
      ]
    },
    attribution: {
      byAssetClass: {
        'EQUITY': 45.2,
        'FX': 23.1,
        'COMMODITY': 15.7,
        'CRYPTO': 10.3,
        'BOND': 5.7
      },
      bySector: {
        'Technology': 35.2,
        'Financial': 20.1,
        'Energy': 15.7,
        'Healthcare': 12.3,
        'Consumer': 16.7
      },
      byPosition: positions.reduce((acc, pos) => {
        acc[pos.symbol] = pos.weight
        return acc
      }, {} as Record<string, number>),
      byFactor: {
        market: 68.5,
        sector: 15.2,
        stock: 12.8,
        currency: 2.1,
        other: 1.4
      }
    }
  }
}

// Update positions with new quote data
export function updatePositionWithQuote(
  position: PortfolioPosition, 
  newPrice: number
): PortfolioPosition {
  const marketValue = position.quantity * newPrice
  const costBasis = position.quantity * position.averagePrice
  const unrealizedPnL = (newPrice - position.averagePrice) * position.quantity
  const totalPnL = position.realizedPnL + unrealizedPnL
  const pnlPercent = (totalPnL / Math.abs(costBasis)) * 100

  return {
    ...position,
    currentPrice: newPrice,
    marketValue,
    unrealizedPnL,
    totalPnL,
    pnlPercent,
    lastUpdate: new Date().toISOString()
  }
}