// Types for GZC Portfolio Component

export interface FXForwardTrade {
  id: string;
  trade_date: string;
  value_date: string;
  currency_pair: string;
  notional: number;
  rate: number;
  market_rate: number;
  pnl: number;
  counterparty: string;
  status: string;
  trader: string;
  fund_id?: string;
}

export interface FXPosition {
  currency_pair: string;
  net_position: number;
  trade_count: number;
  weighted_avg_rate: number;
  total_volume: number;
  last_trade_date: string;
  position_status: 'LONG' | 'SHORT' | 'FLAT';
}

export interface PositionsSummary {
  total_positions: number;
  long_positions: number;
  short_positions: number;
  total_volume: number;
  unique_pairs: number;
}

export interface TradesSummary {
  total_trades: number;
  total_notional: number;
  total_pnl: number;
  profitable_trades: number;
  losing_trades: number;
}

export type ViewMode = 'trades' | 'positions';
export type FundType = '6' | '1' | 'all'; // 6=GCF, 1=GMF, all=All Funds
export type ActiveStatus = 'active' | 'inactive';