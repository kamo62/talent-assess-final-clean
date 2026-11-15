import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Clock, Pause, Play, AlertTriangle, Shield, AlertCircle } from 'lucide-react';
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
import { PlagiarismDetector, calculateRiskScore } from '../lib/plagiarismDetector';
import { supabase } from '../lib/supabase';

interface AssessmentTimerWithPlagiarismProps {
  assessmentId: string;
  assessmentType: 'code' | 'mcq' | 'case_study';
  timeLimit: string;
  onTimeUp?: () => void;
  onComplete?: (totalTime: string, plagiarismReportId?: string) => void;
  autoSubmit?: boolean;
  showPauseButton?: boolean;
  enablePlagiarismDetection?: boolean;
  showPlagiarismIndicator?: boolean;
  className?: string;
}

export interface AssessmentTimerHandle {
  completeAssessment: () => Promise<void>;
  getPlagiarismReport: () => Promise<string | null>;
}

export const AssessmentTimerWithPlagiarism = forwardRef<AssessmentTimerHandle, AssessmentTimerWithPlagiarismProps>(({
  assessmentId,
  assessmentType,
  timeLimit,
  onTimeUp,
  onComplete,
  autoSubmit = true,
  showPauseButton = true,
  enablePlagiarismDetection = true,
  showPlagiarismIndicator = true,
  className = ''
}, ref) => {
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [timeTracking, setTimeTracking] = useState<TimeTracking | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plagiarismRisk, setPlagiarismRisk] = useState<number>(0);
  const [userId, setUserId] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const activityMonitorRef = useRef<ActivityMonitor | null>(null);
  const plagiarismDetectorRef = useRef<PlagiarismDetector | null>(null);
  const hasAutoSubmittedRef = useRef(false);
  const plagiarismUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  // Initialize timer and plagiarism detection
  useEffect(() => {
    if (userId) {
      initializeTimer();
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (plagiarismUpdateIntervalRef.current) {
        clearInterval(plagiarismUpdateIntervalRef.current);
      }
      if (activityMonitorRef.current) {
        activityMonitorRef.current.destroy();
      }
      if (plagiarismDetectorRef.current) {
        plagiarismDetectorRef.current.destroy();
      }
    };
  }, [assessmentId, assessmentType, timeLimit, userId]);

  // Update plagiarism risk score periodically
  useEffect(() => {
    if (enablePlagiarismDetection && plagiarismDetectorRef.current) {
      const updateRiskScore = () => {
        const events = plagiarismDetectorRef.current!.getEvents();
        const score = calculateRiskScore(events);
        setPlagiarismRisk(score);
      };

      // Update every 10 seconds
      plagiarismUpdateIntervalRef.current = setInterval(updateRiskScore, 10000);
      
      return () => {
        if (plagiarismUpdateIntervalRef.current) {
          clearInterval(plagiarismUpdateIntervalRef.current);
        }
      };
    }
  }, [enablePlagiarismDetection]);

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
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
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
      
      // Initialize plagiarism detector
      if (enablePlagiarismDetection) {
        plagiarismDetectorRef.current = new PlagiarismDetector(
          assessmentId,
          assessmentType,
          userId
        );
      }
      
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
      // Generate plagiarism report if enabled
      let reportId: string | null = null;
      if (enablePlagiarismDetection && plagiarismDetectorRef.current) {
        reportId = await plagiarismDetectorRef.current.generateReport();
      }

      const { totalTime, error } = await completeAssessmentTimer(trackingId, true);
      
      if (error) {
        throw new Error(error);
      }

      if (onTimeUp) {
        onTimeUp();
      }
      
      if (onComplete && totalTime) {
        onComplete(totalTime, reportId || undefined);
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
      // Generate plagiarism report if enabled
      let reportId: string | null = null;
      if (enablePlagiarismDetection && plagiarismDetectorRef.current) {
        reportId = await plagiarismDetectorRef.current.generateReport();
      }

      const { totalTime, error } = await completeAssessmentTimer(trackingId, false);
      
      if (error) {
        throw new Error(error);
      }

      if (onComplete && totalTime) {
        onComplete(totalTime, reportId || undefined);
      }
    } catch (err: any) {
      console.error('Error completing assessment:', err);
      setError(err.message);
    }
  };

  const getPlagiarismReport = async (): Promise<string | null> => {
    if (!enablePlagiarismDetection || !plagiarismDetectorRef.current) {
      return null;
    }
    
    return await plagiarismDetectorRef.current.generateReport();
  };

  // Expose methods to parent
  useImperativeHandle(
    ref,
    () => ({
      completeAssessment,
      getPlagiarismReport
    }),
    [trackingId, timeTracking, enablePlagiarismDetection]
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

  // Get plagiarism risk level
  const getPlagiarismRiskLevel = () => {
    if (plagiarismRisk >= 0.8) return 'critical';
    if (plagiarismRisk >= 0.6) return 'high';
    if (plagiarismRisk >= 0.4) return 'medium';
    return 'low';
  };

  const plagiarismRiskLevel = getPlagiarismRiskLevel();

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

      {enablePlagiarismDetection && showPlagiarismIndicator && (
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
          plagiarismRiskLevel === 'critical' ? 'bg-red-100 text-red-700' :
          plagiarismRiskLevel === 'high' ? 'bg-orange-100 text-orange-700' :
          plagiarismRiskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
          'bg-green-100 text-green-700'
        }`}>
          <Shield className="h-4 w-4" />
          <span className="text-sm font-medium">
            Integrity: {plagiarismRiskLevel === 'low' ? 'Good' : 
                       plagiarismRiskLevel === 'medium' ? 'Warning' :
                       plagiarismRiskLevel === 'high' ? 'Alert' : 'Critical'}
          </span>
        </div>
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

AssessmentTimerWithPlagiarism.displayName = 'AssessmentTimerWithPlagiarism';

// Hook for parent components to access timer methods
export function useAssessmentTimerWithPlagiarism() {
  const timerRef = useRef<AssessmentTimerHandle | null>(null);

  return {
    timerRef,
    completeAssessment: async () => {
      if (timerRef.current) {
        await timerRef.current.completeAssessment();
      }
    },
    getPlagiarismReport: async () => {
      if (timerRef.current) {
        return await timerRef.current.getPlagiarismReport();
      }
      return null;
    }
  };
}
