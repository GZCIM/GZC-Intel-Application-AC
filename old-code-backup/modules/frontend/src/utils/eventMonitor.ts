interface EventConflict {
  type: string;
  timestamp: number;
  propagation: number;
  target: string;
  preventDefault: boolean;
  stopPropagation: boolean;
}

interface ConflictReport {
  element: string;
  conflicts: EventConflict[];
  conflictTypes: string[];
  severity: 'low' | 'medium' | 'high';
}

export class EventMonitor {
  private conflicts: Map<EventTarget, EventConflict[]> = new Map();
  private dragEvents = ['dragstart', 'drag', 'dragend', 'dragover', 'drop'];
  private clickEvents = ['click', 'mousedown', 'mouseup', 'touchstart', 'touchend'];
  private enabled = false;

  constructor() {
    // Auto-start in development
    if (import.meta.env.DEV) {
      this.start();
    }
  }

  start() {
    if (this.enabled) return;
    this.enabled = true;
    this.setupMonitoring();
    console.log('🔍 Event Monitor Started - Watching for conflicts...');
  }

  stop() {
    this.enabled = false;
    this.conflicts.clear();
    console.log('🔍 Event Monitor Stopped');
  }

  private setupMonitoring() {
    const allEvents = [...this.dragEvents, ...this.clickEvents];
    
    allEvents.forEach(eventType => {
      // Capture phase to catch events early
      document.addEventListener(eventType, (e) => this.logEvent(e), { capture: true });
      // Bubble phase to see if propagation was stopped
      document.addEventListener(eventType, (e) => this.checkPropagation(e), { capture: false });
    });
  }

  private logEvent(event: Event) {
    if (!this.enabled) return;

    const target = event.target as HTMLElement;
    const conflicts = this.conflicts.get(target) || [];
    
    conflicts.push({
      type: event.type,
      timestamp: Date.now(),
      propagation: event.eventPhase,
      target: this.getElementIdentifier(target),
      preventDefault: event.defaultPrevented,
      stopPropagation: event.cancelBubble
    });
    
    this.conflicts.set(target, conflicts);
    
    // Check for immediate conflicts
    this.detectConflicts(target, conflicts);
  }

  private checkPropagation(event: Event) {
    if (!this.enabled) return;
    
    const target = event.target as HTMLElement;
    const conflicts = this.conflicts.get(target);
    
    if (conflicts) {
      const lastConflict = conflicts[conflicts.length - 1];
      if (lastConflict.type === event.type) {
        lastConflict.stopPropagation = event.cancelBubble;
      }
    }
  }

  private detectConflicts(target: EventTarget, conflicts: EventConflict[]) {
    if (conflicts.length < 2) return;

    const recentConflicts = conflicts.filter(c => 
      Date.now() - c.timestamp < 100 // Within 100ms
    );

    if (recentConflicts.length > 1) {
      const types = recentConflicts.map(c => c.type);
      
      // Critical conflicts
      if (types.includes('click') && types.includes('dragstart')) {
        this.reportConflict(target as HTMLElement, recentConflicts, 'high');
      }
      // Medium conflicts
      else if (types.includes('mousedown') && types.includes('touchstart')) {
        this.reportConflict(target as HTMLElement, recentConflicts, 'medium');
      }
      // Low conflicts
      else if (recentConflicts.length > 3) {
        this.reportConflict(target as HTMLElement, recentConflicts, 'low');
      }
    }
  }

  private reportConflict(element: HTMLElement, conflicts: EventConflict[], severity: 'low' | 'medium' | 'high') {
    const report: ConflictReport = {
      element: this.getElementIdentifier(element),
      conflicts,
      conflictTypes: [...new Set(conflicts.map(c => c.type))],
      severity
    };

    console.group(`🚨 Event Conflict Detected (${severity.toUpperCase()})`);
    console.log('Element:', report.element);
    console.log('Conflicting Events:', report.conflictTypes.join(', '));
    console.table(conflicts);
    console.groupEnd();

    // Visual indicator
    if (severity === 'high') {
      this.highlightConflict(element);
    }
  }

  private highlightConflict(element: HTMLElement) {
    const originalBorder = element.style.border;
    element.style.border = '3px solid red';
    element.style.boxShadow = '0 0 10px rgba(255,0,0,0.5)';
    
    setTimeout(() => {
      element.style.border = originalBorder;
      element.style.boxShadow = '';
    }, 2000);
  }

  private getElementIdentifier(element: HTMLElement): string {
    const id = element.id ? `#${element.id}` : '';
    const classes = element.className ? `.${element.className.split(' ').join('.')}` : '';
    const tag = element.tagName.toLowerCase();
    return `${tag}${id}${classes}`;
  }

  // Public API
  getReport(): ConflictReport[] {
    const reports: ConflictReport[] = [];
    
    this.conflicts.forEach((conflicts, element) => {
      const conflictTypes = [...new Set(conflicts.map(c => c.type))];
      if (conflictTypes.length > 1) {
        reports.push({
          element: this.getElementIdentifier(element as HTMLElement),
          conflicts,
          conflictTypes,
          severity: this.calculateSeverity(conflicts)
        });
      }
    });
    
    return reports;
  }

  private calculateSeverity(conflicts: EventConflict[]): 'low' | 'medium' | 'high' {
    const types = conflicts.map(c => c.type);
    if (types.includes('click') && types.includes('dragstart')) return 'high';
    if (types.includes('mousedown') && types.includes('touchstart')) return 'medium';
    return 'low';
  }

  clear() {
    this.conflicts.clear();
    console.log('🔍 Event Monitor cleared');
  }
}

// Create singleton instance
export const eventMonitor = new EventMonitor();

// Expose to window in development
if (import.meta.env.DEV) {
  (window as any).eventMonitor = eventMonitor;
}