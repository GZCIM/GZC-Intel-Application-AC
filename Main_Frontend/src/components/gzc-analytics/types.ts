// Types for GZC Analytics Components

export interface MarketMetric {
  label: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface OrderBookEntry {
  price: string;
  bidSize: number;
  askSize: number;
  spread: string;
}

export interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  timestamp: number;
}

export interface CorrelationData {
  pair1: string;
  pair2: string;
  correlation: number;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  target: number;
  unit: string;
}

export interface FilterState {
  timeRange: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL';
  symbols: string[];
  marketType: 'FX' | 'EQUITY' | 'CRYPTO' | 'ALL';
  region: 'US' | 'EU' | 'ASIA' | 'ALL';
}

export interface RealtimeMetrics {
  price: number;
  volume: number;
  high: number;
  low: number;
  vwap: number;
}