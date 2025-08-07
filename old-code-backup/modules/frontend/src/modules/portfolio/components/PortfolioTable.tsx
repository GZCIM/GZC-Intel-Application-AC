import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { quantumTheme } from '../../../theme/quantum';
import { FeatherIcon } from '../../../components/icons/FeatherIcon';

interface Position {
    id: string;
    symbol: string;
    name: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    value: number;
    pnl: number;
    pnlPercent: number;
    assetClass: string;
    status: 'open' | 'closed' | 'pending';
}

interface PortfolioTableProps {
    filters: {
        search: string;
        assetClass: string;
        status: string;
    };
}

export const PortfolioTable: React.FC<PortfolioTableProps> = ({ filters }) => {
    const [sortKey, setSortKey] = useState<keyof Position>('value');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Mock data
    const positions: Position[] = [
        {
            id: '1',
            symbol: 'AAPL',
            name: 'Apple Inc.',
            quantity: 100,
            avgPrice: 150.25,
            currentPrice: 155.50,
            value: 15550,
            pnl: 525,
            pnlPercent: 3.49,
            assetClass: 'equity',
            status: 'open'
        },
        {
            id: '2',
            symbol: 'MSFT',
            name: 'Microsoft Corp.',
            quantity: 50,
            avgPrice: 320.00,
            currentPrice: 335.75,
            value: 16787.50,
            pnl: 787.50,
            pnlPercent: 4.92,
            assetClass: 'equity',
            status: 'open'
        },
        {
            id: '3',
            symbol: 'BTC-USD',
            name: 'Bitcoin',
            quantity: 0.5,
            avgPrice: 45000,
            currentPrice: 48500,
            value: 24250,
            pnl: 1750,
            pnlPercent: 7.78,
            assetClass: 'crypto',
            status: 'open'
        },
        {
            id: '4',
            symbol: 'EUR/USD',
            name: 'Euro/US Dollar',
            quantity: 10000,
            avgPrice: 1.0850,
            currentPrice: 1.0875,
            value: 10875,
            pnl: 25,
            pnlPercent: 0.23,
            assetClass: 'forex',
            status: 'open'
        }
    ];

    // Filter positions
    const filteredPositions = useMemo(() => {
        return positions.filter(position => {
            const matchesSearch = !filters.search || 
                position.symbol.toLowerCase().includes(filters.search.toLowerCase()) ||
                position.name.toLowerCase().includes(filters.search.toLowerCase());
            
            const matchesAssetClass = !filters.assetClass || position.assetClass === filters.assetClass;
            const matchesStatus = !filters.status || position.status === filters.status;
            
            return matchesSearch && matchesAssetClass && matchesStatus;
        });
    }, [filters]);

    // Sort positions
    const sortedPositions = useMemo(() => {
        return [...filteredPositions].sort((a, b) => {
            const aValue = a[sortKey];
            const bValue = b[sortKey];
            
            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
    }, [filteredPositions, sortKey, sortOrder]);

    const handleSort = (key: keyof Position) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('desc');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
                background: quantumTheme.surface,
                border: `1px solid ${quantumTheme.border}`,
                borderRadius: '8px',
                overflow: 'hidden'
            }}
        >
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: quantumTheme.surfaceAlt }}>
                            <th style={headerStyle} onClick={() => handleSort('symbol')}>
                                <div style={headerContentStyle}>
                                    Symbol
                                    {sortKey === 'symbol' && (
                                        <FeatherIcon 
                                            name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'} 
                                            size={12} 
                                        />
                                    )}
                                </div>
                            </th>
                            <th style={headerStyle} onClick={() => handleSort('quantity')}>
                                <div style={headerContentStyle}>
                                    Quantity
                                    {sortKey === 'quantity' && (
                                        <FeatherIcon 
                                            name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'} 
                                            size={12} 
                                        />
                                    )}
                                </div>
                            </th>
                            <th style={headerStyle} onClick={() => handleSort('avgPrice')}>
                                <div style={headerContentStyle}>
                                    Avg Price
                                    {sortKey === 'avgPrice' && (
                                        <FeatherIcon 
                                            name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'} 
                                            size={12} 
                                        />
                                    )}
                                </div>
                            </th>
                            <th style={headerStyle} onClick={() => handleSort('currentPrice')}>
                                <div style={headerContentStyle}>
                                    Current Price
                                    {sortKey === 'currentPrice' && (
                                        <FeatherIcon 
                                            name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'} 
                                            size={12} 
                                        />
                                    )}
                                </div>
                            </th>
                            <th style={headerStyle} onClick={() => handleSort('value')}>
                                <div style={headerContentStyle}>
                                    Value
                                    {sortKey === 'value' && (
                                        <FeatherIcon 
                                            name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'} 
                                            size={12} 
                                        />
                                    )}
                                </div>
                            </th>
                            <th style={headerStyle} onClick={() => handleSort('pnl')}>
                                <div style={headerContentStyle}>
                                    P&L
                                    {sortKey === 'pnl' && (
                                        <FeatherIcon 
                                            name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'} 
                                            size={12} 
                                        />
                                    )}
                                </div>
                            </th>
                            <th style={headerStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedPositions.map((position, index) => (
                            <motion.tr
                                key={position.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                style={{
                                    borderBottom: `1px solid ${quantumTheme.border}`,
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = quantumTheme.surfaceAlt;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <td style={cellStyle}>
                                    <div>
                                        <div style={{ fontWeight: '600', color: quantumTheme.text }}>
                                            {position.symbol}
                                        </div>
                                        <div style={{ fontSize: '11px', color: quantumTheme.textSecondary }}>
                                            {position.name}
                                        </div>
                                    </div>
                                </td>
                                <td style={cellStyle}>{position.quantity}</td>
                                <td style={cellStyle}>${position.avgPrice.toFixed(2)}</td>
                                <td style={cellStyle}>${position.currentPrice.toFixed(2)}</td>
                                <td style={cellStyle}>${position.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                <td style={{
                                    ...cellStyle,
                                    color: position.pnl >= 0 ? quantumTheme.success : quantumTheme.danger
                                }}>
                                    <div>
                                        <div>
                                            {position.pnl >= 0 ? '+' : ''}${Math.abs(position.pnl).toFixed(2)}
                                        </div>
                                        <div style={{ fontSize: '11px' }}>
                                            {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                                        </div>
                                    </div>
                                </td>
                                <td style={cellStyle}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            style={actionButtonStyle}
                                            title="Trade"
                                        >
                                            <FeatherIcon name="trending-up" size={14} />
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            style={actionButtonStyle}
                                            title="Details"
                                        >
                                            <FeatherIcon name="info" size={14} />
                                        </motion.button>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
};

const headerStyle: React.CSSProperties = {
    padding: '12px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: quantumTheme.textSecondary,
    cursor: 'pointer',
    userSelect: 'none'
};

const headerContentStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
};

const cellStyle: React.CSSProperties = {
    padding: '12px',
    fontSize: '12px',
    color: quantumTheme.text
};

const actionButtonStyle: React.CSSProperties = {
    background: 'transparent',
    border: `1px solid ${quantumTheme.border}`,
    borderRadius: '4px',
    padding: '4px',
    cursor: 'pointer',
    color: quantumTheme.textSecondary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};