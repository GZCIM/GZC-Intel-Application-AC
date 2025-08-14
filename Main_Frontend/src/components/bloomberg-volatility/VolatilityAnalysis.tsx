import { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { getQualityColor } from './utils/dataValidation'
import { ValidatedVolatilityData } from './types'
import axios from 'axios'
import * as d3 from 'd3'
import { PlotlyVolatilitySurface } from './PlotlyVolatilitySurface'
import { ErrorRetryBanner } from './ErrorRetryBanner'

// Use the same tenors as other tabs for consistency
// Key benchmark tenors for term structure - monthly and yearly only
const TERM_STRUCTURE_TENORS = ["ON", "1M", "2M", "3M", "6M", "9M", "1Y", "18M", "2Y"]

// Unified color palette for consistency across charts
const UNIFIED_COLORS = [
  '#ff6b6b',  // Red
  '#4ecdc4',  // Teal
  '#845ef7',  // Purple
  '#ffd93d',  // Yellow
  '#5c7cfa',  // Blue
  '#95e1d3',  // Mint
  '#f38181',  // Coral
  '#aa96da',  // Lavender
]

// Standard tenors for volatility analysis
const STANDARD_TENORS = ["ON", "1W", "2W", "1M", "2M", "3M", "6M", "9M", "1Y", "18M", "2Y"]

interface VolatilityAnalysisProps {
  theme?: 'light' | 'dark'
  apiEndpoint?: string
}

// Bloomberg API endpoints
const BLOOMBERG_ENDPOINTS = {
  VM_DIRECT: 'http://20.172.249.92:8080',      // Direct Bloomberg VM API (HTTP only - mixed content blocked)
  K8S_GATEWAY: 'http://52.149.235.82',         // K8s Bloomberg Gateway (HTTP only - mixed content blocked)  
  CONTAINER_APP: 'https://bloomberg-volatility-surface.agreeablepond-1a74a92d.eastus.azurecontainerapps.io',
  PROXY: '/api/bloomberg'  // Proxy through main app backend to avoid mixed content
}

export function VolatilityAnalysis({ 
  theme,
  apiEndpoint = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:8080' 
    : BLOOMBERG_ENDPOINTS.PROXY  // Use proxy to avoid mixed content issues
}: VolatilityAnalysisProps = {}) {
  const { currentTheme } = useTheme()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPair, setSelectedPair] = useState('EURUSD')
  const [selectedTenor] = useState('1M')
  const [surfaceData, setSurfaceData] = useState<ValidatedVolatilityData[]>([])
  const [loadingProgress, setLoadingProgress] = useState<string>('')
  const [visibleTenorsForSmile, setVisibleTenorsForSmile] = useState<Set<string>>(new Set(['1W']))
  const [visibleDeltasForTerm, setVisibleDeltasForTerm] = useState<Set<number>>(new Set([50]))
  const [dataQualityScore, setDataQualityScore] = useState<number>(0)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [spotRates, setSpotRates] = useState<Record<string, number>>({})
  
  // React-managed tooltip state (safer than D3.js DOM manipulation)
  const [termTooltip, setTermTooltip] = useState<{ visible: boolean; x: number; y: number; content: React.ReactNode } | null>(null)
  const [smileTooltip, setSmileTooltip] = useState<{ visible: boolean; x: number; y: number; content: React.ReactNode } | null>(null)
  
  const smileChartRef = useRef<HTMLDivElement>(null)
  const termChartRef = useRef<HTMLDivElement>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  
  // Convert tenor to actual time in years - moved to global scope
  const tenorToYears = (tenor: string): number => {
    const map: Record<string, number> = {
      'ON': 1/365,    // Overnight = 1 day
      '1W': 7/365,    // 1 week
      '2W': 14/365,   // 2 weeks
      '1M': 30/365,   // ~1 month
      '2M': 60/365,   // ~2 months
      '3M': 90/365,   // ~3 months
      '6M': 180/365,  // ~6 months
      '9M': 270/365,  // ~9 months
      '1Y': 1.0,      // 1 year
      '18M': 1.5,     // 1.5 years
      '2Y': 2.0       // 2 years
    }
    return map[tenor] || 0
  }
  
  // Major FX pairs for volatility trading
  const currencyPairs = [
    // Major USD pairs
    'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
    // EUR crosses
    'EURGBP', 'EURJPY', 'EURCHF', 'EURAUD', 'EURCAD', 'EURNZD',
    // GBP crosses
    'GBPJPY', 'GBPCHF', 'GBPAUD', 'GBPCAD', 'GBPNZD',
    // JPY crosses
    'AUDJPY', 'CADJPY', 'NZDJPY', 'CHFJPY',
    // Other crosses
    'AUDCAD', 'AUDCHF', 'AUDNZD', 'CADCHF', 'NZDCAD', 'NZDCHF'
  ]


  // Fetch spot rates for all currency pairs
  const fetchSpotRates = useCallback(async () => {
    try {
      // Build list of spot tickers
      const spotTickers = currencyPairs.map(pair => `${pair} Curncy`)
      
      const endpoint = `${apiEndpoint}/api/market-data`
      
      const response = await axios.post(endpoint, {
        securities: spotTickers,
        fields: ['PX_LAST']
      })
      
      // K8s gateway wraps the response in a data field
      const result = response.data.data || response.data
      
      if (result.success && result.data?.securities_data) {
        const rates: Record<string, number> = {}
        
        result.data.securities_data.forEach((sec: any) => {
          if (sec.success && sec.fields?.PX_LAST) {
            // Extract pair name from ticker (e.g., "EURUSD Curncy" -> "EURUSD")
            const pair = sec.security.replace(' Curncy', '')
            rates[pair] = sec.fields.PX_LAST
          }
        })
        
        console.log('Fetched spot rates:', rates)
        setSpotRates(rates)
      }
    } catch (error) {
      console.error('Error fetching spot rates:', error)
      // Don't fail the whole component if spot rates fail
    }
  }, [])
  
  const fetchData = useCallback(async () => {
    console.log('fetchData called for', selectedPair)
    setLoading(true)
    setError(null)
    setSurfaceData([])
    setLoadingProgress('Fetching all tenor data...')
    
    try {
      // Fetch volatility surface data
      console.log('Fetching all tenors in one batched call...', STANDARD_TENORS)
      const volResponse = await axios.post(`${apiEndpoint}/api/volatility-surface/${selectedPair}`, 
        STANDARD_TENORS
      )
      
      // Parse K8s gateway response format
      const volData = volResponse.data
      let data = []
      
      // Check if data is in the nested structure from K8s gateway
      if (volData.data?.data?.securities_data) {
        console.log('Parsing K8s gateway format with securities_data')
        const securities = volData.data.data.securities_data
        
        // Group securities by tenor
        const byTenor = {}
        securities.forEach(sec => {
          if (sec.success && sec.fields) {
            const ticker = sec.security
            // Extract tenor from ticker like "EURUSDV1M BGN Curncy" or "EURUSD25R1M BGN Curncy"
            const match = ticker.match(new RegExp(`${selectedPair}(\\d*[RBV])(\\d+[DWMY])\\s`))
            if (match) {
              const tenor = match[2]
              if (!byTenor[tenor]) {
                byTenor[tenor] = {
                  tenor,
                  // Create .raw wrapper to match standalone app structure exactly
                  raw: {
                    atm_bid: null,
                    atm_ask: null,
                    rr_5d_bid: null,
                    rr_5d_ask: null,
                    bf_5d_bid: null,
                    bf_5d_ask: null,
                    rr_10d_bid: null,
                    rr_10d_ask: null,
                    bf_10d_bid: null,
                    bf_10d_ask: null,
                    rr_15d_bid: null,
                    rr_15d_ask: null,
                    bf_15d_bid: null,
                    bf_15d_ask: null,
                    rr_25d_bid: null,
                    rr_25d_ask: null,
                    bf_25d_bid: null,
                    bf_25d_ask: null,
                    rr_35d_bid: null,
                    rr_35d_ask: null,
                    bf_35d_bid: null,
                    bf_35d_ask: null
                  }
                }
              }
              
              // Parse the ticker type (ATM, RR, BF) and delta
              const typeMatch = ticker.match(new RegExp(`${selectedPair}(\\d*)?([RBV])(\\d+[DWMY])`))
              if (typeMatch) {
                const delta = typeMatch[1] || ''
                const type = typeMatch[2]
                
                if (type === 'V') {
                  // ATM volatility - assign to .raw structure to match standalone app
                  byTenor[tenor].raw.atm_bid = sec.fields.PX_BID || null
                  byTenor[tenor].raw.atm_ask = sec.fields.PX_ASK || null
                } else if (type === 'R') {
                  // Risk Reversal - assign to .raw structure to match standalone app
                  const fieldPrefix = `rr_${delta}d`
                  byTenor[tenor].raw[`${fieldPrefix}_bid`] = sec.fields.PX_BID || null
                  byTenor[tenor].raw[`${fieldPrefix}_ask`] = sec.fields.PX_ASK || null
                } else if (type === 'B') {
                  // Butterfly - assign to .raw structure to match standalone app
                  const fieldPrefix = `bf_${delta}d`
                  byTenor[tenor].raw[`${fieldPrefix}_bid`] = sec.fields.PX_BID || null
                  byTenor[tenor].raw[`${fieldPrefix}_ask`] = sec.fields.PX_ASK || null
                }
              }
            }
          }
        })
        
        // Convert to array
        data = Object.values(byTenor)
      } else if (volData.surface) {
        // Original format with surface property
        console.log('Parsing original format with surface property')
        data = Object.keys(volData.surface).map(tenor => ({
          tenor,
          ...volData.surface[tenor]
        }))
      } else {
        console.warn('Unknown data format from Bloomberg API')
      }
      
      if (data && data.length > 0) {
        console.log(`Received ${data.length} volatility data points`)
        console.log('Tenors received:', data.map(d => d.tenor))
        
        // Calculate overall data quality
        const totalScore = data.reduce((sum, d) => sum + (d.quality?.completeness || 0), 0)
        const avgScore = Math.round(totalScore / data.length)
        setDataQualityScore(avgScore)
        
        // Set last update time
        setLastUpdate(new Date())
        
        setSurfaceData(data)
        setError(null) // Clear any previous errors
      } else {
        console.warn('No data received from Bloomberg API')
        setSurfaceData([])
        setError(`No volatility data available for ${selectedPair}`)
        setDataQualityScore(0)
      }
    } catch (err) {
      console.error('Bloomberg API failed:', err)
      console.error('Full error:', err)
      
      // Show real error - no error recovery
      const userMessage = err instanceof Error ? err.message : String(err)
      
      setError(userMessage)
      setSurfaceData([])
      setDataQualityScore(0)
    } finally {
      console.log('fetchData completed, setting loading to false')
      setLoading(false)
      setLoadingProgress('')
    }
  }, [selectedPair, fetchSpotRates])

  useEffect(() => {
    console.log('useEffect triggered, calling fetchData')
    fetchSpotRates() // Fetch spot rates on component mount
    fetchData()
  }, [fetchData, fetchSpotRates])

  // Set up resize observer for smooth chart resizing
  useEffect(() => {
    const handleResize = () => {
      // Re-render charts on resize with debounce
      if (surfaceData.length > 0 && smileChartRef.current && termChartRef.current) {
        requestAnimationFrame(() => {
          try {
            if (smileChartRef.current && termChartRef.current) {
              drawSmileChart()
              drawTermStructureChart()
            }
          } catch (error) {
            console.warn('Chart resize redraw failed (safe to ignore):', error)
          }
        })
      }
    }

    // Create resize observer
    resizeObserverRef.current = new ResizeObserver(() => {
      handleResize()
    })

    // Observe chart containers
    if (smileChartRef.current) {
      resizeObserverRef.current.observe(smileChartRef.current)
    }
    if (termChartRef.current) {
      resizeObserverRef.current.observe(termChartRef.current)
    }

    // Also listen for window resize
    window.addEventListener('resize', handleResize)

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
      window.removeEventListener('resize', handleResize)
      
      // Hide tooltips on cleanup (no DOM manipulation needed)
      setTermTooltip(null)
      setSmileTooltip(null)
    }
  }, [surfaceData, currentTheme])

  // D3.js Term Structure Visualization
  const drawTermStructureChart = useCallback(() => {
    console.log('🔍 drawTermStructureChart called')
    if (!termChartRef.current) {
      console.error('❌ No termChartRef.current')
      return
    }
    
    // Safely clear previous chart by removing children directly
    try {
      if (termChartRef.current) {
        // Remove all child nodes safely
        while (termChartRef.current.firstChild) {
          termChartRef.current.firstChild.remove()
        }
      }
    } catch (error) {
      console.warn('Error clearing term chart:', error)
    }
    
    if (!surfaceData.length) {
      console.warn('⚠️ No surfaceData available')
      return
    }
    console.log('✅ Surface data available:', surfaceData.length, 'tenors')

    // VOLATILITY TERM STRUCTURE: Shows volatility across tenors for each delta
    const allTermCurves: Array<{delta: number, label: string, points: Array<{tenor: string, vol: number, sortKey: number, timeYears: number}>}> = []
    
    console.log('Building term structure for all deltas')
    
    // Build curves for each delta
    const deltas = [5, 10, 15, 25, 35, 50] // 50 = ATM
    
    deltas.filter(delta => visibleDeltasForTerm.has(delta)).forEach(delta => {
      const deltaPoints: Array<{tenor: string, vol: number, sortKey: number, timeYears: number}> = []
      
      surfaceData.forEach(data => {
        // Skip non-benchmark tenors for cleaner term structure
        if (!TERM_STRUCTURE_TENORS.includes(data.tenor)) {
          return
        }
        
        // Get ATM data
        let atmBid = data.raw?.atm_bid
        let atmAsk = data.raw?.atm_ask
        
        if ((!atmBid || !atmAsk) && data.atm_mid && data.atm_spread) {
          atmBid = data.atm_mid - data.atm_spread / 2
          atmAsk = data.atm_mid + data.atm_spread / 2
        }
        
        if (!atmBid || !atmAsk) {
          return
        }
        
        const atmMid = (atmBid + atmAsk) / 2
        let deltaVol = atmMid // Default to ATM
        
        // Calculate volatility for non-ATM deltas
        if (delta !== 50) {
          let rr = 0, bf = 0
          
          switch(delta) {
            case 5:
              rr = data.raw?.rr_5d_bid && data.raw?.rr_5d_ask ? (data.raw.rr_5d_bid + data.raw.rr_5d_ask) / 2 : null
              bf = data.raw?.bf_5d_bid && data.raw?.bf_5d_ask ? (data.raw.bf_5d_bid + data.raw.bf_5d_ask) / 2 : null
              break
            case 10:
              rr = data.raw?.rr_10d_bid && data.raw?.rr_10d_ask ? (data.raw.rr_10d_bid + data.raw.rr_10d_ask) / 2 : null
              bf = data.raw?.bf_10d_bid && data.raw?.bf_10d_ask ? (data.raw.bf_10d_bid + data.raw.bf_10d_ask) / 2 : null
              break
            case 15:
              rr = data.raw?.rr_15d_bid && data.raw?.rr_15d_ask ? (data.raw.rr_15d_bid + data.raw.rr_15d_ask) / 2 : null
              bf = data.raw?.bf_15d_bid && data.raw?.bf_15d_ask ? (data.raw.bf_15d_bid + data.raw.bf_15d_ask) / 2 : null
              break
            case 25:
              rr = data.raw?.rr_25d_bid && data.raw?.rr_25d_ask ? (data.raw.rr_25d_bid + data.raw.rr_25d_ask) / 2 : null
              bf = data.raw?.bf_25d_bid && data.raw?.bf_25d_ask ? (data.raw.bf_25d_bid + data.raw.bf_25d_ask) / 2 : null
              break
            case 35:
              rr = data.raw?.rr_35d_bid && data.raw?.rr_35d_ask ? (data.raw.rr_35d_bid + data.raw.rr_35d_ask) / 2 : null
              bf = data.raw?.bf_35d_bid && data.raw?.bf_35d_ask ? (data.raw.bf_35d_bid + data.raw.bf_35d_ask) / 2 : null
              break
          }
          
          if (rr !== null && bf !== null) {
            // FX vol convention: Put vol = ATM - RR/2 + BF
            deltaVol = atmMid - rr/2 + bf
          } else {
            // Skip if no RR/BF data
            return
          }
        }
        
        // Validate and add point
        if (deltaVol > 0 && deltaVol < 100 && !isNaN(deltaVol)) {
          deltaPoints.push({
            tenor: data.tenor,
            vol: deltaVol,
            sortKey: TERM_STRUCTURE_TENORS.indexOf(data.tenor),
            timeYears: tenorToYears(data.tenor)
          })
        }
      })
      
      // Only add curves with sufficient data
      if (deltaPoints.length >= 3) {
        const sortedPoints = deltaPoints.sort((a, b) => a.sortKey - b.sortKey)
        allTermCurves.push({
          delta,
          label: delta === 50 ? 'ATM' : `${delta}Δ`,
          points: sortedPoints
        })
      }
    })
    
    console.log('Term Structure data:', { 
      curvesCount: allTermCurves.length,
      curves: allTermCurves.map(c => ({ delta: c.delta, label: c.label, pointsCount: c.points.length }))
    })

    if (allTermCurves.length === 0) {
      console.warn('No delta curves available for term structure')
      // Show helpful message when no deltas selected
      d3.select(termChartRef.current)
        .append("div")
        .style("position", "absolute")
        .style("top", "50%")
        .style("left", "50%")
        .style("transform", "translate(-50%, -50%)")
        .style("color", currentTheme.textSecondary)
        .style("font-size", "12px")
        .style("text-align", "center")
        .html("Select delta buttons above to display term structure curves")
      return
    }

    // Skip the rendering indicator to avoid DOM manipulation issues
    // The indicator was causing removeChild errors when switching currency pairs

    const margin = { top: 20, right: 30, bottom: 50, left: 50 }
    const width = termChartRef.current.clientWidth - margin.left - margin.right
    const height = termChartRef.current.clientHeight - margin.top - margin.bottom
    
    console.log('Term Structure Chart dimensions:', { width, height })
    console.log('Term Structure Chart element:', {
      clientWidth: termChartRef.current.clientWidth,
      clientHeight: termChartRef.current.clientHeight,
      offsetWidth: termChartRef.current.offsetWidth,
      offsetHeight: termChartRef.current.offsetHeight
    })
    if (width <= 0 || height <= 0) {
      console.error('Invalid chart dimensions', { width, height })
      return
    }

    let svg, g
    try {
      svg = d3.select(termChartRef.current)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)

      g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)
    } catch (error) {
      console.error('Error creating term chart SVG:', error)
      return
    }

    // Get data extents from all curves
    const allPoints = allTermCurves.flatMap(c => c.points)
    const volExtent = d3.extent(allPoints, d => d.vol) as [number, number]
    const timeExtent = d3.extent(allPoints, d => d.timeYears) as [number, number]

    // Use LINEAR scale for realistic time spacing
    const xScale = d3.scaleLinear()
      .domain(timeExtent)
      .range([0, width])

    const yScale = d3.scaleLinear()
      .domain([Math.max(0, volExtent[0] - 0.5), volExtent[1] + 0.5])
      .range([height, 0])

    // Grid lines - Y-axis only
    g.selectAll(".grid-line-y")
      .data(yScale.ticks(4))
      .enter()
      .append("line")
      .attr("class", "grid-line-y")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", d => yScale(d))
      .attr("y2", d => yScale(d))
      .attr("stroke", currentTheme.border)
      .attr("stroke-width", 0.5)
      .attr("opacity", 0.2)

    // Custom x-axis with tenor labels at correct time positions
    const xAxis = g.append("g")
      .attr("transform", `translate(0,${height})`)
    
    // Draw axis line
    xAxis.append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("stroke", currentTheme.textSecondary)
    
    // Add tenor labels at correct time positions - only benchmark tenors
    const uniqueTenors = TERM_STRUCTURE_TENORS.filter(tenor => 
      allPoints.some(p => p.tenor === tenor)
    )
    
    xAxis.selectAll(".tick")
      .data(uniqueTenors)
      .enter()
      .append("g")
      .attr("class", "tick")
      .attr("transform", d => `translate(${xScale(tenorToYears(d))}, 0)`)
      .each(function(d) {
        const tick = d3.select(this)
        // Tick mark
        tick.append("line")
          .attr("y1", 0)
          .attr("y2", 6)
          .attr("stroke", currentTheme.textSecondary)
        // Label
        tick.append("text")
          .attr("y", 16)
          .attr("text-anchor", "middle")
          .style("font-size", "10px")
          .style("fill", currentTheme.textSecondary)
          .text(d)
      })

    g.append("g")
      .call(d3.axisLeft(yScale).tickFormat(d => `${d}%`))
      .style("color", currentTheme.textSecondary)

    // Line generator using time-based x position
    const line = d3.line<any>()
      .x(d => xScale(d.timeYears))
      .y(d => yScale(d.vol))
      .curve(d3.curveCatmullRom)

    // Color scale for different deltas using unified palette
    const deltaColorScale = d3.scaleOrdinal()
      .domain([5, 10, 15, 25, 35, 50])
      .range(UNIFIED_COLORS)
    
    const deltaColors = {
      5: deltaColorScale(5),
      10: deltaColorScale(10),
      15: deltaColorScale(15),
      25: deltaColorScale(25),
      35: deltaColorScale(35),
      50: deltaColorScale(50)
    }

    // Draw lines for each delta curve
    allTermCurves.forEach(curve => {
      const curveColor = deltaColors[curve.delta] || currentTheme.primary
      
      // Glow effect
      g.append("path")
        .datum(curve.points)
        .attr("fill", "none")
        .attr("stroke", curveColor)
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.2)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .style("filter", "blur(2px)")
        .attr("d", line)

      // Main line
      g.append("path")
        .datum(curve.points)
        .attr("fill", "none")
        .attr("stroke", curveColor)
        .attr("stroke-width", 1.8)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", line)
        .style("opacity", 0.9)

      // Add data points
      g.selectAll(`.point-${curve.delta}`)
        .data(curve.points)
        .enter()
        .append("circle")
        .attr("class", `point-${curve.delta}`)
        .attr("cx", d => xScale(d.timeYears))
        .attr("cy", d => yScale(d.vol))
        .attr("r", 3)
        .attr("fill", curveColor)
        .attr("stroke", currentTheme.background)
        .attr("stroke-width", 1.5)
        .style("opacity", 0.8)
    })
      
    // Add legend for deltas
    const legend = g.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - 80}, 10)`)

    allTermCurves.forEach((curve, index) => {
      const legendItem = legend.append("g")
        .attr("transform", `translate(0, ${index * 15})`)
        .style("cursor", "pointer")

      legendItem.append("line")
        .attr("x1", 0)
        .attr("x2", 15)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", deltaColors[curve.delta] || currentTheme.primary)
        .attr("stroke-width", 1.8)

      legendItem.append("text")
        .attr("x", 20)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .style("font-size", "10px")
        .style("fill", currentTheme.textSecondary)
        .style("font-weight", curve.delta === 50 ? "600" : "normal")
        .text(curve.label)
    })

    // Add hover interactions to all points (use React state for tooltips)
    allTermCurves.forEach(curve => {
      g.selectAll(`.point-${curve.delta}`)
        .on("mouseover", function(event, d: any) {
        // Highlight the point
        d3.select(this)
          .transition()
          .duration(100)
          .attr("r", 6)
          
        const days = Math.round(d.timeYears * 365)
        const curveColor = deltaColors[curve.delta] || currentTheme.primary
        
        // Use React state for tooltip content
        const rect = termChartRef.current?.getBoundingClientRect()
        if (rect) {
          setTermTooltip({
            visible: true,
            x: event.clientX - rect.left + 15,
            y: event.clientY - rect.top - 40,
            content: (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 6, color: curveColor }}>
                  {curve.label} Volatility
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
                  <span style={{ color: currentTheme.textSecondary }}>Tenor:</span>
                  <span style={{ fontWeight: 500 }}>{d.tenor}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
                  <span style={{ color: currentTheme.textSecondary }}>Volatility:</span>
                  <span style={{ fontWeight: 500 }}>{d.vol.toFixed(3)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 4, paddingTop: 4, borderTop: `1px solid ${currentTheme.border}` }}>
                  <span style={{ color: currentTheme.textSecondary, fontSize: 10 }}>Time:</span>
                  <span style={{ fontSize: 10 }}>{days} days</span>
                </div>
              </div>
            )
          })
        }
      })
      .on("mouseout", function() {
        // Reset point size
        d3.select(this)
          .transition()
          .duration(100)
          .attr("r", 3)
          
        // Hide tooltip using React state
        setTermTooltip(null)
      })
    })

    // Axis labels
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "11px")
      .style("fill", currentTheme.textSecondary)
      .text("Implied Volatility (%)")

    g.append("text")
      .attr("transform", `translate(${width/2}, ${height + margin.bottom - 5})`)
      .style("text-anchor", "middle")
      .style("font-size", "11px")
      .style("fill", currentTheme.textSecondary)
      .text("Tenor")

  }, [surfaceData, currentTheme, visibleDeltasForTerm])

  // D3.js Volatility Smile Visualization - Multiple Tenor Curves
  const drawSmileChart = useCallback(() => {
    if (!smileChartRef.current) return
    
    // Safely clear previous chart by removing children directly
    try {
      if (smileChartRef.current) {
        // Remove all child nodes safely
        while (smileChartRef.current.firstChild) {
          smileChartRef.current.firstChild.remove()
        }
      }
    } catch (error) {
      console.warn('Error clearing smile chart:', error)
    }
    
    if (!surfaceData.length) return

    // Get all smile curves for selected tenors
    const allSmileCurves: Array<{tenor: string, points: Array<{delta: number, vol: number, label: string, tenor: string}>}> = []
    
    console.log('Drawing smile curves for visible tenors:', Array.from(visibleTenorsForSmile))
    
    visibleTenorsForSmile.forEach(tenor => {
      // Find data by matching tenor name, not by index
      const data = surfaceData.find(d => d.tenor === tenor)
      if (!data) {
        console.warn(`No data found for tenor ${tenor}`)
        return
      }

      const atmMid = data.raw?.atm_bid && data.raw?.atm_ask ? (data.raw.atm_bid + data.raw.atm_ask) / 2 : null
      if (!atmMid) return

      const smilePoints = []
      
      // All available delta points from Bloomberg data
      const deltaData = [
        { delta: 5, rrBid: data.raw?.rr_5d_bid, rrAsk: data.raw?.rr_5d_ask, bfBid: data.raw?.bf_5d_bid, bfAsk: data.raw?.bf_5d_ask },
        { delta: 10, rrBid: data.raw?.rr_10d_bid, rrAsk: data.raw?.rr_10d_ask, bfBid: data.raw?.bf_10d_bid, bfAsk: data.raw?.bf_10d_ask },
        { delta: 15, rrBid: data.raw?.rr_15d_bid, rrAsk: data.raw?.rr_15d_ask, bfBid: data.raw?.bf_15d_bid, bfAsk: data.raw?.bf_15d_ask },
        { delta: 25, rrBid: data.raw?.rr_25d_bid, rrAsk: data.raw?.rr_25d_ask, bfBid: data.raw?.bf_25d_bid, bfAsk: data.raw?.bf_25d_ask },
        { delta: 35, rrBid: data.raw?.rr_35d_bid, rrAsk: data.raw?.rr_35d_ask, bfBid: data.raw?.bf_35d_bid, bfAsk: data.raw?.bf_35d_ask }
      ]

      deltaData.forEach(({ delta, rrBid, rrAsk, bfBid, bfAsk }) => {
        if (rrBid !== null && rrAsk !== null && bfBid !== null && bfAsk !== null) {
          const rrMid = (rrBid + rrAsk) / 2
          const bfMid = (bfBid + bfAsk) / 2
          
          // FX smile construction: Put Vol = ATM - RR/2 + BF, Call Vol = ATM + RR/2 + BF
          const putVol = atmMid - rrMid/2 + bfMid
          const callVol = atmMid + rrMid/2 + bfMid
          
          // Add put and call points
          smilePoints.push(
            { delta: delta, vol: putVol, label: `${delta}ΔP`, tenor },
            { delta: 100 - delta, vol: callVol, label: `${delta}ΔC`, tenor }
          )
        }
      })
      
      // ATM point
      smilePoints.push({ delta: 50, vol: atmMid, label: 'ATM', tenor })
      
      if (smilePoints.length > 0) {
        allSmileCurves.push({
          tenor,
          points: smilePoints.sort((a, b) => a.delta - b.delta)
        })
      }
    })

    if (allSmileCurves.length === 0) {
      // Show message when no tenors selected
      try {
        d3.select(smileChartRef.current)
          .append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("justify-content", "center")
        .style("height", "100%")
        .style("color", currentTheme.textSecondary)
        .style("font-size", "12px")
        .style("text-align", "center")
        .html("Select tenor buttons above to display volatility smile curves")
      } catch (error) {
        console.warn('Error showing smile message:', error)
      }
      return
    }

    const margin = { top: 20, right: 30, bottom: 40, left: 50 }
    const width = smileChartRef.current.clientWidth - margin.left - margin.right
    const height = smileChartRef.current.clientHeight - margin.top - margin.bottom

    // Validate dimensions
    if (width <= 0 || height <= 0) {
      console.warn('Invalid smile chart dimensions:', { width, height })
      return
    }

    let svg, g
    try {
      svg = d3.select(smileChartRef.current)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)

      g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)
    } catch (error) {
      console.error('Error creating smile chart SVG:', error)
      return
    }

    // Scales - fix overlapping by using proper delta range and fixed volatility range
    const xScale = d3.scaleLinear()
      .domain([5, 95]) // Full delta range from 5 to 95
      .range([0, width])

    // Fixed Y-axis range for better comparison across smiles
    const allSmilePoints = allSmileCurves.flatMap(curve => curve.points)
    const volExtent = d3.extent(allSmilePoints, d => d.vol) as [number, number]
    const yScale = d3.scaleLinear()
      .domain([Math.max(0, volExtent[0] - 0.5), volExtent[1] + 0.5]) // Add padding but start reasonable
      .range([height, 0])

    // Color scale for different tenors using unified palette
    const colorScale = d3.scaleOrdinal()
      .domain(allSmileCurves.map(c => c.tenor))
      .range(UNIFIED_COLORS)

    // Minimal grid lines - only Y-axis
    g.selectAll(".grid-line-y")
      .data(yScale.ticks(3))
      .enter()
      .append("line")
      .attr("class", "grid-line-y")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", d => yScale(d))
      .attr("y2", d => yScale(d))
      .attr("stroke", currentTheme.border)
      .attr("stroke-width", 0.5)
      .attr("opacity", 0.2)

    // X-axis (no labels, we'll add custom ones below)
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickSize(0).tickFormat(() => ""))
      .style("color", currentTheme.textSecondary)

    g.append("g")
      .call(d3.axisLeft(yScale).tickFormat(d => `${d}%`))
      .style("color", currentTheme.textSecondary)

    // Line generator
    const line = d3.line<any>()
      .x(d => xScale(d.delta))
      .y(d => yScale(d.vol))
      .curve(d3.curveCatmullRom.alpha(0.5))

    // Draw each tenor curve
    allSmileCurves.forEach((curve) => {
      const curveColor = colorScale(curve.tenor) as string
      const sortedPoints = curve.points.sort((a: any, b: any) => a.delta - b.delta)
      
      // Enhanced glow effect
      g.append("path")
        .datum(sortedPoints)
        .attr("fill", "none")
        .attr("stroke", curveColor)
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.2)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .style("filter", "blur(3px)")
        .attr("d", line)

      // Main line with stronger presence
      g.append("path")
        .datum(sortedPoints)
        .attr("fill", "none")
        .attr("stroke", curveColor)
        .attr("stroke-width", 1.2)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", line)
        .style("filter", "drop-shadow(0 1px 2px rgba(0,0,0,0.15))")

      // Invisible overlay for mouse interaction on smile curve (use React state for tooltips)
      g.append("path")
        .datum(sortedPoints)
        .attr("fill", "none")
        .attr("stroke", "transparent")
        .attr("stroke-width", 20)
        .attr("d", line)
        .style("cursor", "crosshair")
        .on("mousemove", function(event) {
          const [mouseX] = d3.pointer(event)
          const deltaValue = xScale.invert(mouseX)
          
          // Find closest data point
          let closestPoint = sortedPoints[0]
          let minDist = Math.abs(closestPoint.delta - deltaValue)
          
          sortedPoints.forEach((p: any) => {
            const dist = Math.abs(p.delta - deltaValue)
            if (dist < minDist) {
              minDist = dist
              closestPoint = p
            }
          })
          
          // Use React state for tooltip content
          const rect = smileChartRef.current?.getBoundingClientRect()
          if (rect) {
            setSmileTooltip({
              visible: true,
              x: event.clientX - rect.left + 15,
              y: event.clientY - rect.top - 40,
              content: (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: curveColor }}>
                    {curve.tenor} Smile
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
                    <span style={{ color: currentTheme.textSecondary }}>Strike:</span>
                    <span style={{ fontWeight: 500 }}>{closestPoint.label}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
                    <span style={{ color: currentTheme.textSecondary }}>Volatility:</span>
                    <span style={{ fontWeight: 500 }}>{closestPoint.vol.toFixed(3)}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 4, paddingTop: 4, borderTop: `1px solid ${currentTheme.border}` }}>
                    <span style={{ color: currentTheme.textSecondary, fontSize: 10 }}>Delta:</span>
                    <span style={{ fontSize: 10 }}>{closestPoint.delta}Δ</span>
                  </div>
                </div>
              )
            })
          }
        })
        .on("mouseout", function() {
          // Hide tooltip using React state
          setSmileTooltip(null)
        })
    })

    // Legend for tenors
    const legend = g.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(10, 10)`)

    allSmileCurves.forEach((curve, index) => {
      const legendItem = legend.append("g")
        .attr("transform", `translate(0, ${index * 15})`)

      legendItem.append("line")
        .attr("x1", 0)
        .attr("x2", 15)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", colorScale(curve.tenor) as string)
        .attr("stroke-width", 1.2)

      legendItem.append("text")
        .attr("x", 20)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .style("font-size", "9px")
        .style("fill", currentTheme.textSecondary)
        .text(curve.tenor)
    })

    // Show all available delta points
    const availableDeltas = [...new Set(allSmilePoints.map(p => p.delta))].sort((a, b) => a - b)
    
    // Use real spot rates from Bloomberg or show warning
    const getSpotRate = (pair: string) => {
      // First check if we have real Bloomberg spot rates
      if (spotRates[pair]) {
        return spotRates[pair]
      }
      
      // If no real rate available, return null to indicate missing data
      console.warn(`No Bloomberg spot rate available for ${pair}`)
      return null
    }
    const spotRate = getSpotRate(selectedPair)
    
    // Calculate strikes using simplified Black-Scholes delta-to-strike conversion
    const calculateStrike = (delta: number, vol: number) => {
      // If no spot rate available, return null
      if (!spotRate) return null
      
      // Use the existing tenorToYears function
      const timeToExpiry = tenorToYears(selectedTenor)
      
      // Simplified strike calculation: K = F * exp(-N^(-1)(delta) * vol * sqrt(T))
      // Where N^(-1) is inverse normal CDF
      if (delta === 50) return spotRate // ATM
      
      // Rough approximation of inverse normal CDF for common deltas
      const invNorm = delta < 50 
        ? (delta === 5 ? -1.645 : delta === 10 ? -1.282 : delta === 15 ? -1.036 : delta === 25 ? -0.674 : delta === 35 ? -0.385 : -0.674)
        : (delta === 65 ? 0.385 : delta === 75 ? 0.674 : delta === 85 ? 1.036 : delta === 90 ? 1.282 : delta === 95 ? 1.645 : 0.674)
      
      return spotRate * Math.exp(-invNorm * (vol/100) * Math.sqrt(timeToExpiry))
    }
    
    const deltaLabels = availableDeltas.map(delta => {
      const point = allSmilePoints.find(p => p.delta === delta)
      const strike = point ? calculateStrike(delta, point.vol) : spotRate
      
      return {
        delta,
        strike,
        label: delta === 50 ? 'ATM' : delta < 50 ? `${delta}ΔP` : `${100-delta}ΔC`,
        strikeLabel: strike ? strike.toFixed(4) : 'N/A',
        color: delta === 50 ? currentTheme.primary : currentTheme.textSecondary
      }
    })

    const deltaLabelGroups = g.selectAll(".delta-label-group")
      .data(deltaLabels)
      .enter()
      .append("g")
      .attr("class", "delta-label-group")
      .attr("transform", (d: any) => `translate(${xScale(d.delta)}, 0)`)
    
    // Delta labels (top line)
    deltaLabelGroups
      .append("text")
      .attr("class", "delta-label")
      .attr("x", 0)
      .attr("y", height + 15)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("font-weight", (d: any) => d.delta === 50 ? "700" : "500")
      .style("fill", (d: any) => d.color)
      .text((d: any) => d.label)
    
    // Strike labels (bottom line)
    deltaLabelGroups
      .append("text")
      .attr("class", "strike-label")
      .attr("x", 0)
      .attr("y", height + 28)
      .attr("text-anchor", "middle")
      .style("font-size", "9px")
      .style("font-weight", "400")
      .style("fill", currentTheme.textSecondary)
      .style("opacity", 0.8)
      .text((d: any) => d.strikeLabel)

    // Axis labels
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", currentTheme.textSecondary)
      .text("Implied Volatility (%)")

    g.append("text")
      .attr("transform", `translate(${width/2}, ${height + margin.bottom})`)
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", currentTheme.textSecondary)
      .text("Delta")

    // Add status about strike prices
    if (!spotRate) {
      g.append("text")
        .attr("transform", `translate(${width - 10}, 10)`)
        .style("text-anchor", "end")
        .style("font-size", "10px")
        .style("fill", currentTheme.danger || '#f44336')
        .style("font-style", "italic")
        .text("⚠️ No Bloomberg spot rate available")
    }

  }, [surfaceData, selectedTenor, currentTheme, visibleTenorsForSmile, visibleDeltasForTerm, selectedPair, spotRates])


  useEffect(() => {
    console.log('🎯 Chart render useEffect triggered:', { 
      surfaceDataLength: surfaceData.length, 
      loading,
      shouldRender: surfaceData.length > 0 && !loading 
    })
    if (surfaceData.length > 0 && !loading && smileChartRef.current && termChartRef.current) {
      // Add a small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        try {
          // Double-check refs are still valid before drawing
          if (smileChartRef.current && termChartRef.current) {
            console.log('⏰ Drawing charts after 100ms delay')
            drawSmileChart()
            drawTermStructureChart()
          }
        } catch (error) {
          console.warn('Chart drawing failed (safe to ignore):', error)
        }
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [surfaceData, selectedTenor, currentTheme, visibleTenorsForSmile, visibleDeltasForTerm, drawSmileChart, drawTermStructureChart, selectedPair, loading])

  return (
    <div style={{
      backgroundColor: currentTheme.surface,
      borderRadius: '8px',
      border: `1px solid ${currentTheme.border}`,
      overflow: 'hidden',
      height: '100%'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: `1px solid ${currentTheme.border}`,
        display: 'flex',
        gap: '16px',
        alignItems: 'center'
      }}>
        <div>
          <label style={{ fontSize: '12px', color: currentTheme.textSecondary, marginRight: '8px' }}>
            Currency Pair:
          </label>
          <select
            value={selectedPair}
            onChange={(e) => {
              setSelectedPair(e.target.value)
              fetchSpotRates() // Refresh spot rates when pair changes
            }}
            style={{
              backgroundColor: currentTheme.background,
              color: currentTheme.text,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '12px'
            }}
          >
            {currencyPairs.map(pair => (
              <option key={pair} value={pair}>{pair}</option>
            ))}
          </select>
        </div>
        
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            backgroundColor: currentTheme.primary,
            color: currentTheme.background,
            border: 'none',
            borderRadius: '4px',
            padding: '6px 12px',
            fontSize: '12px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
        
        
        <div style={{ 
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '11px',
          color: currentTheme.textSecondary 
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>Data Quality:</span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: getQualityColor(dataQualityScore) + '20',
              border: `1px solid ${getQualityColor(dataQualityScore)}40`
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: getQualityColor(dataQualityScore)
              }} />
              <span style={{ 
                color: getQualityColor(dataQualityScore),
                fontWeight: '600'
              }}>
                {dataQualityScore}%
              </span>
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>Updated:</span>
            <span style={{ fontWeight: '500' }}>
              {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <ErrorRetryBanner 
          error={error}
          onRetry={fetchData}
          retrying={loading}
        />
      )}

      {/* Layout with full right side for 3D surface */}
      <div style={{
        display: 'flex',
        gap: '2px',
        backgroundColor: currentTheme.border,
        height: 'calc(100% - 80px)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        
        {/* Left Column: Smile and Term Structure */}
        <div style={{
          flex: '1 1 50%',
          minWidth: '300px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          overflow: 'hidden'
        }}>
        
          {/* Volatility Smile Section */}
          <div style={{
            flex: '1',
            backgroundColor: currentTheme.background,
            padding: '12px',
            display: 'flex',
            flexDirection: 'column'
          }}>
          <h3 style={{ 
            fontSize: '13px', 
            fontWeight: '600', 
            margin: '0 0 8px 0',
            color: currentTheme.text,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Volatility Smile - {selectedPair}</span>
          </h3>
          
          {/* Tenor selection buttons */}
          <div style={{
            display: 'flex',
            gap: '2px',
            marginBottom: '8px',
            flexWrap: 'wrap'
          }}>
            {STANDARD_TENORS.slice(0, 6).map(tenor => (
              <button
                key={tenor}
                onClick={() => {
                  const newVisibleTenors = new Set(visibleTenorsForSmile)
                  if (newVisibleTenors.has(tenor)) {
                    newVisibleTenors.delete(tenor)
                  } else {
                    newVisibleTenors.add(tenor)
                  }
                  setVisibleTenorsForSmile(newVisibleTenors)
                }}
                style={{
                  fontSize: '9px',
                  padding: '2px 6px',
                  backgroundColor: visibleTenorsForSmile.has(tenor) ? currentTheme.primary : currentTheme.surface,
                  color: visibleTenorsForSmile.has(tenor) ? currentTheme.background : currentTheme.textSecondary,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '3px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {tenor}
              </button>
            ))}
          </div>
          
          <div style={{ 
            flex: 1,
            minHeight: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${currentTheme.border}20`,
            borderRadius: '4px',
            backgroundColor: currentTheme.surface + '30',
            position: 'relative'
          }}>
            <div ref={smileChartRef} style={{ width: '100%', height: '100%' }}>
              {(loading || surfaceData.length === 0) && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%',
                  color: currentTheme.textSecondary,
                  fontSize: '11px'
                }}>
                  Loading smile data...
                </div>
              )}
            </div>
            {/* React-managed tooltip for smile chart */}
            {smileTooltip && smileTooltip.visible && (
              <div style={{
                position: 'absolute',
                left: smileTooltip.x,
                top: smileTooltip.y,
                background: currentTheme.surface,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '6px',
                padding: '10px',
                fontSize: '11px',
                color: currentTheme.text,
                pointerEvents: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                backdropFilter: 'blur(10px)',
                zIndex: 9999
              }}>
                {smileTooltip.content}
              </div>
            )}
          </div>
          </div>
          
          {/* Term Structure Section */}
          <div style={{
            flex: '1',
            backgroundColor: currentTheme.background,
            padding: '12px',
            display: 'flex',
            flexDirection: 'column'
          }}>
          <h3 style={{ 
            fontSize: '13px', 
            fontWeight: '600', 
            margin: '0 0 8px 0',
            color: currentTheme.text 
          }}>
            Term Structure - {selectedPair}
          </h3>
          
          {/* Delta selection buttons */}
          <div style={{
            display: 'flex',
            gap: '2px',
            marginBottom: '8px',
            flexWrap: 'wrap'
          }}>
            {[5, 10, 15, 25, 35, 50].map(delta => (
              <button
                key={delta}
                onClick={() => {
                  const newVisibleDeltas = new Set(visibleDeltasForTerm)
                  if (newVisibleDeltas.has(delta)) {
                    newVisibleDeltas.delete(delta)
                  } else {
                    newVisibleDeltas.add(delta)
                  }
                  setVisibleDeltasForTerm(newVisibleDeltas)
                }}
                style={{
                  fontSize: '9px',
                  padding: '2px 6px',
                  backgroundColor: visibleDeltasForTerm.has(delta) ? currentTheme.primary : currentTheme.surface,
                  color: visibleDeltasForTerm.has(delta) ? currentTheme.background : currentTheme.textSecondary,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '3px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {delta === 50 ? 'ATM' : `${delta}Δ`}
              </button>
            ))}
          </div>
          
          <div style={{ 
            flex: 1,
            minHeight: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${currentTheme.border}20`,
            borderRadius: '4px',
            backgroundColor: currentTheme.surface + '30',
            position: 'relative'
          }}>
            <div ref={termChartRef} style={{ width: '100%', height: '100%' }}>
              {(loading || surfaceData.length === 0) && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%',
                  color: currentTheme.textSecondary,
                  fontSize: '11px'
                }}>
                  Loading term structure...
                </div>
              )}
            </div>
            {/* React-managed tooltip for term chart */}
            {termTooltip && termTooltip.visible && (
              <div style={{
                position: 'absolute',
                left: termTooltip.x,
                top: termTooltip.y,
                background: currentTheme.surface,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '6px',
                padding: '10px',
                fontSize: '11px',
                color: currentTheme.text,
                pointerEvents: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                backdropFilter: 'blur(10px)',
                zIndex: 9999
              }}>
                {termTooltip.content}
              </div>
            )}
          </div>
          </div>
        </div>
        
        {/* Right Column: Full height 3D Surface */}
        <div style={{
          flex: '1 1 50%',
          minWidth: '400px',
          backgroundColor: currentTheme.background,
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <h3 style={{ 
            fontSize: '13px', 
            fontWeight: '600', 
            margin: '0 0 8px 0',
            color: currentTheme.text 
          }}>
            3D Volatility Surface - {selectedPair}
          </h3>
          
          <div style={{ 
            flex: 1,
            minHeight: '0',
            border: `1px solid ${currentTheme.border}20`,
            borderRadius: '4px',
            backgroundColor: currentTheme.surface + '30',
            display: 'flex',
            alignItems: (loading || surfaceData.length === 0) ? 'center' : 'stretch',
            justifyContent: (loading || surfaceData.length === 0) ? 'center' : 'stretch',
            color: currentTheme.textSecondary,
            fontSize: '12px',
            overflow: 'hidden'
          }}>
            {loading ? (
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '11px', display: 'block' }}>Loading 3D surface...</span>
                {loadingProgress && (
                  <span style={{ fontSize: '10px', display: 'block', marginTop: '4px', color: currentTheme.primary }}>
                    {loadingProgress}
                  </span>
                )}
              </div>
            ) : surfaceData.length === 0 ? (
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '11px', display: 'block' }}>No data available</span>
              </div>
            ) : (
              <PlotlyVolatilitySurface surfaceData={surfaceData} selectedPair={selectedPair} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}