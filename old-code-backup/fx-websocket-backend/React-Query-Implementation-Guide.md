# 🚀 React Query (TanStack Query) Implementation Guide for FXSpotStream

## 📋 Executive Summary

This document provides a comprehensive guide for migrating FXSpotStream from Context API to React Query (TanStack Query) for superior real-time data management, performance optimization, and developer experience.

## 🎯 Why React Query for FXSpotStream?

### Current Issues with Context API
- **Manual cache management** - Implementing cache logic manually
- **No automatic background refetching** - Stale data remains stale
- **Performance bottlenecks** - Every quote update re-renders entire tree
- **Complex state synchronization** - Manual WebSocket state management
- **No error boundaries** - Limited error handling capabilities

### React Query Benefits for Trading Applications
- **Automatic caching** with intelligent invalidation
- **Background refetching** ensures data freshness
- **Optimistic updates** for instant UI feedback
- **Built-in error handling** and retry logic
- **WebSocket integration** patterns for real-time data
- **Performance optimizations** with selective subscriptions

---

## 🏗️ Architecture Overview

### Recommended Stack Upgrade
```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.8.0",
    "@tanstack/react-query-devtools": "^5.8.0",
    "zustand": "^4.4.6",
    "react-use-websocket": "^4.5.0"
  }
}
```

### New Architecture Pattern
```
fx-client/src/
├── features/           # Feature-based organization
│   ├── quotes/
│   │   ├── hooks/      # React Query hooks
│   │   ├── services/   # API services
│   │   ├── components/ # UI components
│   │   └── stores/     # Zustand stores for UI state
│   ├── trading/
│   └── portfolio/
├── shared/
│   ├── hooks/          # Shared React Query hooks
│   ├── services/       # Shared API services
│   └── utils/
└── providers/          # Query client setup
```

---

## 🔧 Implementation Guide

### 1. Query Client Setup

```typescript
// src/providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error.status >= 400 && error.status < 500) return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### 2. WebSocket + React Query Integration

```typescript
// src/features/quotes/hooks/useQuoteStream.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useWebSocket from 'react-use-websocket';
import { ESPQuote, RFSQuote } from '../types';

export const useQuoteStream = (symbol: string, type: 'ESP' | 'RFS') => {
  const queryClient = useQueryClient();

  const socketUrl = type === 'ESP'
    ? `ws://localhost:5000/ws_esp`
    : `ws://localhost:5000/ws_rfs`;

  const { lastMessage, connectionStatus } = useWebSocket(socketUrl, {
    shouldReconnect: () => true,
    onMessage: (event) => {
      try {
        const quote = JSON.parse(event.data);

        // Update specific quote in cache
        queryClient.setQueryData(
          ['quotes', symbol, type],
          (oldData: any) => {
            if (!oldData) return [quote];
            return [quote, ...oldData.slice(0, 9)]; // Keep last 10
          }
        );

        // Invalidate related queries
        queryClient.invalidateQueries({
          queryKey: ['quote-summary', symbol]
        });

      } catch (error) {
        console.error('Failed to parse quote:', error);
      }
    },
  });

  return {
    connectionStatus,
    isConnected: connectionStatus === 'Open',
  };
};
```

### 3. Quote Data Hooks

```typescript
// src/features/quotes/hooks/useQuotes.ts
import { useQuery } from '@tanstack/react-query';
import { ESPQuote, RFSQuote } from '../types';

// Get cached quotes for a symbol
export const useQuotes = (symbol: string, type: 'ESP' | 'RFS') => {
  return useQuery({
    queryKey: ['quotes', symbol, type],
    queryFn: () => {
      // This will return cached data from WebSocket updates
      // or empty array if no data yet
      return [];
    },
    staleTime: Infinity, // Data comes from WebSocket, never stale
    initialData: [],
  });
};

// Get latest quote for a symbol
export const useLatestQuote = (symbol: string, type: 'ESP' | 'RFS') => {
  return useQuery({
    queryKey: ['latest-quote', symbol, type],
    queryFn: async () => {
      const response = await fetch(`/api/quote/latest/${symbol}/${type}`);
      if (!response.ok) throw new Error('Failed to fetch latest quote');
      return response.json();
    },
    select: (data: any[]) => data[0], // Get first quote
  });
};

// Get quote statistics
export const useQuoteStats = (symbol: string) => {
  return useQuery({
    queryKey: ['quote-stats', symbol],
    queryFn: async () => {
      const response = await fetch(`/api/quote/stats/${symbol}`);
      if (!response.ok) throw new Error('Failed to fetch quote stats');
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
  });
};
```

### 4. Trading Mutations

```typescript
// src/features/trading/hooks/useTrading.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useExecuteTrade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tradeRequest: TradeRequest) => {
      const response = await fetch('/api/trade/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeRequest),
      });

      if (!response.ok) throw new Error('Trade execution failed');
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Optimistically update trade history
      queryClient.setQueryData(
        ['trades', variables.symbol],
        (oldTrades: any[]) => [data, ...oldTrades]
      );

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
    onError: (error, variables) => {
      // Revert optimistic updates if needed
      queryClient.invalidateQueries({
        queryKey: ['trades', variables.symbol]
      });
    },
  });
};
```

### 5. Enhanced Component Usage

```typescript
// src/features/quotes/components/QuoteDisplay.tsx
import React from 'react';
import { useQuotes, useLatestQuote, useQuoteStream } from '../hooks';

interface QuoteDisplayProps {
  symbol: string;
  type: 'ESP' | 'RFS';
}

export const QuoteDisplay: React.FC<QuoteDisplayProps> = ({ symbol, type }) => {
  // Start WebSocket connection
  const { isConnected } = useQuoteStream(symbol, type);

  // Get cached quotes
  const { data: quotes, isLoading } = useQuotes(symbol, type);

  // Get latest quote with fallback
  const { data: latestQuote, error } = useLatestQuote(symbol, type);

  if (isLoading) return <div>Loading quotes...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="quote-display">
      <div className="connection-status">
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      <div className="latest-quote">
        <h3>{symbol} - {type}</h3>
        {latestQuote && (
          <div>
            <span>Price: {latestQuote.price}</span>
            <span>Time: {new Date(latestQuote.time_stamp).toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      <div className="quote-history">
        <h4>Recent Quotes</h4>
        {quotes.map((quote: any, index: number) => (
          <div key={index} className="quote-item">
            {quote.price} @ {new Date(quote.time_stamp).toLocaleTimeString()}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 6. Performance Optimizations

```typescript
// src/features/quotes/hooks/useOptimizedQuotes.ts
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export const useOptimizedQuotes = (symbol: string) => {
  const { data: quotes } = useQuotes(symbol, 'ESP');

  // Memoized calculations
  const quoteMetrics = useMemo(() => {
    if (!quotes?.length) return null;

    const prices = quotes.map(q => parseFloat(q.price));
    return {
      latest: prices[0],
      high: Math.max(...prices),
      low: Math.min(...prices),
      average: prices.reduce((a, b) => a + b, 0) / prices.length,
      change: prices[0] - prices[prices.length - 1],
    };
  }, [quotes]);

  return { quotes, metrics: quoteMetrics };
};

// Selective subscription to avoid unnecessary re-renders
export const useQuotePrice = (symbol: string) => {
  return useQuery({
    queryKey: ['quotes', symbol, 'ESP'],
    queryFn: () => [],
    select: (data: any[]) => data[0]?.price, // Only subscribe to price changes
    staleTime: Infinity,
  });
};
```

---

## 🎯 Migration Strategy

### Phase 1: Setup & Basic Integration (Week 1)
1. Install React Query dependencies
2. Setup QueryClient and Provider
3. Create basic quote hooks
4. Migrate one component as proof of concept

### Phase 2: WebSocket Integration (Week 2)
1. Implement WebSocket + React Query pattern
2. Replace Context API in quote components
3. Add error handling and reconnection logic
4. Performance testing

### Phase 3: Advanced Features (Week 3)
1. Add trading mutations
2. Implement optimistic updates
3. Add background refetching for historical data
4. Setup prefetching strategies

### Phase 4: Optimization & Polish (Week 4)
1. Performance optimizations
2. Add React Query DevTools
3. Error boundary implementation
4. Documentation and team training

---

## 📊 Expected Performance Improvements

| Metric | Current (Context API) | With React Query | Improvement |
|--------|----------------------|------------------|-------------|
| **Re-renders per quote update** | 5-10 components | 1-2 components | 80% reduction |
| **Memory usage** | Growing with time | Managed by GC | Auto-optimized |
| **Error handling** | Manual try/catch | Built-in retry | Robust |
| **Developer experience** | Complex state logic | Declarative hooks | Simplified |
| **Cache invalidation** | Manual tracking | Automatic | Intelligent |

---

## 🛠️ Best Practices for FX Trading

### 1. Real-time Data Management
```typescript
// Efficient WebSocket data handling
const useRealtimeQuotes = (symbols: string[]) => {
  const queryClient = useQueryClient();

  useWebSocket('ws://localhost:5000/ws/multi', {
    onMessage: (event) => {
      const updates = JSON.parse(event.data);

      // Batch updates for better performance
      queryClient.setQueriesData(
        { queryKey: ['quotes'] },
        (oldData, query) => {
          const [, symbol] = query.queryKey;
          const update = updates.find(u => u.symbol === symbol);
          if (update) {
            return [update, ...(oldData || []).slice(0, 9)];
          }
          return oldData;
        }
      );
    },
  });
};
```

### 2. Error Handling for Financial Data
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error.status === 401) return false;

        // Exponential backoff for market data
        if (failureCount < 3) {
          setTimeout(() => {}, Math.pow(2, failureCount) * 1000);
          return true;
        }
        return false;
      },
    },
  },
});
```

### 3. Optimistic Updates for Trading
```typescript
const useOptimisticTrade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: executeTrade,
    onMutate: async (newTrade) => {
      await queryClient.cancelQueries({ queryKey: ['positions'] });

      const previousPositions = queryClient.getQueryData(['positions']);

      queryClient.setQueryData(['positions'], old =>
        updatePositionsOptimistically(old, newTrade)
      );

      return { previousPositions };
    },
    onError: (err, newTrade, context) => {
      queryClient.setQueryData(['positions'], context.previousPositions);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
};
```

---

## 🔍 Testing Strategy

### 1. Query Hook Testing
```typescript
// src/features/quotes/hooks/__tests__/useQuotes.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useQuotes } from '../useQuotes';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

test('should fetch quotes for symbol', async () => {
  const { result } = renderHook(
    () => useQuotes('EUR/USD', 'ESP'),
    { wrapper: createWrapper() }
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(expect.arrayContaining([]));
});
```

### 2. WebSocket Integration Testing
```typescript
// Mock WebSocket for testing
jest.mock('react-use-websocket', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    lastMessage: { data: JSON.stringify({ symbol: 'EUR/USD', price: '1.0500' }) },
    connectionStatus: 'Open',
  })),
}));
```

---

## 📚 Additional Resources

### Documentation Links
- [TanStack Query Official Docs](https://tanstack.com/query/latest)
- [React Query + WebSocket Patterns](https://github.com/tanstack/query)
- [Real-time Trading Implementation Examples](https://dev.to/abhivyaktii/building-real-time-dashboards-with-websockets-a-crypto-live-trades-example-5840)

### Tools & DevTools
- React Query DevTools for debugging
- Network tab monitoring for API calls
- Performance profiler for re-render analysis

---

## 🎯 Conclusion

Migrating from Context API to React Query will provide FXSpotStream with:

1. **Superior Performance** - Intelligent caching and selective updates
2. **Better Developer Experience** - Declarative data fetching patterns
3. **Robust Error Handling** - Built-in retry and error boundaries
4. **Scalable Architecture** - Handles complex real-time data flows
5. **Future-Proof Foundation** - Industry standard for React applications

The migration can be done incrementally, starting with the most critical components and gradually replacing the Context API implementation across the entire application.

---

*This implementation guide provides a solid foundation for modernizing FXSpotStream's data management layer using React Query best practices tailored for financial trading applications.*
