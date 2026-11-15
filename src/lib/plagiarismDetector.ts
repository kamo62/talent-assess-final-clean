import { supabase } from './supabase';

export interface PlagiarismEvent {
  type: string;
  details?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

export class PlagiarismDetector {
  private assessmentId: string;
  private assessmentType: 'code' | 'mcq' | 'case_study';
  private userId: string;
  private events: PlagiarismEvent[] = [];
  private listeners: Map<string, (e: any) => void> = new Map();
  private devToolsCheckInterval: NodeJS.Timeout | null = null;
  private isDestroyed = false;

  constructor(
    assessmentId: string, 
    assessmentType: 'code' | 'mcq' | 'case_study',
    userId: string
  ) {
    this.assessmentId = assessmentId;
    this.assessmentType = assessmentType;
    this.userId = userId;
    this.initializeListeners();
  }

  private initializeListeners() {
    // Keyboard shortcuts detection
    this.addKeyboardListener();
    
    // Context menu (right-click) detection
    this.addContextMenuListener();
    
    // Developer tools detection
    this.addDevToolsListener();
    
    // Tab visibility changes
    this.addVisibilityListener();
    
    // Window focus/blur
    this.addFocusListener();
    
    // Text selection monitoring
    this.addSelectionListener();
    
    // Clipboard events
    this.addClipboardListener();
    
    // Drag and drop detection
    this.addDragDropListener();
  }

  private addKeyboardListener() {
    const handler = async (e: KeyboardEvent) => {
      // Detect copy/paste/cut shortcuts
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
        const eventType = e.key.toLowerCase() === 'c' ? 'copy' : 
                         e.key.toLowerCase() === 'v' ? 'paste' : 'cut';
        
        await this.logEvent({
          type: eventType,
          details: {
            key: e.key,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey
          },
          severity: eventType === 'paste' ? 'high' : 'medium',
          timestamp: new Date()
        });
        
        // For paste events, try to capture clipboard content
        if (eventType === 'paste') {
          setTimeout(() => this.captureClipboardContent(), 100);
        }
      }
      
      // Detect print screen
      if (e.key === 'PrintScreen') {
        await this.logEvent({
          type: 'screenshot',
          severity: 'high',
          timestamp: new Date()
        });
      }
      
      // Detect F12 (dev tools)
      if (e.key === 'F12') {
        await this.logEvent({
          type: 'dev_tools',
          details: { method: 'F12' },
          severity: 'critical',
          timestamp: new Date()
        });
      }
    };
    
    document.addEventListener('keydown', handler, true);
    this.listeners.set('keydown', handler);
  }

  private async captureClipboardContent() {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.length > 50) { // Only log substantial pastes
        const contentHash = await this.hashContent(text);
        
        await this.logEvent({
          type: 'external_paste',
          details: {
            contentLength: text.length,
            contentPreview: text.substring(0, 100) + '...',
            contentHash,
            wordCount: text.split(/\s+/).length
          },
          severity: 'critical',
          timestamp: new Date()
        });
      }
    } catch (err) {
      // Clipboard access denied or not available
      console.debug('Clipboard access denied');
    }
  }

  private async hashContent(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private addContextMenuListener() {
    const handler = async (e: MouseEvent) => {
      e.preventDefault();
      await this.logEvent({
        type: 'right_click',
        details: {
          x: e.clientX,
          y: e.clientY
        },
        severity: 'low',
        timestamp: new Date()
      });
      return false;
    };
    
    document.addEventListener('contextmenu', handler);
    this.listeners.set('contextmenu', handler);
  }

  private addDevToolsListener() {
    let devtools = { open: false };
    const threshold = 160;
    
    const checkDevTools = async () => {
      if (this.isDestroyed) return;
      
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          await this.logEvent({
            type: 'dev_tools',
            details: { method: 'size_detection' },
            severity: 'critical',
            timestamp: new Date()
          });
          devtools.open = true;
        }
      } else {
        devtools.open = false;
      }
    };
    
    this.devToolsCheckInterval = setInterval(checkDevTools, 500);
    
    // Also detect console usage
    const element = new Image();
    Object.defineProperty(element, 'id', {
      get: async () => {
        await this.logEvent({
          type: 'dev_tools',
          details: { method: 'console_detection' },
          severity: 'critical',
          timestamp: new Date()
        });
      }
    });
    console.log('%c', element);
  }

  private addVisibilityListener() {
    const handler = async () => {
      if (document.hidden) {
        await this.logEvent({
          type: 'tab_switch',
          details: { hidden: true },
          severity: 'medium',
          timestamp: new Date()
        });
      }
    };
    
    document.addEventListener('visibilitychange', handler);
    this.listeners.set('visibilitychange', handler);
  }

  private addFocusListener() {
    const blurHandler = async () => {
      await this.logEvent({
        type: 'window_blur',
        severity: 'medium',
        timestamp: new Date()
      });
    };
    
    window.addEventListener('blur', blurHandler);
    this.listeners.set('blur', blurHandler);
  }

  private addSelectionListener() {
    const handler = async () => {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 50) {
        await this.logEvent({
          type: 'copy',
          details: {
            selectionLength: selection.toString().length,
            selectionPreview: selection.toString().substring(0, 50) + '...'
          },
          severity: 'medium',
          timestamp: new Date()
        });
      }
    };
    
    document.addEventListener('copy', handler);
    this.listeners.set('copy', handler);
  }

  private addClipboardListener() {
    const pasteHandler = async (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text/plain');
      if (text && text.length > 50) {
        await this.logEvent({
          type: 'paste',
          details: {
            contentLength: text.length,
            fromClipboard: true
          },
          severity: 'high',
          timestamp: new Date()
        });
      }
    };
    
    const cutHandler = async (e: ClipboardEvent) => {
      await this.logEvent({
        type: 'cut',
        severity: 'medium',
        timestamp: new Date()
      });
    };
    
    document.addEventListener('paste', pasteHandler);
    document.addEventListener('cut', cutHandler);
    this.listeners.set('paste', pasteHandler);
    this.listeners.set('cut', cutHandler);
  }

  private addDragDropListener() {
    const handler = async (e: DragEvent) => {
      e.preventDefault();
      await this.logEvent({
        type: 'drag_drop',
        details: {
          dataTypes: e.dataTransfer?.types
        },
        severity: 'medium',
        timestamp: new Date()
      });
    };
    
    document.addEventListener('drop', handler);
    document.addEventListener('dragover', (e) => e.preventDefault());
    this.listeners.set('drop', handler);
  }

  private async logEvent(event: PlagiarismEvent) {
    if (this.isDestroyed) return;
    
    this.events.push(event);
    
    // Log to database
    try {
      const { error } = await supabase
        .from('plagiarism_events')
        .insert({
          assessment_id: this.assessmentId,
          assessment_type: this.assessmentType,
          user_id: this.userId,
          event_type: event.type,
          event_details: event.details || {},
          severity: event.severity
        });
        
      if (error) {
        console.error('Error logging plagiarism event:', error);
      }
    } catch (err) {
      console.error('Failed to log plagiarism event:', err);
    }
  }

  public getEvents(): PlagiarismEvent[] {
    return [...this.events];
  }

  public async generateReport(): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .rpc('generate_plagiarism_report', {
          p_assessment_id: this.assessmentId,
          p_assessment_type: this.assessmentType,
          p_user_id: this.userId
        });
        
      if (error) {
        console.error('Error generating plagiarism report:', error);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error('Failed to generate plagiarism report:', err);
      return null;
    }
  }

  public destroy() {
    this.isDestroyed = true;
    
    // Remove all event listeners
    this.listeners.forEach((handler, event) => {
      if (event === 'blur') {
        window.removeEventListener(event, handler);
      } else {
        document.removeEventListener(event as any, handler);
      }
    });
    
    // Clear intervals
    if (this.devToolsCheckInterval) {
      clearInterval(this.devToolsCheckInterval);
    }
    
    this.listeners.clear();
    this.events = [];
  }
}

// Pattern detection utilities
export function detectSuspiciousPatterns(events: PlagiarismEvent[]): {
  rapidPaste: boolean;
  externalSourcePaste: boolean;
  suspiciousSequence: boolean;
  devToolsUsage: boolean;
} {
  const patterns = {
    rapidPaste: false,
    externalSourcePaste: false,
    suspiciousSequence: false,
    devToolsUsage: false
  };
  
  // Check for rapid paste events (more than 3 in 5 minutes)
  const pasteEvents = events.filter(e => e.type === 'paste');
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recentPastes = pasteEvents.filter(e => e.timestamp > fiveMinutesAgo);
  patterns.rapidPaste = recentPastes.length > 3;
  
  // Check for tab switch followed by paste
  for (let i = 0; i < events.length - 1; i++) {
    if (events[i].type === 'tab_switch' && events[i + 1].type === 'paste') {
      const timeDiff = events[i + 1].timestamp.getTime() - events[i].timestamp.getTime();
      if (timeDiff < 30000) { // Within 30 seconds
        patterns.externalSourcePaste = true;
        break;
      }
    }
  }
  
  // Check for dev tools usage
  patterns.devToolsUsage = events.some(e => e.type === 'dev_tools');
  
  // Check for suspicious sequence (copy from external, paste)
  patterns.suspiciousSequence = events.some(e => e.type === 'external_paste');
  
  return patterns;
}

export function calculateRiskScore(events: PlagiarismEvent[]): number {
  let score = 0;
  
  // Base scores for different event types
  const eventScores: Record<string, number> = {
    paste: 0.15,
    copy: 0.05,
    cut: 0.08,
    tab_switch: 0.10,
    window_blur: 0.08,
    dev_tools: 0.25,
    right_click: 0.03,
    external_paste: 0.30,
    screenshot: 0.20,
    drag_drop: 0.12
  };
  
  // Calculate base score
  events.forEach(event => {
    score += eventScores[event.type] || 0;
  });
  
  // Apply pattern multipliers
  const patterns = detectSuspiciousPatterns(events);
  if (patterns.rapidPaste) score *= 1.5;
  if (patterns.externalSourcePaste) score *= 2;
  if (patterns.suspiciousSequence) score *= 1.8;
  if (patterns.devToolsUsage) score *= 2.5;
  
  // Cap at 1.0
  return Math.min(score, 1.0);
}
