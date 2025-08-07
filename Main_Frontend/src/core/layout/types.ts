export interface GridItem {
  id: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
  static?: boolean
  isDraggable?: boolean
  isResizable?: boolean
  component: string
  props?: Record<string, any>
  title?: string
  config?: WidgetConfig
}

export interface WidgetConfig {
  refreshInterval?: number
  autoRefresh?: boolean
  showHeader?: boolean
  showBorder?: boolean
  allowFullscreen?: boolean
  customCSS?: string
  permissions?: string[]
}

export interface GridLayout {
  id: string
  name: string
  description?: string
  items: GridItem[]
  breakpoints: GridBreakpoints
  cols: GridColumns
  rowHeight: number
  margin: [number, number]
  containerPadding: [number, number]
  compactType: 'vertical' | 'horizontal' | null
  preventCollision: boolean
  isDraggable: boolean
  isResizable: boolean
  useCSSTransforms: boolean
  createdAt: Date
  updatedAt: Date
  isDefault?: boolean
  category?: string
  tags?: string[]
}

export interface GridBreakpoints {
  xxl: number
  xl: number
  lg: number
  md: number
  sm: number
  xs: number
}

export interface GridColumns {
  xxl: number
  xl: number
  lg: number
  md: number
  sm: number
  xs: number
}

export interface GridState {
  layouts: Map<string, GridLayout>
  currentLayout: string
  breakpoint: string
  isDragging: boolean
  isResizing: boolean
  editMode: boolean
  previewMode: boolean
}

export interface GridContextValue {
  state: GridState
  currentLayout: GridLayout | null
  setLayout: (layoutId: string) => void
  createLayout: (layout: Omit<GridLayout, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateLayout: (layoutId: string, updates: Partial<GridLayout>) => void
  deleteLayout: (layoutId: string) => void
  duplicateLayout: (layoutId: string, newName: string) => string
  addItem: (item: Omit<GridItem, 'id'>) => void
  updateItem: (itemId: string, updates: Partial<GridItem>) => void
  removeItem: (itemId: string) => void
  moveItem: (itemId: string, x: number, y: number) => void
  resizeItem: (itemId: string, w: number, h: number) => void
  toggleEditMode: () => void
  togglePreviewMode: () => void
  saveLayout: (layoutId: string) => void
  loadLayout: (layoutId: string) => void
  exportLayout: (layoutId: string) => string
  importLayout: (layoutData: string) => string
  resetLayout: (layoutId: string) => void
  getAvailableLayouts: () => GridLayout[]
  getLayoutsByCategory: (category: string) => GridLayout[]
}

export interface GridItemProps {
  item: GridItem
  isDragging: boolean
  isResizing: boolean
  editMode: boolean
  onUpdate: (updates: Partial<GridItem>) => void
  onRemove: () => void
}

export interface GridToolbarProps {
  onAddWidget: () => void
  onSaveLayout: () => void
  onLoadLayout: () => void
  onResetLayout: () => void
  onToggleEditMode: () => void
  onTogglePreviewMode: () => void
  editMode: boolean
  previewMode: boolean
}