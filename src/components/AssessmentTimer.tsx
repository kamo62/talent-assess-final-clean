import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Clock, Pause, Play, AlertTriangle, Shield } from 'lucide-react';
import {
  startAssessmentTimer,
  getTimeTracking,
  toggleAssessmentPause,
  completeAssessmentTimer,
  calculateRemainingTime,
  formatTime,
  ActivityMonitor,
  TimeTracking
} from '../lib/timeTracking';
import { PlagiarismDetector } from '../lib/plagiarismDetector';
import { supabase } from '../lib/supabase';

interface AssessmentTimerProps {
  assessmentId: string;
  assessmentType: 'code' | 'mcq' | 'case_study';
  timeLimit: string;
  onTimeUp?: () => void;
  onComplete?: (totalTime: string) => void;
  autoSubmit?: boolean;
  showPauseButton?: boolean;
  className?: string;
}

export interface AssessmentTimerHandle {
  completeAssessment: () => Promise<void>;
}

export const AssessmentTimer = forwardRef<AssessmentTimerHandle, AssessmentTimerProps>(({
  assessmentId,
  assessmentType,
  timeLimit,
  onTimeUp,
  onComplete,
  autoSubmit = true,
  showPauseButton = true,
  className = ''
}, ref) => {
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [timeTracking, setTimeTracking] = useState<TimeTracking | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const activityMonitorRef = useRef<ActivityMonitor | null>(null);
  const hasAutoSubmittedRef = useRef(false);

  // Initialize timer
  useEffect(() => {
    initializeTimer();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (activityMonitorRef.current) {
        activityMonitorRef.current.destroy();
      }
    };
  }, [assessmentId, assessmentType, timeLimit]);

  // Update remaining time
  useEffect(() => {
    if (!timeTracking || timeTracking.status !== 'in_progress') return;

    const updateRemainingTime = () => {
      const remaining = calculateRemainingTime(
        timeTracking.started_at,
        timeTracking.time_limit,
        timeTracking.time_spent,
        timeTracking.is_paused
      );
      
      setRemainingSeconds(remaining);
      
      // Auto-submit when time is up
      if (remaining <= 0 && !hasAutoSubmittedRef.current && autoSubmit) {
        hasAutoSubmittedRef.current = true;
        handleTimeUp();
      }
    };

    updateRemainingTime();
    
    if (!timeTracking.is_paused) {
      intervalRef.current = setInterval(updateRemainingTime, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timeTracking, autoSubmit]);

  const initializeTimer = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { trackingId: newTrackingId, error: startError } = await startAssessmentTimer(
        assessmentId,
        assessmentType,
        timeLimit
      );

      if (startError || !newTrackingId) {
        throw new Error(startError || 'Failed to start timer');
      }

      setTrackingId(newTrackingId);
      
      // Initialize activity monitor
      activityMonitorRef.current = new ActivityMonitor(newTrackingId);
      
      // Fetch initial tracking data
      const tracking = await getTimeTracking(newTrackingId);
      if (tracking) {
        setTimeTracking(tracking);
        setIsPaused(tracking.is_paused);
      }
    } catch (err: any) {
      console.error('Error initializing timer:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseResume = async () => {
    if (!trackingId) return;

    try {
      const { status, error } = await toggleAssessmentPause(trackingId);
      
      if (error) {
        throw new Error(error);
      }

      setIsPaused(status === 'paused');
      
      // Refresh tracking data
      const tracking = await getTimeTracking(trackingId);
      if (tracking) {
        setTimeTracking(tracking);
      }
    } catch (err: any) {
      console.error('Error toggling pause:', err);
      setError(err.message);
    }
  };

  const handleTimeUp = async () => {
    if (!trackingId) return;

    try {
      const { totalTime, error } = await completeAssessmentTimer(trackingId, true);
      
      if (error) {
        throw new Error(error);
      }

      if (onTimeUp) {
        onTimeUp();
      }
      
      if (onComplete && totalTime) {
        onComplete(totalTime);
      }
    } catch (err: any) {
      console.error('Error handling time up:', err);
      setError(err.message);
    }
  };

  // Manual completion (called from parent component)
  const completeAssessment = async () => {
    if (!trackingId || !timeTracking || timeTracking.status !== 'in_progress') return;

    try {
      const { totalTime, error } = await completeAssessmentTimer(trackingId, false);
      
      if (error) {
        throw new Error(error);
      }

      if (onComplete && totalTime) {
        onComplete(totalTime);
      }
    } catch (err: any) {
      console.error('Error completing assessment:', err);
      setError(err.message);
    }
  };

  // Expose complete method to parent
  useImperativeHandle(
    ref,
    () => ({
      completeAssessment
    }),
    [trackingId, timeTracking]
  );

  // Get warning level based on remaining time
  const getWarningLevel = () => {
    const totalSeconds = timeTracking ? 
      calculateRemainingTime(
        timeTracking.started_at,
        timeTracking.time_limit,
        '00:00:00',
        false
      ) : 0;
    
    const percentRemaining = (remainingSeconds / totalSeconds) * 100;
    
    if (percentRemaining <= 5) return 'critical';
    if (percentRemaining <= 10) return 'warning';
    return 'normal';
  };

  const warningLevel = getWarningLevel();

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Clock className="h-5 w-5 text-gray-400 animate-pulse" />
        <span className="text-gray-500">Initializing timer...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
        <AlertTriangle className="h-5 w-5" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
        warningLevel === 'critical' ? 'bg-red-100 text-red-700 animate-pulse' :
        warningLevel === 'warning' ? 'bg-yellow-100 text-yellow-700' :
        'bg-gray-100 text-gray-700'
      }`}>
        <Clock className="h-5 w-5" />
        <span className="font-mono text-lg font-medium">
          {formatTime(remainingSeconds)}
        </span>
        {isPaused && (
          <span className="text-sm font-normal">(Paused)</span>
        )}
      </div>

      {showPauseButton && timeTracking?.status === 'in_progress' && (
        <button
          onClick={handlePauseResume}
          className={`p-2 rounded-lg transition-colors ${
            isPaused 
              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
        </button>
      )}

      {warningLevel !== 'normal' && (
        <div className="text-sm">
          {warningLevel === 'critical' ? (
            <span className="text-red-600 font-medium">Time almost up!</span>
          ) : (
            <span className="text-yellow-600 font-medium">10% time remaining</span>
          )}
        </div>
      )}
    </div>
  );
});

AssessmentTimer.displayName = 'AssessmentTimer';

// Hook for parent components to access timer methods
export function useAssessmentTimer() {
  const timerRef = useRef<AssessmentTimerHandle | null>(null);

  return {
    timerRef,
    completeAssessment: async () => {
      if (timerRef.current) {
        await timerRef.current.completeAssessment();
      }
    }
  };
}
