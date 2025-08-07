import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { quantumTheme } from '../../theme/quantum'
import { FeatherIcon } from '../../components/icons/FeatherIcon'

// Order Entry Component
const OrderEntry: React.FC = () => {
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [symbol, setSymbol] = useState('EUR/USD')
  const [quantity, setQuantity] = useState('100000')
  const [price, setPrice] = useState('1.0852')

  return (
    <div style={{ padding: '16px' }}>
      <h4 style={{ fontSize: '14px', fontWeight: '600', color: quantumTheme.text, marginBottom: '12px' }}>
        Order Entry
      </h4>
      
      {/* Symbol Input */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '11px', color: quantumTheme.textSecondary, display: 'block', marginBottom: '4px' }}>
          Symbol
        </label>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            background: quantumTheme.background,
            border: `1px solid ${quantumTheme.border}`,
            borderRadius: '4px',
            color: quantumTheme.text,
            fontSize: '12px'
          }}
        />
      </div>

      {/* Side Selection */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSide('buy')}
          style={{
            flex: 1,
            padding: '8px',
            background: side === 'buy' ? quantumTheme.success : 'transparent',
            border: `1px solid ${side === 'buy' ? quantumTheme.success : quantumTheme.border}`,
            borderRadius: '4px',
            color: side === 'buy' ? '#fff' : quantumTheme.text,
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          BUY
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSide('sell')}
          style={{
            flex: 1,
            padding: '8px',
            background: side === 'sell' ? quantumTheme.danger : 'transparent',
            border: `1px solid ${side === 'sell' ? quantumTheme.danger : quantumTheme.border}`,
            borderRadius: '4px',
            color: side === 'sell' ? '#fff' : quantumTheme.text,
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          SELL
        </motion.button>
      </div>

      {/* Quantity */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '11px', color: quantumTheme.textSecondary, display: 'block', marginBottom: '4px' }}>
          Quantity
        </label>
        <input
          type="text"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            background: quantumTheme.background,
            border: `1px solid ${quantumTheme.border}`,
            borderRadius: '4px',
            color: quantumTheme.text,
            fontSize: '12px'
          }}
        />
      </div>

      {/* Order Type */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setOrderType('market')}
          style={{
            flex: 1,
            padding: '6px',
            background: orderType === 'market' ? quantumTheme.primary : 'transparent',
            border: `1px solid ${orderType === 'market' ? quantumTheme.primary : quantumTheme.border}`,
            borderRadius: '4px',
            color: orderType === 'market' ? '#fff' : quantumTheme.text,
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          Market
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setOrderType('limit')}
          style={{
            flex: 1,
            padding: '6px',
            background: orderType === 'limit' ? quantumTheme.primary : 'transparent',
            border: `1px solid ${orderType === 'limit' ? quantumTheme.primary : quantumTheme.border}`,
            borderRadius: '4px',
            color: orderType === 'limit' ? '#fff' : quantumTheme.text,
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          Limit
        </motion.button>
      </div>

      {/* Price (for limit orders) */}
      {orderType === 'limit' && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', color: quantumTheme.textSecondary, display: 'block', marginBottom: '4px' }}>
            Price
          </label>
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              background: quantumTheme.background,
              border: `1px solid ${quantumTheme.border}`,
              borderRadius: '4px',
              color: quantumTheme.text,
              fontSize: '12px'
            }}
          />
        </div>
      )}

      {/* Submit Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{
          width: '100%',
          padding: '10px',
          background: side === 'buy' ? quantumTheme.success : quantumTheme.danger,
          border: 'none',
          borderRadius: '4px',
          color: '#fff',
          fontSize: '12px',
          fontWeight: '600',
          cursor: 'pointer'
        }}
      >
        Place {orderType === 'market' ? 'Market' : 'Limit'} {side === 'buy' ? 'Buy' : 'Sell'} Order
      </motion.button>
    </div>
  )
}

// Market Depth Component
const MarketDepth: React.FC = () => {
  const bids = Array.from({ length: 5 }, (_, i) => ({
    price: 1.0850 - i * 0.0001,
    size: Math.floor(Math.random() * 1000000),
    total: 0
  }))

  const asks = Array.from({ length: 5 }, (_, i) => ({
    price: 1.0851 + i * 0.0001,
    size: Math.floor(Math.random() * 1000000),
    total: 0
  }))

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${quantumTheme.border}` }}>
        <h4 style={{ fontSize: '14px', fontWeight: '600', color: quantumTheme.text, margin: 0 }}>
          Market Depth
        </h4>
      </div>
      
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* Bids */}
        <div style={{ flex: 1, borderRight: `1px solid ${quantumTheme.border}` }}>
          <div style={{ 
            padding: '8px', 
            background: quantumTheme.surfaceAlt,
            fontSize: '11px',
            fontWeight: '600',
            color: quantumTheme.success,
            textAlign: 'center'
          }}>
            BIDS
          </div>
          {bids.map((bid, i) => (
            <div key={i} style={{
              padding: '6px 8px',
              fontSize: '11px',
              display: 'flex',
              justifyContent: 'space-between',
              background: `${quantumTheme.success}${Math.floor((5 - i) * 8).toString(16).padStart(2, '0')}`
            }}>
              <span style={{ color: quantumTheme.success }}>{bid.price.toFixed(5)}</span>
              <span style={{ color: quantumTheme.text }}>{(bid.size / 1000).toFixed(0)}K</span>
            </div>
          ))}
        </div>

        {/* Asks */}
        <div style={{ flex: 1 }}>
          <div style={{ 
            padding: '8px', 
            background: quantumTheme.surfaceAlt,
            fontSize: '11px',
            fontWeight: '600',
            color: quantumTheme.danger,
            textAlign: 'center'
          }}>
            ASKS
          </div>
          {asks.map((ask, i) => (
            <div key={i} style={{
              padding: '6px 8px',
              fontSize: '11px',
              display: 'flex',
              justifyContent: 'space-between',
              background: `${quantumTheme.danger}${Math.floor((i + 1) * 8).toString(16).padStart(2, '0')}`
            }}>
              <span style={{ color: quantumTheme.danger }}>{ask.price.toFixed(5)}</span>
              <span style={{ color: quantumTheme.text }}>{(ask.size / 1000).toFixed(0)}K</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Recent Trades Component
const RecentTrades: React.FC = () => {
  const [trades] = useState(Array.from({ length: 10 }, (_, i) => ({
    time: new Date(Date.now() - i * 60000).toLocaleTimeString(),
    price: 1.0850 + (Math.random() - 0.5) * 0.001,
    size: Math.floor(Math.random() * 500000),
    side: Math.random() > 0.5 ? 'buy' : 'sell'
  })))

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: `1px solid ${quantumTheme.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h4 style={{ fontSize: '14px', fontWeight: '600', color: quantumTheme.text, margin: 0 }}>
          Recent Trades
        </h4>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: quantumTheme.success,
          animation: 'pulse 2s infinite'
        }} />
      </div>
      
      <div style={{ 
        padding: '8px 16px',
        background: quantumTheme.surfaceAlt,
        fontSize: '11px',
        fontWeight: '600',
        color: quantumTheme.textSecondary,
        display: 'flex',
        gap: '16px'
      }}>
        <span style={{ flex: '0 0 60px' }}>Time</span>
        <span style={{ flex: '0 0 60px' }}>Price</span>
        <span style={{ flex: '0 0 60px' }}>Size</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {trades.map((trade, i) => (
          <div key={i} style={{
            padding: '6px 16px',
            fontSize: '11px',
            display: 'flex',
            gap: '16px',
            borderBottom: `1px solid ${quantumTheme.border}`,
            color: trade.side === 'buy' ? quantumTheme.success : quantumTheme.danger
          }}>
            <span style={{ flex: '0 0 60px', color: quantumTheme.textSecondary }}>{trade.time}</span>
            <span style={{ flex: '0 0 60px', fontWeight: '600' }}>{trade.price.toFixed(5)}</span>
            <span style={{ flex: '0 0 60px' }}>{(trade.size / 1000).toFixed(0)}K</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Open Orders Component
const OpenOrders: React.FC = () => {
  const [orders] = useState([
    { id: '001', symbol: 'EUR/USD', side: 'buy', type: 'limit', price: 1.0845, quantity: 100000, status: 'pending' },
    { id: '002', symbol: 'GBP/USD', side: 'sell', type: 'limit', price: 1.2680, quantity: 50000, status: 'pending' },
    { id: '003', symbol: 'USD/JPY', side: 'buy', type: 'stop', price: 148.50, quantity: 200000, status: 'pending' }
  ])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${quantumTheme.border}` }}>
        <h4 style={{ fontSize: '14px', fontWeight: '600', color: quantumTheme.text, margin: 0 }}>
          Open Orders
        </h4>
      </div>
      
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: quantumTheme.surfaceAlt }}>
              <th style={{ padding: '8px', textAlign: 'left', color: quantumTheme.textSecondary }}>ID</th>
              <th style={{ padding: '8px', textAlign: 'left', color: quantumTheme.textSecondary }}>Symbol</th>
              <th style={{ padding: '8px', textAlign: 'left', color: quantumTheme.textSecondary }}>Side</th>
              <th style={{ padding: '8px', textAlign: 'left', color: quantumTheme.textSecondary }}>Type</th>
              <th style={{ padding: '8px', textAlign: 'left', color: quantumTheme.textSecondary }}>Price</th>
              <th style={{ padding: '8px', textAlign: 'left', color: quantumTheme.textSecondary }}>Qty</th>
              <th style={{ padding: '8px', textAlign: 'center', color: quantumTheme.textSecondary }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} style={{ borderBottom: `1px solid ${quantumTheme.border}` }}>
                <td style={{ padding: '8px', color: quantumTheme.text }}>{order.id}</td>
                <td style={{ padding: '8px', color: quantumTheme.text, fontWeight: '600' }}>{order.symbol}</td>
                <td style={{ 
                  padding: '8px', 
                  color: order.side === 'buy' ? quantumTheme.success : quantumTheme.danger,
                  fontWeight: '600'
                }}>
                  {order.side.toUpperCase()}
                </td>
                <td style={{ padding: '8px', color: quantumTheme.text }}>{order.type}</td>
                <td style={{ padding: '8px', color: quantumTheme.text }}>{order.price.toFixed(5)}</td>
                <td style={{ padding: '8px', color: quantumTheme.text }}>{(order.quantity / 1000).toFixed(0)}K</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    style={{
                      padding: '4px 8px',
                      background: 'transparent',
                      border: `1px solid ${quantumTheme.danger}`,
                      borderRadius: '4px',
                      color: quantumTheme.danger,
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </motion.button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Main Trading App Component
const TradingApp: React.FC = () => {
  return (
    <div style={{ 
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gridTemplateRows: 'repeat(3, 1fr)',
      gap: '12px',
      height: '100%',
      padding: '16px',
      background: quantumTheme.background
    }}>
      {/* Order Entry */}
      <motion.div
        style={{
          gridColumn: 'span 1',
          gridRow: 'span 2',
          background: quantumTheme.surface,
          border: `1px solid ${quantumTheme.border}`,
          borderRadius: '8px',
          overflow: 'hidden'
        }}
        whileHover={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
      >
        <OrderEntry />
      </motion.div>

      {/* Market Depth */}
      <motion.div
        style={{
          gridColumn: 'span 1',
          gridRow: 'span 2',
          background: quantumTheme.surface,
          border: `1px solid ${quantumTheme.border}`,
          borderRadius: '8px',
          overflow: 'hidden'
        }}
        whileHover={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
      >
        <MarketDepth />
      </motion.div>

      {/* Recent Trades */}
      <motion.div
        style={{
          gridColumn: 'span 2',
          gridRow: 'span 1',
          background: quantumTheme.surface,
          border: `1px solid ${quantumTheme.border}`,
          borderRadius: '8px',
          overflow: 'hidden'
        }}
        whileHover={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
      >
        <RecentTrades />
      </motion.div>

      {/* Open Orders */}
      <motion.div
        style={{
          gridColumn: 'span 2',
          gridRow: 'span 1',
          background: quantumTheme.surface,
          border: `1px solid ${quantumTheme.border}`,
          borderRadius: '8px',
          overflow: 'hidden'
        }}
        whileHover={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
      >
        <OpenOrders />
      </motion.div>

      {/* Additional space for future widgets */}
      <motion.div
        style={{
          gridColumn: 'span 4',
          gridRow: 'span 1',
          background: quantumTheme.surface,
          border: `1px solid ${quantumTheme.border}`,
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        whileHover={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
      >
        <div style={{ textAlign: 'center' }}>
          <FeatherIcon name="plus-circle" size={32} color={quantumTheme.textSecondary} />
          <p style={{ fontSize: '12px', color: quantumTheme.textSecondary, marginTop: '8px' }}>
            Additional trading widgets can be added here
          </p>
        </div>
      </motion.div>
    </div>
  )
}

TradingApp.displayName = 'TradingApp'

export default TradingApp