import { supabase } from './supabase';

export interface TimeTracking {
  id: string;
  assessment_id: string;
  assessment_type: 'code' | 'mcq' | 'case_study';
  user_id: string;
  organization_id: string;
  started_at: string;
  completed_at: string | null;
  time_limit: string;
  time_spent: string;
  time_remaining: string;
  is_paused: boolean;
  pause_count: number;
  total_pause_duration: string;
  last_activity_at: string;
  status: 'in_progress' | 'completed' | 'timed_out' | 'abandoned';
  auto_submitted: boolean;
  metadata: Record<string, any>;
}

export interface ActivityLog {
  id: string;
  time_tracking_id: string;
  user_id: string;
  activity_type: 
    | 'started' | 'paused' | 'resumed' | 'completed' | 'auto_submitted'
    | 'window_blur' | 'window_focus' | 'tab_switch' | 'idle_detected'
    | 'answer_changed' | 'code_executed' | 'file_saved';
  activity_data: Record<string, any>;
  timestamp: string;
  time_since_start: string;
}

// Convert PostgreSQL interval to seconds
function intervalToSeconds(interval: string): number {
  const parts = interval.split(':');
  return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
}

// Convert seconds to PostgreSQL interval format
function secondsToInterval(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Start time tracking for an assessment
export async function startAssessmentTimer(
  assessmentId: string,
  assessmentType: 'code' | 'mcq' | 'case_study',
  timeLimit: string
): Promise<{ trackingId: string | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc('start_assessment_timer', {
      p_assessment_id: assessmentId,
      p_assessment_type: assessmentType,
      p_time_limit: timeLimit
    });

    if (error) throw error;

    return { trackingId: data, error: null };
  } catch (error: any) {
    console.error('Error starting assessment timer:', error);
    return { trackingId: null, error: error.message };
  }
}

// Get current time tracking status
export async function getTimeTracking(trackingId: string): Promise<TimeTracking | null> {
  try {
    const { data, error } = await supabase
      .from('assessment_time_tracking')
      .select('*')
      .eq('id', trackingId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching time tracking:', error);
    return null;
  }
}

// Pause or resume assessment
export async function toggleAssessmentPause(trackingId: string): Promise<{
  status: 'paused' | 'resumed' | null;
  pauseDuration?: string;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.rpc('toggle_assessment_pause', {
      p_tracking_id: trackingId
    });

    if (error) throw error;

    return {
      status: data.status,
      pauseDuration: data.pause_duration,
      error: null
    };
  } catch (error: any) {
    console.error('Error toggling pause:', error);
    return { status: null, error: error.message };
  }
}

// Complete assessment
export async function completeAssessmentTimer(
  trackingId: string,
  autoSubmitted: boolean = false
): Promise<{
  status: string | null;
  totalTime: string | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.rpc('complete_assessment_timer', {
      p_tracking_id: trackingId,
      p_auto_submitted: autoSubmitted
    });

    if (error) throw error;

    return {
      status: data.status,
      totalTime: data.total_time,
      error: null
    };
  } catch (error: any) {
    console.error('Error completing assessment:', error);
    return { status: null, totalTime: null, error: error.message };
  }
}

// Log activity
export async function logAssessmentActivity(
  trackingId: string,
  activityType: ActivityLog['activity_type'],
  activityData: Record<string, any> = {}
): Promise<void> {
  try {
    const { error } = await supabase.rpc('log_assessment_activity', {
      p_tracking_id: trackingId,
      p_activity_type: activityType,
      p_activity_data: activityData
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

// Get activity logs for a tracking session
export async function getActivityLogs(trackingId: string): Promise<ActivityLog[]> {
  try {
    const { data, error } = await supabase
      .from('assessment_activity_logs')
      .select('*')
      .eq('time_tracking_id', trackingId)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return [];
  }
}

// Get default time limit based on assessment type and seniority
export async function getDefaultTimeLimit(
  assessmentType: 'code' | 'mcq' | 'case_study',
  seniority: 'junior' | 'mid' | 'senior' | 'lead'
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('get_default_time_limit', {
      p_assessment_type: assessmentType,
      p_seniority: seniority
    });

    if (error) throw error;
    return data || '02:00:00';
  } catch (error) {
    console.error('Error getting default time limit:', error);
    return '02:00:00'; // Default fallback
  }
}

// Calculate remaining time
export function calculateRemainingTime(
  startedAt: string,
  timeLimit: string,
  timeSpent: string,
  isPaused: boolean
): number {
  if (isPaused) {
    const limitSeconds = intervalToSeconds(timeLimit);
    const spentSeconds = intervalToSeconds(timeSpent);
    return Math.max(0, limitSeconds - spentSeconds);
  }

  const now = new Date();
  const start = new Date(startedAt);
  const elapsedSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
  const limitSeconds = intervalToSeconds(timeLimit);
  const spentSeconds = intervalToSeconds(timeSpent);
  
  return Math.max(0, limitSeconds - (spentSeconds + elapsedSeconds));
}

// Format time for display
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Activity monitoring utilities
export class ActivityMonitor {
  private trackingId: string;
  private idleTimeout: NodeJS.Timeout | null = null;
  private idleThreshold = 300000; // 5 minutes
  private lastActivity = Date.now();

  constructor(trackingId: string) {
    this.trackingId = trackingId;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Window focus/blur
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('focus', this.handleWindowFocus);

    // Visibility change (tab switching)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // User activity
    document.addEventListener('mousemove', this.handleUserActivity);
    document.addEventListener('keypress', this.handleUserActivity);
    document.addEventListener('click', this.handleUserActivity);

    // Copy/paste detection
    document.addEventListener('copy', this.handleCopy);
    document.addEventListener('paste', this.handlePaste);

    // Start idle detection
    this.startIdleDetection();
  }

  private handleWindowBlur = () => {
    logAssessmentActivity(this.trackingId, 'window_blur');
  };

  private handleWindowFocus = () => {
    logAssessmentActivity(this.trackingId, 'window_focus');
  };

  private handleVisibilityChange = () => {
    if (document.hidden) {
      logAssessmentActivity(this.trackingId, 'tab_switch', {
        action: 'hidden'
      });
    } else {
      logAssessmentActivity(this.trackingId, 'tab_switch', {
        action: 'visible'
      });
    }
  };

  private handleUserActivity = () => {
    this.lastActivity = Date.now();
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.startIdleDetection();
    }
  };

  private handleCopy = (e: ClipboardEvent) => {
    const selection = window.getSelection()?.toString() || '';
    logAssessmentActivity(this.trackingId, 'window_blur', {
      event: 'copy',
      textLength: selection.length
    });
  };

  private handlePaste = (e: ClipboardEvent) => {
    const pastedText = e.clipboardData?.getData('text') || '';
    logAssessmentActivity(this.trackingId, 'window_blur', {
      event: 'paste',
      textLength: pastedText.length
    });
  };

  private startIdleDetection() {
    this.idleTimeout = setTimeout(() => {
      logAssessmentActivity(this.trackingId, 'idle_detected', {
        idleDuration: this.idleThreshold
      });
    }, this.idleThreshold);
  }

  public destroy() {
    // Remove event listeners
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('focus', this.handleWindowFocus);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.removeEventListener('mousemove', this.handleUserActivity);
    document.removeEventListener('keypress', this.handleUserActivity);
    document.removeEventListener('click', this.handleUserActivity);
    document.removeEventListener('copy', this.handleCopy);
    document.removeEventListener('paste', this.handlePaste);

    // Clear timeout
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }
  }
}

// Time tracking statistics
export interface TimeTrackingStats {
  totalAssessments: number;
  averageCompletionTime: string;
  timeoutRate: number;
  pauseUsageRate: number;
  averagePauseCount: number;
}

export async function getTimeTrackingStats(
  organizationId: string,
  assessmentType?: 'code' | 'mcq' | 'case_study'
): Promise<TimeTrackingStats> {
  try {
    let query = supabase
      .from('assessment_time_tracking')
      .select('*')
      .eq('organization_id', organizationId)
      .in('status', ['completed', 'timed_out']);

    if (assessmentType) {
      query = query.eq('assessment_type', assessmentType);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        totalAssessments: 0,
        averageCompletionTime: '00:00:00',
        timeoutRate: 0,
        pauseUsageRate: 0,
        averagePauseCount: 0
      };
    }

    const totalAssessments = data.length;
    const timedOut = data.filter(d => d.status === 'timed_out').length;
    const withPauses = data.filter(d => d.pause_count > 0).length;
    
    const totalSeconds = data.reduce((sum, d) => {
      return sum + intervalToSeconds(d.time_spent || '00:00:00');
    }, 0);
    
    const totalPauses = data.reduce((sum, d) => sum + (d.pause_count || 0), 0);

    return {
      totalAssessments,
      averageCompletionTime: secondsToInterval(Math.floor(totalSeconds / totalAssessments)),
      timeoutRate: (timedOut / totalAssessments) * 100,
      pauseUsageRate: (withPauses / totalAssessments) * 100,
      averagePauseCount: totalPauses / totalAssessments
    };
  } catch (error) {
    console.error('Error fetching time tracking stats:', error);
    return {
      totalAssessments: 0,
      averageCompletionTime: '00:00:00',
      timeoutRate: 0,
      pauseUsageRate: 0,
      averagePauseCount: 0
    };
  }
}
