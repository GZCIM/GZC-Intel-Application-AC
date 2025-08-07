import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

interface SimpleChartProps {
  title?: string
  dataPoints?: number
}

export const SimpleChart: React.FC<SimpleChartProps> = ({
  title = 'Simple Chart',
  dataPoints = 10
}) => {
  const { currentTheme } = useTheme()
  const [data, setData] = useState<number[]>([])

  useEffect(() => {
    // Generate random data
    const newData = Array.from({ length: dataPoints }, () => 
      Math.random() * 100
    )
    setData(newData)
  }, [dataPoints])

  const maxValue = Math.max(...data, 1)

  return (
    <div style={{
      height: '100%',
      width: '100%',
      backgroundColor: currentTheme.surface,
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <h3 style={{
        margin: 0,
        fontSize: '14px',
        fontWeight: '600',
        color: currentTheme.text,
        paddingBottom: '8px',
        borderBottom: `1px solid ${currentTheme.border}`
      }}>
        {title}
      </h3>

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'flex-end',
        gap: '4px',
        padding: '8px 0'
      }}>
        {data.map((value, index) => (
          <motion.div
            key={index}
            initial={{ height: 0 }}
            animate={{ height: `${(value / maxValue) * 100}%` }}
            transition={{ duration: 0.5, delay: index * 0.05 }}
            style={{
              flex: 1,
              backgroundColor: currentTheme.primary,
              borderRadius: '4px 4px 0 0',
              minHeight: '4px',
              position: 'relative'
            }}
          >
            <span style={{
              position: 'absolute',
              top: '-20px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '10px',
              color: currentTheme.textSecondary,
              whiteSpace: 'nowrap'
            }}>
              {value.toFixed(0)}
            </span>
          </motion.div>
        ))}
      </div>

      <div style={{
        fontSize: '10px',
        color: currentTheme.textSecondary,
        textAlign: 'center',
        paddingTop: '8px',
        borderTop: `1px solid ${currentTheme.border}`
      }}>
        {dataPoints} data points
      </div>
    </div>
  )
}