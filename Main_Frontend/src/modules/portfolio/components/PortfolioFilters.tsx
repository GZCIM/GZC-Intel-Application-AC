import React from 'react';
import { motion } from 'framer-motion';
import { quantumTheme } from '../../../theme/quantum';
import { FeatherIcon } from '../../../components/icons/FeatherIcon';

interface PortfolioFiltersProps {
    filters: {
        search: string;
        assetClass: string;
        status: string;
    };
    onFilterChange: (filters: any) => void;
}

export const PortfolioFilters: React.FC<PortfolioFiltersProps> = ({ filters, onFilterChange }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                background: quantumTheme.surface,
                border: `1px solid ${quantumTheme.border}`,
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}
        >
            {/* Search Input */}
            <div style={{ flex: '1 1 300px', minWidth: '200px', position: 'relative' }}>
                <FeatherIcon 
                    name="search" 
                    size={14} 
                    color={quantumTheme.textSecondary}
                    style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)'
                    }}
                />
                <input
                    type="text"
                    placeholder="Search positions..."
                    value={filters.search}
                    onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
                    style={{
                        width: '100%',
                        padding: '8px 8px 8px 32px',
                        background: quantumTheme.background,
                        border: `1px solid ${quantumTheme.border}`,
                        borderRadius: '6px',
                        color: quantumTheme.text,
                        fontSize: '12px',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => {
                        e.target.style.borderColor = quantumTheme.primary;
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = quantumTheme.border;
                    }}
                />
            </div>

            {/* Asset Class Filter */}
            <select
                value={filters.assetClass}
                onChange={(e) => onFilterChange({ ...filters, assetClass: e.target.value })}
                style={{
                    padding: '8px 32px 8px 12px',
                    background: quantumTheme.background,
                    border: `1px solid ${quantumTheme.border}`,
                    borderRadius: '6px',
                    color: quantumTheme.text,
                    fontSize: '12px',
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer'
                }}
            >
                <option value="">All Assets</option>
                <option value="equity">Equity</option>
                <option value="fixed-income">Fixed Income</option>
                <option value="commodity">Commodity</option>
                <option value="crypto">Crypto</option>
                <option value="forex">Forex</option>
            </select>

            {/* Status Filter */}
            <select
                value={filters.status}
                onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
                style={{
                    padding: '8px 32px 8px 12px',
                    background: quantumTheme.background,
                    border: `1px solid ${quantumTheme.border}`,
                    borderRadius: '6px',
                    color: quantumTheme.text,
                    fontSize: '12px',
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer'
                }}
            >
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="pending">Pending</option>
            </select>

            {/* Clear Filters */}
            {(filters.search || filters.assetClass || filters.status) && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onFilterChange({ search: '', assetClass: '', status: '' })}
                    style={{
                        padding: '8px 12px',
                        background: 'transparent',
                        border: `1px solid ${quantumTheme.border}`,
                        borderRadius: '6px',
                        color: quantumTheme.textSecondary,
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                >
                    <FeatherIcon name="x" size={12} />
                    Clear
                </motion.button>
            )}
        </motion.div>
    );
};