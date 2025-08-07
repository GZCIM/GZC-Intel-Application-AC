import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

export interface Column<T> {
  key: keyof T | string
  header: string
  width?: number | string
  sortable?: boolean
  filterable?: boolean
  align?: 'left' | 'center' | 'right'
  format?: (value: any, row: T) => React.ReactNode
  className?: string
  headerClassName?: string
}

export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (row: T, index: number) => void
  onRowRightClick?: (row: T, index: number, event: React.MouseEvent) => void
  onSort?: (column: Column<T>, direction: 'asc' | 'desc') => void
  selectedRows?: number[]
  onSelectRows?: (rows: number[]) => void
  loading?: boolean
  emptyMessage?: string
  height?: number | string
  striped?: boolean
  compact?: boolean
  highlightOnHover?: boolean
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  onRowRightClick,
  onSort,
  selectedRows = [],
  onSelectRows,
  loading = false,
  emptyMessage = 'No data available',
  height = 'auto',
  striped = true,
  compact = false,
  highlightOnHover = true
}: DataTableProps<T>) {
  const { currentTheme: theme } = useTheme()
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [filters, setFilters] = useState<Record<string, string>>({})

  // Handle sorting
  const handleSort = useCallback((column: Column<T>) => {
    if (!column.sortable) return

    const key = column.key as string
    const newDirection = sortColumn === key && sortDirection === 'asc' ? 'desc' : 'asc'
    
    setSortColumn(key)
    setSortDirection(newDirection)
    
    if (onSort) {
      onSort(column, newDirection)
    }
  }, [sortColumn, sortDirection, onSort])

  // Apply local sorting and filtering
  const processedData = useMemo(() => {
    let result = [...data]

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        result = result.filter(row => {
          const cellValue = String(row[key] || '').toLowerCase()
          return cellValue.includes(value.toLowerCase())
        })
      }
    })

    // Apply sorting
    if (sortColumn && !onSort) {
      result.sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]
        
        if (aVal === bVal) return 0
        
        const comparison = aVal < bVal ? -1 : 1
        return sortDirection === 'asc' ? comparison : -comparison
      })
    }

    return result
  }, [data, filters, sortColumn, sortDirection, onSort])

  // Get cell value
  const getCellValue = (row: T, column: Column<T>) => {
    const keys = String(column.key).split('.')
    let value: any = row
    
    for (const key of keys) {
      value = value?.[key]
    }
    
    return column.format ? column.format(value, row) : value
  }

  const cellPadding = compact ? '8px 12px' : '12px 16px'

  return (
    <div 
      style={{
        width: '100%',
        height,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.surface,
        borderRadius: '8px',
        border: `1px solid ${theme.border}`,
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: columns.map(col => col.width || '1fr').join(' '),
        backgroundColor: theme.background,
        borderBottom: `1px solid ${theme.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        {columns.map((column) => (
          <div
            key={String(column.key)}
            onClick={() => handleSort(column)}
            style={{
              padding: cellPadding,
              display: 'flex',
              alignItems: 'center',
              justifyContent: column.align || 'left',
              gap: '8px',
              cursor: column.sortable ? 'pointer' : 'default',
              userSelect: 'none',
              borderRight: `1px solid ${theme.border}`,
              backgroundColor: theme.background
            }}
            className={column.headerClassName}
          >
            <span style={{
              fontSize: compact ? '12px' : '13px',
              fontWeight: '600',
              color: theme.text
            }}>
              {column.header}
            </span>
            
            {column.sortable && (
              <span style={{
                fontSize: '10px',
                color: sortColumn === String(column.key) ? theme.primary : theme.textSecondary,
                opacity: sortColumn === String(column.key) ? 1 : 0.3
              }}>
                {sortColumn === String(column.key) && sortDirection === 'desc' ? '▼' : '▲'}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Filter Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: columns.map(col => col.width || '1fr').join(' '),
        backgroundColor: theme.surface,
        borderBottom: `1px solid ${theme.border}`
      }}>
        {columns.map((column) => (
          <div
            key={`filter-${String(column.key)}`}
            style={{
              padding: '4px 8px',
              borderRight: `1px solid ${theme.border}`
            }}
          >
            {column.filterable && (
              <input
                type="text"
                placeholder={`Filter ${column.header}`}
                value={filters[String(column.key)] || ''}
                onChange={(e) => setFilters({
                  ...filters,
                  [String(column.key)]: e.target.value
                })}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  fontSize: '11px',
                  backgroundColor: theme.background,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '4px',
                  color: theme.text,
                  outline: 'none'
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Body */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        position: 'relative'
      }}>
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: theme.textSecondary
          }}>
            <div>Loading...</div>
          </div>
        ) : processedData.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: theme.textSecondary,
            fontSize: '14px'
          }}>
            {emptyMessage}
          </div>
        ) : (
          <AnimatePresence>
            {processedData.map((row, rowIndex) => (
              <motion.div
                key={rowIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2, delay: rowIndex * 0.01 }}
                onClick={() => onRowClick?.(row, rowIndex)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  onRowRightClick?.(row, rowIndex, e)
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: columns.map(col => col.width || '1fr').join(' '),
                  backgroundColor: selectedRows.includes(rowIndex) 
                    ? `${theme.primary}20`
                    : striped && rowIndex % 2 === 0 
                      ? theme.surface 
                      : theme.background,
                  borderBottom: `1px solid ${theme.border}`,
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (highlightOnHover && !selectedRows.includes(rowIndex)) {
                    e.currentTarget.style.backgroundColor = `${theme.primary}10`
                  }
                }}
                onMouseLeave={(e) => {
                  if (highlightOnHover && !selectedRows.includes(rowIndex)) {
                    e.currentTarget.style.backgroundColor = striped && rowIndex % 2 === 0 
                      ? theme.surface 
                      : theme.background
                  }
                }}
              >
                {columns.map((column) => (
                  <div
                    key={`${rowIndex}-${String(column.key)}`}
                    style={{
                      padding: cellPadding,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: column.align || 'left',
                      borderRight: `1px solid ${theme.border}`,
                      fontSize: compact ? '12px' : '13px',
                      color: theme.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    className={column.className}
                  >
                    {getCellValue(row, column)}
                  </div>
                ))}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}