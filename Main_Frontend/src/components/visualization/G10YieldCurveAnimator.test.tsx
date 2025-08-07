import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { G10YieldCurveAnimator } from './G10YieldCurveAnimator'

describe('G10YieldCurveAnimator', () => {
  it('should render without errors', () => {
    render(<G10YieldCurveAnimator />)
    expect(screen.getByText('G10 Yield Curve Animator')).toBeInTheDocument()
  })

  it('should show play button', () => {
    render(<G10YieldCurveAnimator />)
    expect(screen.getByText('Play')).toBeInTheDocument()
  })

  it('should display all G10 currencies in legend', () => {
    const { container } = render(<G10YieldCurveAnimator />)
    const currencies = ['USD', 'EUR', 'JPY', 'GBP', 'CHF', 'CAD', 'AUD', 'NZD', 'SEK', 'NOK']
    
    currencies.forEach(currency => {
      expect(container.textContent).toContain(currency)
    })
  })
})