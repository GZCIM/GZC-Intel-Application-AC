import React, { useState, useEffect } from 'react'

interface FeatherIconProps {
  name: string
  size?: number
  className?: string
  color?: string
  style?: React.CSSProperties
}

export function FeatherIcon({ name, size = 16, className = '', color = 'currentColor', style }: FeatherIconProps) {
  const [svgContent, setSvgContent] = useState<string>('')
  
  useEffect(() => {
    fetch(`/feather/${name}.svg`)
      .then(response => {
        if (!response.ok) {
          console.warn(`Feather icon not found: ${name}`)
          return ''
        }
        return response.text()
      })
      .then(svg => {
        // Replace width, height, and stroke color
        const modifiedSvg = svg
          .replace(/width="[^"]*"/, `width="${size}"`)
          .replace(/height="[^"]*"/, `height="${size}"`)
          .replace(/stroke="[^"]*"/g, `stroke="${color}"`)
        setSvgContent(modifiedSvg)
      })
      .catch(error => {
        console.error(`Error loading Feather icon: ${name}`, error)
      })
  }, [name, size, color])
  
  if (!svgContent) {
    return <div className={`inline-block ${className}`} style={{ width: size, height: size }} />
  }
  
  return (
    <div 
      className={`inline-flex items-center justify-center ${className}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  )
}

// Common icon mappings for easier migration
export const Icons = {
  // Navigation
  Menu: () => <FeatherIcon name="menu" />,
  X: () => <FeatherIcon name="x" />,
  Plus: () => <FeatherIcon name="plus" />,
  ChevronDown: () => <FeatherIcon name="chevron-down" />,
  ChevronRight: () => <FeatherIcon name="chevron-right" />,
  
  // Actions
  Save: () => <FeatherIcon name="save" />,
  Edit: () => <FeatherIcon name="edit" />,
  Edit2: () => <FeatherIcon name="edit-2" />,
  Edit3: () => <FeatherIcon name="edit-3" />,
  Copy: () => <FeatherIcon name="copy" />,
  Trash: () => <FeatherIcon name="trash" />,
  Trash2: () => <FeatherIcon name="trash-2" />,
  Download: () => <FeatherIcon name="download" />,
  Upload: () => <FeatherIcon name="upload" />,
  Share: () => <FeatherIcon name="share" />,
  
  // UI Elements
  Settings: () => <FeatherIcon name="settings" />,
  Layout: () => <FeatherIcon name="layout" />,
  Grid: () => <FeatherIcon name="grid" />,
  Layers: () => <FeatherIcon name="layers" />,
  Component: () => <FeatherIcon name="box" />,
  
  // Communication
  User: () => <FeatherIcon name="user" />,
  Users: () => <FeatherIcon name="users" />,
  Mail: () => <FeatherIcon name="mail" />,
  MessageCircle: () => <FeatherIcon name="message-circle" />,
  
  // Status
  Check: () => <FeatherIcon name="check" />,
  CheckCircle: () => <FeatherIcon name="check-circle" />,
  XCircle: () => <FeatherIcon name="x-circle" />,
  AlertCircle: () => <FeatherIcon name="alert-circle" />,
  AlertTriangle: () => <FeatherIcon name="alert-triangle" />,
  Info: () => <FeatherIcon name="info" />,
  
  // Data
  Database: () => <FeatherIcon name="database" />,
  Server: () => <FeatherIcon name="server" />,
  HardDrive: () => <FeatherIcon name="hard-drive" />,
  Cloud: () => <FeatherIcon name="cloud" />,
  
  // Files
  File: () => <FeatherIcon name="file" />,
  FileText: () => <FeatherIcon name="file-text" />,
  Folder: () => <FeatherIcon name="folder" />,
  
  // Other
  Search: () => <FeatherIcon name="search" />,
  Filter: () => <FeatherIcon name="filter" />,
  RefreshCw: () => <FeatherIcon name="refresh-cw" />,
  ExternalLink: () => <FeatherIcon name="external-link" />,
  Link: () => <FeatherIcon name="link" />,
  Globe: () => <FeatherIcon name="globe" />,
  Container: () => <FeatherIcon name="package" />,
}