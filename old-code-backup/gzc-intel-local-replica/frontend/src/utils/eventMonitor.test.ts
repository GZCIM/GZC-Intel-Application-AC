import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EventMonitor } from './eventMonitor'

describe('EventMonitor', () => {
  let monitor: EventMonitor

  beforeEach(() => {
    monitor = new EventMonitor()
    monitor.clear()
  })

  it('should initialize without starting in test environment', () => {
    expect(monitor).toBeDefined()
    // In test env, it shouldn't auto-start
    const report = monitor.getReport()
    expect(report).toHaveLength(0)
  })

  it('should detect click and drag conflicts', () => {
    monitor.start()
    
    const element = document.createElement('div')
    element.id = 'test-element'
    document.body.appendChild(element)

    // Simulate conflicting events
    const clickEvent = new MouseEvent('click', { bubbles: true })
    const dragEvent = new DragEvent('dragstart', { bubbles: true })

    element.dispatchEvent(clickEvent)
    element.dispatchEvent(dragEvent)

    const report = monitor.getReport()
    
    // Should have detected a conflict
    expect(report.length).toBeGreaterThan(0)
    expect(report[0].conflictTypes).toContain('click')
    expect(report[0].conflictTypes).toContain('dragstart')
    expect(report[0].severity).toBe('high')

    document.body.removeChild(element)
  })

  it('should calculate severity correctly', () => {
    monitor.start()
    
    const element = document.createElement('div')
    document.body.appendChild(element)

    // Test high severity (click + dragstart)
    element.dispatchEvent(new MouseEvent('click'))
    element.dispatchEvent(new DragEvent('dragstart'))
    
    let report = monitor.getReport()
    expect(report[0]?.severity).toBe('high')

    monitor.clear()

    // Test medium severity (mousedown + touchstart)
    element.dispatchEvent(new MouseEvent('mousedown'))
    element.dispatchEvent(new TouchEvent('touchstart'))
    
    report = monitor.getReport()
    expect(report[0]?.severity).toBe('medium')

    document.body.removeChild(element)
  })

  it('should provide element identifiers', () => {
    monitor.start()
    
    const element = document.createElement('div')
    element.id = 'test-id'
    element.className = 'test-class another-class'
    document.body.appendChild(element)

    element.dispatchEvent(new MouseEvent('click'))
    element.dispatchEvent(new MouseEvent('mousedown'))

    const report = monitor.getReport()
    expect(report[0]?.element).toContain('#test-id')
    expect(report[0]?.element).toContain('.test-class')
    expect(report[0]?.element).toContain('div')

    document.body.removeChild(element)
  })

  it('should clear conflicts', () => {
    monitor.start()
    
    const element = document.createElement('div')
    document.body.appendChild(element)

    element.dispatchEvent(new MouseEvent('click'))
    element.dispatchEvent(new DragEvent('dragstart'))

    let report = monitor.getReport()
    expect(report.length).toBeGreaterThan(0)

    monitor.clear()
    report = monitor.getReport()
    expect(report).toHaveLength(0)

    document.body.removeChild(element)
  })

  it('should stop monitoring when stopped', () => {
    monitor.start()
    monitor.stop()

    const element = document.createElement('div')
    document.body.appendChild(element)

    element.dispatchEvent(new MouseEvent('click'))
    element.dispatchEvent(new DragEvent('dragstart'))

    const report = monitor.getReport()
    expect(report).toHaveLength(0)

    document.body.removeChild(element)
  })
})