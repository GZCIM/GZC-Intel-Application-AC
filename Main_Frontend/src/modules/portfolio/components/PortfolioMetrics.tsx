import React from 'react';
import { motion } from 'framer-motion';
import { quantumTheme } from '../../../theme/quantum';
import { FeatherIcon } from '../../../components/icons/FeatherIcon';

interface PortfolioMetricsProps {
    isConnected: boolean;
}

export const PortfolioMetrics: React.FC<PortfolioMetricsProps> = ({ isConnected }) => {
    const metrics = {
        totalValue: 2453932.42,
        dailyPnL: 12497.97,
        dailyPnLPercent: 0.51,
        monthlyPnL: 45892.15,
        monthlyPnLPercent: 1.91,
        openPositions: 24,
        winRate: 68
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
        }}>
            {/* Total Portfolio Value */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    background: quantumTheme.surface,
                    border: `1px solid ${quantumTheme.border}`,
                    borderRadius: '8px',
                    padding: '16px'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <FeatherIcon name="briefcase" size={14} color={quantumTheme.primary} />
                    <span style={{ fontSize: '12px', color: quantumTheme.textSecondary }}>Portfolio Value</span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: quantumTheme.text }}>
                    ${metrics.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '11px', color: quantumTheme.success, marginTop: '4px' }}>
                    <FeatherIcon name="trending-up" size={10} /> +2.34% MTD
                </div>
            </motion.div>

            {/* Daily P&L */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{
                    background: quantumTheme.surface,
                    border: `1px solid ${quantumTheme.border}`,
                    borderRadius: '8px',
                    padding: '16px'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <FeatherIcon name="activity" size={14} color={quantumTheme.primary} />
                    <span style={{ fontSize: '12px', color: quantumTheme.textSecondary }}>Daily P&L</span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: metrics.dailyPnL > 0 ? quantumTheme.success : quantumTheme.danger }}>
                    {metrics.dailyPnL > 0 ? '+' : ''}${Math.abs(metrics.dailyPnL).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '11px', color: metrics.dailyPnL > 0 ? quantumTheme.success : quantumTheme.danger, marginTop: '4px' }}>
                    {metrics.dailyPnLPercent > 0 ? '+' : ''}{metrics.dailyPnLPercent}%
                </div>
            </motion.div>

            {/* Open Positions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                    background: quantumTheme.surface,
                    border: `1px solid ${quantumTheme.border}`,
                    borderRadius: '8px',
                    padding: '16px'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <FeatherIcon name="layers" size={14} color={quantumTheme.primary} />
                    <span style={{ fontSize: '12px', color: quantumTheme.textSecondary }}>Open Positions</span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: quantumTheme.text }}>
                    {metrics.openPositions}
                </div>
                <div style={{ fontSize: '11px', color: quantumTheme.textSecondary, marginTop: '4px' }}>
                    Win Rate: {metrics.winRate}%
                </div>
            </motion.div>

            {/* Connection Status */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{
                    background: quantumTheme.surface,
                    border: `1px solid ${quantumTheme.border}`,
                    borderRadius: '8px',
                    padding: '16px'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <FeatherIcon name="wifi" size={14} color={quantumTheme.primary} />
                    <span style={{ fontSize: '12px', color: quantumTheme.textSecondary }}>Status</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isConnected ? quantumTheme.success : quantumTheme.danger,
                        animation: isConnected ? 'pulse 2s infinite' : 'none'
                    }} />
                    <span style={{ fontSize: '14px', fontWeight: '600', color: quantumTheme.text }}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
            </motion.div>
        </div>
    );
};