import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { SharedFilterProvider } from './contexts/SharedFilterContext';
import { useRealtimeMetrics } from './hooks/useRealtimeMetrics';
import { MarketMetric, OrderBookEntry } from './types';

interface AnalyticsDashboardProps {
  width?: number | string;
  height?: number | string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  width = '100%',
  height = '100%'
}) => {
  const { currentTheme: theme } = useTheme();
  const eurMetrics = useRealtimeMetrics('EUR/USD');
  const gbpMetrics = useRealtimeMetrics('GBP/USD');

  // Calculate market metrics
  const marketMetrics = useMemo(() => {
    const metrics: MarketMetric[] = [
      { 
        label: 'Total Volume', 
        value: ((eurMetrics.volume + gbpMetrics.volume) / 1000000).toFixed(2) + 'M',
        change: 12.5,
        trend: 'up'
      },
      { 
        label: 'Avg Spread', 
        value: '0.00012',
        change: -2.3,
        trend: 'down'
      },
      { 
        label: 'Volatility', 
        value: '14.2%',
        change: 8.7,
        trend: 'up'
      },
      { 
        label: 'Positions', 
        value: '247',
        change: 0,
        trend: 'neutral'
      }
    ];
    return metrics;
  }, [eurMetrics.volume, gbpMetrics.volume]);

  // Generate order book data
  const orderBookData = useMemo(() => {
    const data: OrderBookEntry[] = [];
    for (let i = 0; i < 10; i++) {
      data.push({
        price: (1.0850 + i * 0.0001).toFixed(5),
        bidSize: Math.floor(Math.random() * 1000),
        askSize: Math.floor(Math.random() * 1000),
        spread: '0.00002'
      });
    }
    return data;
  }, []);

  const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return theme.success;
      case 'down': return theme.danger;
      default: return theme.textSecondary;
    }
  };

  return (
    <SharedFilterProvider>
      <div style={{
        width,
        height,
        backgroundColor: theme.surface,
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${theme.border}`,
          backgroundColor: theme.surface
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '600',
            color: theme.text
          }}>
            Analytics Dashboard
          </h2>
          <p style={{
            margin: '4px 0 0',
            fontSize: '11px',
            color: theme.textSecondary
          }}>
            Real-time market analytics and performance metrics
          </p>
        </div>

        {/* Market Metrics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          padding: '16px',
          borderBottom: `1px solid ${theme.border}`,
          backgroundColor: theme.background
        }}>
          {marketMetrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              style={{
                backgroundColor: theme.surface,
                padding: '12px',
                borderRadius: '6px',
                border: `1px solid ${theme.border}`
              }}
            >
              <div style={{
                fontSize: '11px',
                color: theme.textSecondary,
                marginBottom: '4px'
              }}>
                {metric.label}
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                color: theme.text,
                marginBottom: '4px'
              }}>
                {metric.value}
              </div>
              <div style={{
                fontSize: '11px',
                color: getTrendColor(metric.trend),
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span>{metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→'}</span>
                <span>{Math.abs(metric.change).toFixed(1)}%</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Area */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
          padding: '16px',
          overflow: 'auto'
        }}>
          {/* Live Prices Panel */}
          <div style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '6px',
            padding: '16px'
          }}>
            <h3 style={{
              margin: '0 0 12px',
              fontSize: '14px',
              fontWeight: '600',
              color: theme.text
            }}>
              Live Prices
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* EUR/USD */}
              <div style={{
                padding: '12px',
                backgroundColor: theme.background,
                borderRadius: '4px',
                border: `1px solid ${theme.border}`
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontWeight: '500', color: theme.text }}>EUR/USD</span>
                  <span style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: theme.text
                  }}>
                    {eurMetrics.price.toFixed(5)}
                  </span>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  fontSize: '11px',
                  color: theme.textSecondary
                }}>
                  <div>High: {eurMetrics.high.toFixed(5)}</div>
                  <div>Low: {eurMetrics.low.toFixed(5)}</div>
                  <div>Volume: {(eurMetrics.volume / 1000000).toFixed(2)}M</div>
                  <div>VWAP: {eurMetrics.vwap.toFixed(5)}</div>
                </div>
              </div>

              {/* GBP/USD */}
              <div style={{
                padding: '12px',
                backgroundColor: theme.background,
                borderRadius: '4px',
                border: `1px solid ${theme.border}`
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontWeight: '500', color: theme.text }}>GBP/USD</span>
                  <span style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: theme.text
                  }}>
                    {gbpMetrics.price.toFixed(5)}
                  </span>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  fontSize: '11px',
                  color: theme.textSecondary
                }}>
                  <div>High: {gbpMetrics.high.toFixed(5)}</div>
                  <div>Low: {gbpMetrics.low.toFixed(5)}</div>
                  <div>Volume: {(gbpMetrics.volume / 1000000).toFixed(2)}M</div>
                  <div>VWAP: {gbpMetrics.vwap.toFixed(5)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Book Panel */}
          <div style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '6px',
            padding: '16px'
          }}>
            <h3 style={{
              margin: '0 0 12px',
              fontSize: '14px',
              fontWeight: '600',
              color: theme.text
            }}>
              Order Book
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                fontSize: '11px',
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                    <th style={{ padding: '8px', textAlign: 'left', color: theme.textSecondary }}>Price</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: theme.textSecondary }}>Bid</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: theme.textSecondary }}>Ask</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: theme.textSecondary }}>Spread</th>
                  </tr>
                </thead>
                <tbody>
                  {orderBookData.map((entry, index) => (
                    <tr key={index} style={{
                      borderBottom: index < orderBookData.length - 1 ? `1px solid ${theme.border}20` : 'none'
                    }}>
                      <td style={{ padding: '6px 8px', color: theme.text }}>{entry.price}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: theme.success }}>
                        {entry.bidSize}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: theme.danger }}>
                        {entry.askSize}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: theme.textSecondary }}>
                        {entry.spread}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Metrics Panel */}
          <div style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '6px',
            padding: '16px'
          }}>
            <h3 style={{
              margin: '0 0 12px',
              fontSize: '14px',
              fontWeight: '600',
              color: theme.text
            }}>
              Performance Metrics
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { name: 'Latency', value: 12, target: 15, unit: 'ms' },
                { name: 'Throughput', value: 4500, target: 5000, unit: 'msg/s' },
                { name: 'Fill Rate', value: 98.7, target: 99, unit: '%' },
                { name: 'Uptime', value: 99.95, target: 99.9, unit: '%' }
              ].map((metric) => (
                <div key={metric.name}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                    fontSize: '12px'
                  }}>
                    <span style={{ color: theme.text }}>{metric.name}</span>
                    <span style={{
                      color: metric.value >= metric.target ? theme.success : theme.warning,
                      fontWeight: '500'
                    }}>
                      {metric.value}{metric.unit}
                    </span>
                  </div>
                  <div style={{
                    height: '4px',
                    backgroundColor: theme.background,
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(metric.value / metric.target) * 100}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      style={{
                        height: '100%',
                        backgroundColor: metric.value >= metric.target ? theme.success : theme.warning
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Market Correlation Panel */}
          <div style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: '6px',
            padding: '16px'
          }}>
            <h3 style={{
              margin: '0 0 12px',
              fontSize: '14px',
              fontWeight: '600',
              color: theme.text
            }}>
              Market Correlation
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              fontSize: '11px'
            }}>
              {[
                { pairs: 'EUR/USD - GBP/USD', corr: 0.82 },
                { pairs: 'EUR/USD - USD/JPY', corr: -0.45 },
                { pairs: 'GBP/USD - USD/CHF', corr: -0.68 },
                { pairs: 'EUR/USD - EUR/GBP', corr: 0.34 },
                { pairs: 'USD/JPY - USD/CHF', corr: 0.72 },
                { pairs: 'EUR/GBP - GBP/JPY', corr: -0.15 }
              ].map((item) => (
                <div
                  key={item.pairs}
                  style={{
                    padding: '8px',
                    backgroundColor: theme.background,
                    borderRadius: '4px',
                    border: `1px solid ${theme.border}`,
                    textAlign: 'center'
                  }}
                >
                  <div style={{ color: theme.textSecondary, marginBottom: '4px' }}>
                    {item.pairs}
                  </div>
                  <div style={{
                    color: item.corr > 0.5 ? theme.success : item.corr < -0.5 ? theme.danger : theme.text,
                    fontWeight: '600',
                    fontSize: '14px'
                  }}>
                    {item.corr.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SharedFilterProvider>
  );
};