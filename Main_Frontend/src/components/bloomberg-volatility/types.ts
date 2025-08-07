export interface VolatilityData {
  delta: number
  tenor: string
  volatility: number
  timestamp: string
}

export interface ValidatedVolatilityData extends VolatilityData {
  isValid: boolean
  validationErrors?: string[]
}

export interface VolatilitySurfaceData {
  pair: string
  data: ValidatedVolatilityData[]
  timestamp: string
}

export interface VolatilitySurfaceError {
  message: string
  code?: string
  details?: any
}