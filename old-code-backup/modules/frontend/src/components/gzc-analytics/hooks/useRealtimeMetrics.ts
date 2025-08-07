import { useState, useEffect } from 'react';
import { RealtimeMetrics } from '../types';

export const useRealtimeMetrics = (symbol: string) => {
  const [metrics, setMetrics] = useState<RealtimeMetrics>({
    price: symbol.includes('EUR') ? 1.0852 : 1.2654,
    volume: 2453000,
    high: symbol.includes('EUR') ? 1.0875 : 1.2680,
    low: symbol.includes('EUR') ? 1.0823 : 1.2620,
    vwap: symbol.includes('EUR') ? 1.0845 : 1.2648
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => {
        const priceChange = (Math.random() - 0.5) * 0.0005;
        const newPrice = prev.price + priceChange;
        return {
          price: newPrice,
          volume: prev.volume + Math.floor(Math.random() * 10000),
          high: Math.max(prev.high, newPrice),
          low: Math.min(prev.low, newPrice),
          vwap: prev.vwap + (Math.random() - 0.5) * 0.0001
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [symbol]);

  return metrics;
};