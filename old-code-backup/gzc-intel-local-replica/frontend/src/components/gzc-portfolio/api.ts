// Mock API Service for GZC Portfolio
import { FXForwardTrade, FXPosition, PositionsSummary, TradesSummary } from './types';

// Currency pairs for FX trading
const CURRENCY_PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD',
  'USD/CAD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY'
];

const COUNTERPARTIES = [
  'Goldman Sachs', 'JP Morgan', 'Morgan Stanley', 'Barclays',
  'Deutsche Bank', 'UBS', 'Credit Suisse', 'HSBC', 'Citi'
];

const TRADERS = ['John Smith', 'Sarah Johnson', 'Mike Chen', 'Emma Wilson', 'David Brown'];

// Generate mock FX Forward Trade
function generateMockTrade(index: number, fundId: string, isActive: boolean): FXForwardTrade {
  const currencyPair = CURRENCY_PAIRS[Math.floor(Math.random() * CURRENCY_PAIRS.length)];
  const notional = Math.floor(Math.random() * 10000000) + 1000000; // 1M to 11M
  const rate = currencyPair.includes('JPY') 
    ? 100 + Math.random() * 20 // JPY pairs
    : 0.8 + Math.random() * 0.4; // Other pairs
  const marketRate = rate + (Math.random() - 0.5) * 0.01;
  const pnl = (marketRate - rate) * notional * (Math.random() > 0.5 ? 1 : -1);
  
  const tradeDate = new Date();
  tradeDate.setDate(tradeDate.getDate() - Math.floor(Math.random() * 90)); // Up to 90 days ago
  
  const valueDate = new Date(tradeDate);
  valueDate.setDate(valueDate.getDate() + 2); // T+2 settlement
  
  return {
    id: `FXT${fundId}${index.toString().padStart(6, '0')}`,
    trade_date: tradeDate.toISOString().split('T')[0],
    value_date: valueDate.toISOString().split('T')[0],
    currency_pair: currencyPair,
    notional,
    rate,
    market_rate: marketRate,
    pnl,
    counterparty: COUNTERPARTIES[Math.floor(Math.random() * COUNTERPARTIES.length)],
    status: isActive ? 'ACTIVE' : 'CLOSED',
    trader: TRADERS[Math.floor(Math.random() * TRADERS.length)],
    fund_id: fundId
  };
}

// Generate mock FX Position
function generateMockPosition(currencyPair: string, trades: FXForwardTrade[]): FXPosition {
  const pairTrades = trades.filter(t => t.currency_pair === currencyPair);
  const netPosition = pairTrades.reduce((sum, t) => sum + t.notional, 0);
  const totalVolume = pairTrades.reduce((sum, t) => sum + Math.abs(t.notional), 0);
  const weightedAvgRate = pairTrades.length > 0
    ? pairTrades.reduce((sum, t) => sum + t.rate * t.notional, 0) / netPosition
    : 0;
  
  const lastTrade = pairTrades.sort((a, b) => 
    new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime()
  )[0];
  
  return {
    currency_pair: currencyPair,
    net_position: netPosition,
    trade_count: pairTrades.length,
    weighted_avg_rate: weightedAvgRate,
    total_volume: totalVolume,
    last_trade_date: lastTrade?.trade_date || new Date().toISOString().split('T')[0],
    position_status: netPosition > 0 ? 'LONG' : netPosition < 0 ? 'SHORT' : 'FLAT'
  };
}

export class PortfolioAPIService {
  private trades: FXForwardTrade[] = [];
  private initialized = false;
  
  constructor() {
    this.initializeMockData();
  }
  
  private initializeMockData() {
    if (this.initialized) return;
    
    // Generate trades for different funds
    let tradeIndex = 1;
    
    // GCF trades (fund_id = 6)
    for (let i = 0; i < 50; i++) {
      this.trades.push(generateMockTrade(tradeIndex++, '6', true));
    }
    for (let i = 0; i < 30; i++) {
      this.trades.push(generateMockTrade(tradeIndex++, '6', false));
    }
    
    // GMF trades (fund_id = 1)
    for (let i = 0; i < 40; i++) {
      this.trades.push(generateMockTrade(tradeIndex++, '1', true));
    }
    for (let i = 0; i < 20; i++) {
      this.trades.push(generateMockTrade(tradeIndex++, '1', false));
    }
    
    this.initialized = true;
  }
  
  async fetchTrades(fundId?: string, activeStatus?: string): Promise<{
    trades: FXForwardTrade[];
    summary: TradesSummary;
  }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
    
    let filteredTrades = [...this.trades];
    
    // Apply fund filter
    if (fundId && fundId !== 'all') {
      filteredTrades = filteredTrades.filter(t => t.fund_id === fundId);
    }
    
    // Apply status filter
    if (activeStatus) {
      const isActive = activeStatus === 'active';
      filteredTrades = filteredTrades.filter(t => 
        isActive ? t.status === 'ACTIVE' : t.status === 'CLOSED'
      );
    }
    
    // Calculate summary
    const summary: TradesSummary = {
      total_trades: filteredTrades.length,
      total_notional: filteredTrades.reduce((sum, t) => sum + t.notional, 0),
      total_pnl: filteredTrades.reduce((sum, t) => sum + t.pnl, 0),
      profitable_trades: filteredTrades.filter(t => t.pnl > 0).length,
      losing_trades: filteredTrades.filter(t => t.pnl < 0).length
    };
    
    return { trades: filteredTrades, summary };
  }
  
  async fetchPositions(fundId?: string, activeStatus?: string): Promise<{
    positions: FXPosition[];
    summary: PositionsSummary;
  }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
    
    // First get the trades
    const { trades } = await this.fetchTrades(fundId, activeStatus);
    
    // Group by currency pair and create positions
    const positionsMap = new Map<string, FXPosition>();
    
    CURRENCY_PAIRS.forEach(pair => {
      const pairTrades = trades.filter(t => t.currency_pair === pair);
      if (pairTrades.length > 0) {
        positionsMap.set(pair, generateMockPosition(pair, pairTrades));
      }
    });
    
    const positions = Array.from(positionsMap.values());
    
    // Calculate summary
    const summary: PositionsSummary = {
      total_positions: positions.length,
      long_positions: positions.filter(p => p.position_status === 'LONG').length,
      short_positions: positions.filter(p => p.position_status === 'SHORT').length,
      total_volume: positions.reduce((sum, p) => sum + p.total_volume, 0),
      unique_pairs: positions.length
    };
    
    return { positions, summary };
  }
  
  // Simulate real-time updates
  async subscribeToUpdates(callback: (trade: FXForwardTrade) => void): Promise<() => void> {
    const interval = setInterval(() => {
      // Randomly update an existing trade or create a new one
      if (Math.random() > 0.7 && this.trades.length > 0) {
        // Update existing trade
        const index = Math.floor(Math.random() * this.trades.length);
        const trade = this.trades[index];
        trade.market_rate = trade.rate + (Math.random() - 0.5) * 0.01;
        trade.pnl = (trade.market_rate - trade.rate) * trade.notional;
        callback(trade);
      } else {
        // Create new trade
        const newTrade = generateMockTrade(
          this.trades.length + 1, 
          Math.random() > 0.5 ? '6' : '1',
          true
        );
        this.trades.push(newTrade);
        callback(newTrade);
      }
    }, 3000 + Math.random() * 2000); // Every 3-5 seconds
    
    // Return unsubscribe function
    return () => clearInterval(interval);
  }
}

// Export singleton instance
export const portfolioAPI = new PortfolioAPIService();