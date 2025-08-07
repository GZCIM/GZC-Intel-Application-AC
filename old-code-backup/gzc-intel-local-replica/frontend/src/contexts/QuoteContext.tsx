import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { Quote, QuoteMessage } from '../types/portfolio'

interface QuoteContextType {
  quotes: Map<string, Quote>
  subscribeToSymbol: (symbol: string) => void
  unsubscribeFromSymbol: (symbol: string) => void
  updateQuote: (quote: Quote) => void
  getQuote: (symbol: string) => Quote | undefined
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  reconnect: () => void
}

const QuoteContext = createContext<QuoteContextType | null>(null)

export const useQuoteContext = () => {
  const context = useContext(QuoteContext)
  if (!context) {
    throw new Error('useQuoteContext must be used within a QuoteProvider')
  }
  return context
}

interface QuoteProviderProps {
  children: React.ReactNode
  wsUrl?: string
  autoConnect?: boolean
  reconnectInterval?: number
  mockMode?: boolean
}

export const QuoteProvider: React.FC<QuoteProviderProps> = ({
  children,
  wsUrl = 'ws://localhost:8080/quotes',
  autoConnect = true,
  reconnectInterval = 5000,
  mockMode = false
}) => {
  const [quotes, setQuotes] = useState<Map<string, Quote>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  
  const wsRef = useRef<WebSocket | null>(null)
  const subscribedSymbols = useRef<Set<string>>(new Set())
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const mockIntervalRef = useRef<NodeJS.Timeout>()

  // Mock data generator for development
  const generateMockQuote = useCallback((symbol: string): Quote => {
    const basePrice = Math.random() * 1000 + 100
    const spread = basePrice * 0.001
    const change = (Math.random() - 0.5) * 10
    
    return {
      symbol,
      bid: basePrice - spread / 2,
      ask: basePrice + spread / 2,
      last: basePrice,
      volume: Math.floor(Math.random() * 1000000),
      timestamp: Date.now(),
      change,
      changePercent: (change / basePrice) * 100,
      open: basePrice - change,
      high: basePrice + Math.abs(change) * 1.5,
      low: basePrice - Math.abs(change) * 1.5,
      close: basePrice
    }
  }, [])

  // Start mock data updates
  const startMockUpdates = useCallback(() => {
    if (mockIntervalRef.current) clearInterval(mockIntervalRef.current)
    
    mockIntervalRef.current = setInterval(() => {
      subscribedSymbols.current.forEach(symbol => {
        const quote = generateMockQuote(symbol)
        updateQuote(quote)
      })
    }, 1000)
  }, [generateMockQuote])

  // WebSocket connection management
  const connect = useCallback(() => {
    if (mockMode) {
      setIsConnected(true)
      setConnectionStatus('connected')
      startMockUpdates()
      return
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) return
    
    setConnectionStatus('connecting')
    
    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('Quote WebSocket connected')
        setIsConnected(true)
        setConnectionStatus('connected')
        
        // Re-subscribe to all symbols
        subscribedSymbols.current.forEach(symbol => {
          ws.send(JSON.stringify({ type: 'subscribe', symbol }))
        })
      }

      ws.onmessage = (event) => {
        try {
          const message: QuoteMessage = JSON.parse(event.data)
          if (message.type === 'quote' && message.data) {
            updateQuote(message.data)
          }
        } catch (error) {
          console.error('Failed to parse quote message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('Quote WebSocket error:', error)
        setConnectionStatus('error')
      }

      ws.onclose = () => {
        console.log('Quote WebSocket disconnected')
        setIsConnected(false)
        setConnectionStatus('disconnected')
        wsRef.current = null
        
        // Auto-reconnect
        if (autoConnect) {
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval)
        }
      }
    } catch (error) {
      console.error('Failed to connect to quote service:', error)
      setConnectionStatus('error')
    }
  }, [wsUrl, autoConnect, reconnectInterval, mockMode, startMockUpdates])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setConnectionStatus('disconnected')
  }, [])

  const updateQuote = useCallback((quote: Quote) => {
    setQuotes(prev => {
      const newQuotes = new Map(prev)
      newQuotes.set(quote.symbol, quote)
      return newQuotes
    })
  }, [])

  const subscribeToSymbol = useCallback((symbol: string) => {
    if (subscribedSymbols.current.has(symbol)) return
    
    subscribedSymbols.current.add(symbol)
    
    if (mockMode) {
      // Generate initial mock quote
      const quote = generateMockQuote(symbol)
      updateQuote(quote)
    } else if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', symbol }))
    }
  }, [mockMode, generateMockQuote, updateQuote])

  const unsubscribeFromSymbol = useCallback((symbol: string) => {
    subscribedSymbols.current.delete(symbol)
    
    if (!mockMode && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', symbol }))
    }
  }, [mockMode])

  const getQuote = useCallback((symbol: string) => {
    return quotes.get(symbol)
  }, [quotes])

  const reconnect = useCallback(() => {
    disconnect()
    connect()
  }, [disconnect, connect])

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect()
    }
    
    return () => {
      disconnect()
    }
  }, [autoConnect, connect, disconnect])

  const value: QuoteContextType = {
    quotes,
    subscribeToSymbol,
    unsubscribeFromSymbol,
    updateQuote,
    getQuote,
    isConnected,
    connectionStatus,
    reconnect
  }

  return (
    <QuoteContext.Provider value={value}>
      {children}
    </QuoteContext.Provider>
  )
}

// Hook for subscribing to specific symbols
export const useQuote = (symbol: string | string[]) => {
  const { quotes, subscribeToSymbol, unsubscribeFromSymbol, getQuote } = useQuoteContext()
  const symbols = Array.isArray(symbol) ? symbol : [symbol]
  
  useEffect(() => {
    symbols.forEach(s => subscribeToSymbol(s))
    
    return () => {
      symbols.forEach(s => unsubscribeFromSymbol(s))
    }
  }, [symbols.join(','), subscribeToSymbol, unsubscribeFromSymbol])
  
  if (Array.isArray(symbol)) {
    return symbols.map(s => getQuote(s)).filter(Boolean) as Quote[]
  }
  
  return getQuote(symbol)
}