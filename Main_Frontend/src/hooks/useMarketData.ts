import { useState, useEffect, useCallback } from 'react';
import { marketService, websocketService } from '../services/api';

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

interface UseMarketDataOptions {
  symbols: string[];
  realtime?: boolean;
  interval?: number;
}

export const useMarketData = ({ symbols, realtime = true, interval = 30000 }: UseMarketDataOptions) => {
  const [data, setData] = useState<Record<string, MarketData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial market data
  const fetchMarketData = useCallback(async () => {
    try {
      const response = await marketService.getQuotes(symbols);
      const marketData = response.data.reduce((acc: Record<string, MarketData>, item: MarketData) => {
        acc[item.symbol] = item;
        return acc;
      }, {});
      setData(marketData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch market data');
      console.error('Market data error:', err);
    } finally {
      setLoading(false);
    }
  }, [symbols]);

  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    if (!realtime) return;

    const socket = websocketService.connect();

    // Subscribe to real-time updates
    websocketService.emit('subscribe', { symbols });

    // Handle real-time market updates
    websocketService.on('market-update', (update: MarketData) => {
      setData(prev => ({
        ...prev,
        [update.symbol]: update
      }));
    });

    // Handle connection errors
    websocketService.on('market-error', (error: any) => {
      console.error('Market WebSocket error:', error);
      setError('Real-time connection error');
    });

    return () => {
      websocketService.emit('unsubscribe', { symbols });
      websocketService.off('market-update');
      websocketService.off('market-error');
    };
  }, [symbols, realtime]);

  // Initial fetch
  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  // Periodic refresh (backup for WebSocket)
  useEffect(() => {
    if (!interval) return;

    const timer = setInterval(fetchMarketData, interval);
    return () => clearInterval(timer);
  }, [fetchMarketData, interval]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchMarketData();
  }, [fetchMarketData]);

  return {
    data,
    loading,
    error,
    refresh
  };
};