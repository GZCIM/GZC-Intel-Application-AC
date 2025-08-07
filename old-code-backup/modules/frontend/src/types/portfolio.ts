// Portfolio Types - Matching Port 3000 functionality

export interface PortfolioPosition {
  symbol: string
  quantity: number
  averagePrice: number
  currentPrice: number
  marketValue: number
  unrealizedPnL: number
  realizedPnL: number
  totalPnL: number
  pnlPercent: number
  weight: number
  side: 'LONG' | 'SHORT'
  assetClass: 'EQUITY' | 'BOND' | 'FX' | 'COMMODITY' | 'CRYPTO'
  currency: string
  lastUpdate: string
}

export interface PortfolioMetrics {
  totalValue: number
  cash: number
  marketValue: number
  dayPnL: number
  dayPnLPercent: number
  totalPnL: number
  totalPnLPercent: number
  realizedPnL: number
  unrealizedPnL: number
  netExposure: number
  grossExposure: number
  longExposure: number
  shortExposure: number
  leverage: number
  sharpeRatio: number
  volatility: number
  beta: number
  alpha: number
  maxDrawdown: number
  winRate: number
}

export interface Trade {
  id: string
  timestamp: string
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  value: number
  commission: number
  pnl?: number
  account: string
  venue: string
  orderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT'
  status: 'PENDING' | 'FILLED' | 'PARTIAL' | 'CANCELLED' | 'REJECTED'
}

export interface Quote {
  symbol: string
  bid: number
  ask: number
  last: number
  volume: number
  timestamp: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  close: number
}

export interface QuoteMessage {
  type: 'quote' | 'trade' | 'depth'
  data: Quote
}

export interface PortfolioFilter {
  search?: string
  assetClass?: string[]
  side?: 'LONG' | 'SHORT' | 'ALL'
  minValue?: number
  maxValue?: number
  profitable?: boolean
}

export interface RiskMetrics {
  var95: number
  var99: number
  cvar95: number
  cvar99: number
  stressTest: {
    scenario: string
    impact: number
    impactPercent: number
  }[]
}

export interface PerformanceAttribution {
  byAssetClass: Record<string, number>
  bySector: Record<string, number>
  byPosition: Record<string, number>
  byFactor: {
    market: number
    sector: number
    stock: number
    currency: number
    other: number
  }
}

export interface HistoricalData {
  date: string
  value: number
  pnl: number
  return: number
  benchmark: number
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL'

export interface PortfolioSnapshot {
  timestamp: string
  positions: PortfolioPosition[]
  metrics: PortfolioMetrics
  risk: RiskMetrics
  attribution: PerformanceAttribution
}