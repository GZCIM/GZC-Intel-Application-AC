import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import { DataTable, Column } from '../DataTable/DataTable'
import { ContextMenu, ContextMenuItem } from '../ContextMenu/ContextMenu'
import { PortfolioPosition } from '../../types/portfolio'

interface PortfolioTableProps {
  positions: PortfolioPosition[]
  onPositionClick?: (position: PortfolioPosition, index: number) => void
  height?: number | string
}

export const PortfolioTable: React.FC<PortfolioTableProps> = ({
  positions,
  onPositionClick,
  height = 400
}) => {
  const { currentTheme: theme } = useTheme()
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    position: { x: number; y: number }
    data: PortfolioPosition | null
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    data: null
  })

  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  // Format percentage values
  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  // Format quantity
  const formatQuantity = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4
    }).format(value)
  }

  // Table columns definition
  const columns: Column<PortfolioPosition>[] = useMemo(() => [
    {
      key: 'symbol',
      header: 'Symbol',
      width: 120,
      sortable: true,
      filterable: true,
      format: (value, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div>
            <div style={{ fontWeight: '600', color: theme.text }}>{value}</div>
            <div style={{ fontSize: '11px', color: theme.textSecondary }}>
              {row.assetClass}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'side',
      header: 'Side',
      width: 80,
      sortable: true,
      filterable: true,
      format: (value) => (
        <span style={{
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '500',
          backgroundColor: value === 'LONG' ? `${theme.success}20` : `${theme.danger}20`,
          color: value === 'LONG' ? theme.success : theme.danger
        }}>
          {value}
        </span>
      )
    },
    {
      key: 'quantity',
      header: 'Quantity',
      width: 120,
      sortable: true,
      align: 'right',
      format: (value) => formatQuantity(value)
    },
    {
      key: 'averagePrice',
      header: 'Avg Price',
      width: 120,
      sortable: true,
      align: 'right',
      format: (value) => formatCurrency(value)
    },
    {
      key: 'currentPrice',
      header: 'Current Price',
      width: 120,
      sortable: true,
      align: 'right',
      format: (value, row) => (
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 0.3 }}
          key={value} // Re-animate when price changes
        >
          {formatCurrency(value)}
        </motion.div>
      )
    },
    {
      key: 'marketValue',
      header: 'Market Value',
      width: 140,
      sortable: true,
      align: 'right',
      format: (value) => formatCurrency(value)
    },
    {
      key: 'unrealizedPnL',
      header: 'Unrealized P&L',
      width: 140,
      sortable: true,
      align: 'right',
      format: (value) => (
        <span style={{
          color: value >= 0 ? theme.success : theme.danger,
          fontWeight: '500'
        }}>
          {formatCurrency(value)}
        </span>
      )
    },
    {
      key: 'totalPnL',
      header: 'Total P&L',
      width: 140,
      sortable: true,
      align: 'right',
      format: (value) => (
        <span style={{
          color: value >= 0 ? theme.success : theme.danger,
          fontWeight: '600'
        }}>
          {formatCurrency(value)}
        </span>
      )
    },
    {
      key: 'pnlPercent',
      header: 'P&L %',
      width: 100,
      sortable: true,
      align: 'right',
      format: (value) => (
        <span style={{
          color: value >= 0 ? theme.success : theme.danger,
          fontWeight: '600'
        }}>
          {formatPercent(value)}
        </span>
      )
    },
    {
      key: 'weight',
      header: 'Weight',
      width: 100,
      sortable: true,
      align: 'right',
      format: (value) => formatPercent(value)
    },
    {
      key: 'lastUpdate',
      header: 'Last Update',
      width: 120,
      sortable: true,
      format: (value) => {
        const date = new Date(value)
        return date.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      }
    }
  ], [theme])

  // Context menu items
  const contextMenuItems: ContextMenuItem[] = [
    {
      label: 'View Details',
      icon: '👁️',
      action: () => {
        if (contextMenu.data) {
          console.log('View details for:', contextMenu.data.symbol)
        }
      }
    },
    {
      label: 'Trade',
      icon: '📈',
      submenu: [
        {
          label: 'Buy More',
          icon: '🟢',
          action: () => {
            if (contextMenu.data) {
              console.log('Buy more:', contextMenu.data.symbol)
            }
          }
        },
        {
          label: 'Sell Position',
          icon: '🔴',
          action: () => {
            if (contextMenu.data) {
              console.log('Sell position:', contextMenu.data.symbol)
            }
          }
        },
        {
          label: 'Close Position',
          icon: '❌',
          danger: true,
          action: () => {
            if (contextMenu.data) {
              console.log('Close position:', contextMenu.data.symbol)
            }
          }
        }
      ]
    },
    { divider: true },
    {
      label: 'Set Alert',
      icon: '🔔',
      action: () => {
        if (contextMenu.data) {
          console.log('Set alert for:', contextMenu.data.symbol)
        }
      }
    },
    {
      label: 'Add to Watchlist',
      icon: '⭐',
      action: () => {
        if (contextMenu.data) {
          console.log('Add to watchlist:', contextMenu.data.symbol)
        }
      }
    },
    { divider: true },
    {
      label: 'Export Data',
      icon: '📊',
      submenu: [
        {
          label: 'Export to CSV',
          action: () => console.log('Export to CSV')
        },
        {
          label: 'Export to Excel',
          action: () => console.log('Export to Excel')
        }
      ]
    }
  ]

  const handleRightClick = (position: PortfolioPosition, index: number, event: React.MouseEvent) => {
    setContextMenu({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      data: position
    })
  }

  const closeContextMenu = () => {
    setContextMenu({
      isOpen: false,
      position: { x: 0, y: 0 },
      data: null
    })
  }

  return (
    <>
      <DataTable
        data={positions}
        columns={columns}
        onRowClick={onPositionClick}
        onRowRightClick={handleRightClick}
        height={height}
        loading={false}
        emptyMessage="No positions found"
        striped={true}
        highlightOnHover={true}
        compact={false}
      />
      
      <ContextMenu
        items={contextMenuItems}
        position={contextMenu.position}
        isOpen={contextMenu.isOpen}
        onClose={closeContextMenu}
      />
    </>
  )
}