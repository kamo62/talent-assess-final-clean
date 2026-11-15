/*
  # Time Tracking System Implementation

  1. New Tables
    - `assessment_time_tracking` - Comprehensive time tracking for all assessments
    - `assessment_activity_logs` - Detailed activity logs for tracking user behavior
    
  2. Changes to Existing Tables
    - Add `time_limit` to `code_assessments`
    - Add `time_limit` to `case_studies`
    - Update `mcq_questions` time limit to be more flexible
    
  3. Security
    - Enable RLS on new tables
    - Add policies for users to track their own time
    - Add policies for admins to view all time tracking data
*/

-- Add time limits to existing assessment tables
ALTER TABLE code_assessments 
ADD COLUMN IF NOT EXISTS time_limit interval DEFAULT '02:00:00';

ALTER TABLE case_studies 
ADD COLUMN IF NOT EXISTS time_limit interval DEFAULT '01:30:00';

-- Create comprehensive time tracking table
CREATE TABLE assessment_time_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  assessment_type text NOT NULL CHECK (assessment_type IN ('code', 'mcq', 'case_study')),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  organization_id uuid REFERENCES organizations(id) NOT NULL,
  
  -- Time tracking fields
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  time_limit interval NOT NULL,
  time_spent interval DEFAULT '00:00:00',
  time_remaining interval GENERATED ALWAYS AS (
    CASE 
      WHEN completed_at IS NOT NULL THEN '00:00:00'::interval
      ELSE GREATEST('00:00:00'::interval, time_limit - (COALESCE(time_spent, '00:00:00'::interval) + (now() - started_at)))
    END
  ) STORED,
  
  -- Pause/Resume tracking
  is_paused boolean DEFAULT false,
  pause_count integer DEFAULT 0,
  total_pause_duration interval DEFAULT '00:00:00',
  last_activity_at timestamptz DEFAULT now(),
  
  -- Status tracking
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'timed_out', 'abandoned')),
  auto_submitted boolean DEFAULT false,
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create activity logs table for detailed tracking
CREATE TABLE assessment_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_tracking_id uuid REFERENCES assessment_time_tracking(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  
  -- Activity details
  activity_type text NOT NULL CHECK (activity_type IN (
    'started', 'paused', 'resumed', 'completed', 'auto_submitted',
    'window_blur', 'window_focus', 'tab_switch', 'idle_detected',
    'answer_changed', 'code_executed', 'file_saved'
  )),
  activity_data jsonb DEFAULT '{}',
  
  -- Timing
  timestamp timestamptz DEFAULT now(),
  time_since_start interval,
  
  -- Context
  ip_address inet,
  user_agent text
);

-- Create indexes for performance
CREATE INDEX idx_time_tracking_user ON assessment_time_tracking(user_id);
CREATE INDEX idx_time_tracking_assessment ON assessment_time_tracking(assessment_id, assessment_type);
CREATE INDEX idx_time_tracking_status ON assessment_time_tracking(status);
CREATE INDEX idx_time_tracking_org ON assessment_time_tracking(organization_id);
CREATE INDEX idx_activity_logs_tracking ON assessment_activity_logs(time_tracking_id);
CREATE INDEX idx_activity_logs_type ON assessment_activity_logs(activity_type);
CREATE INDEX idx_activity_logs_timestamp ON assessment_activity_logs(timestamp);

-- Enable RLS
ALTER TABLE assessment_time_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies for assessment_time_tracking
CREATE POLICY "Users can view their own time tracking"
  ON assessment_time_tracking FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own time tracking"
  ON assessment_time_tracking FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time tracking"
  ON assessment_time_tracking FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all time tracking"
  ON assessment_time_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Policies for assessment_activity_logs
CREATE POLICY "Users can view their own activity logs"
  ON assessment_activity_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activity logs"
  ON assessment_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity logs"
  ON assessment_activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Function to start time tracking for an assessment
CREATE OR REPLACE FUNCTION start_assessment_timer(
  p_assessment_id uuid,
  p_assessment_type text,
  p_time_limit interval
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tracking_id uuid;
  v_user_id uuid;
  v_org_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Get user's organization
  SELECT organization_id INTO v_org_id
  FROM organization_members
  WHERE user_id = v_user_id
  LIMIT 1;
  
  -- Check if tracking already exists
  SELECT id INTO v_tracking_id
  FROM assessment_time_tracking
  WHERE assessment_id = p_assessment_id
    AND assessment_type = p_assessment_type
    AND user_id = v_user_id
    AND status = 'in_progress';
  
  IF v_tracking_id IS NOT NULL THEN
    RETURN v_tracking_id;
  END IF;
  
  -- Create new tracking record
  INSERT INTO assessment_time_tracking (
    assessment_id,
    assessment_type,
    user_id,
    organization_id,
    time_limit
  ) VALUES (
    p_assessment_id,
    p_assessment_type,
    v_user_id,
    v_org_id,
    p_time_limit
  ) RETURNING id INTO v_tracking_id;
  
  -- Log start activity
  INSERT INTO assessment_activity_logs (
    time_tracking_id,
    user_id,
    activity_type,
    time_since_start
  ) VALUES (
    v_tracking_id,
    v_user_id,
    'started',
    '00:00:00'::interval
  );
  
  RETURN v_tracking_id;
END;
$$;

-- Function to pause/resume assessment
CREATE OR REPLACE FUNCTION toggle_assessment_pause(p_tracking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status record;
  v_pause_duration interval;
BEGIN
  -- Get current status
  SELECT is_paused, last_activity_at, user_id
  INTO v_current_status
  FROM assessment_time_tracking
  WHERE id = p_tracking_id
    AND user_id = auth.uid()
    AND status = 'in_progress';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Time tracking not found or not authorized';
  END IF;
  
  IF v_current_status.is_paused THEN
    -- Resume
    v_pause_duration := now() - v_current_status.last_activity_at;
    
    UPDATE assessment_time_tracking
    SET is_paused = false,
        total_pause_duration = total_pause_duration + v_pause_duration,
        last_activity_at = now(),
        updated_at = now()
    WHERE id = p_tracking_id;
    
    -- Log resume activity
    INSERT INTO assessment_activity_logs (
      time_tracking_id,
      user_id,
      activity_type,
      activity_data
    ) VALUES (
      p_tracking_id,
      auth.uid(),
      'resumed',
      jsonb_build_object('pause_duration', v_pause_duration::text)
    );
    
    RETURN jsonb_build_object(
      'status', 'resumed',
      'pause_duration', v_pause_duration::text
    );
  ELSE
    -- Pause
    UPDATE assessment_time_tracking
    SET is_paused = true,
        pause_count = pause_count + 1,
        last_activity_at = now(),
        updated_at = now()
    WHERE id = p_tracking_id;
    
    -- Log pause activity
    INSERT INTO assessment_activity_logs (
      time_tracking_id,
      user_id,
      activity_type
    ) VALUES (
      p_tracking_id,
      auth.uid(),
      'paused'
    );
    
    RETURN jsonb_build_object('status', 'paused');
  END IF;
END;
$$;

-- Function to complete assessment
CREATE OR REPLACE FUNCTION complete_assessment_timer(
  p_tracking_id uuid,
  p_auto_submitted boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tracking record;
  v_total_time interval;
BEGIN
  -- Get tracking record
  SELECT * INTO v_tracking
  FROM assessment_time_tracking
  WHERE id = p_tracking_id
    AND user_id = auth.uid()
    AND status = 'in_progress';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Time tracking not found or not authorized';
  END IF;
  
  -- Calculate total time
  v_total_time := (now() - v_tracking.started_at) - v_tracking.total_pause_duration;
  
  -- Update tracking record
  UPDATE assessment_time_tracking
  SET completed_at = now(),
      time_spent = v_total_time,
      status = CASE 
        WHEN p_auto_submitted THEN 'timed_out'
        ELSE 'completed'
      END,
      auto_submitted = p_auto_submitted,
      updated_at = now()
  WHERE id = p_tracking_id;
  
  -- Log completion
  INSERT INTO assessment_activity_logs (
    time_tracking_id,
    user_id,
    activity_type,
    activity_data,
    time_since_start
  ) VALUES (
    p_tracking_id,
    auth.uid(),
    CASE WHEN p_auto_submitted THEN 'auto_submitted' ELSE 'completed' END,
    jsonb_build_object(
      'total_time', v_total_time::text,
      'pause_count', v_tracking.pause_count,
      'total_pause_duration', v_tracking.total_pause_duration::text
    ),
    v_total_time
  );
  
  RETURN jsonb_build_object(
    'status', 'completed',
    'total_time', v_total_time::text,
    'auto_submitted', p_auto_submitted
  );
END;
$$;

-- Function to log activity
CREATE OR REPLACE FUNCTION log_assessment_activity(
  p_tracking_id uuid,
  p_activity_type text,
  p_activity_data jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_time_since_start interval;
BEGIN
  -- Calculate time since start
  SELECT now() - started_at INTO v_time_since_start
  FROM assessment_time_tracking
  WHERE id = p_tracking_id
    AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Insert activity log
  INSERT INTO assessment_activity_logs (
    time_tracking_id,
    user_id,
    activity_type,
    activity_data,
    time_since_start
  ) VALUES (
    p_tracking_id,
    auth.uid(),
    p_activity_type,
    p_activity_data,
    v_time_since_start
  );
  
  -- Update last activity timestamp
  UPDATE assessment_time_tracking
  SET last_activity_at = now()
  WHERE id = p_tracking_id
    AND NOT is_paused;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_time_tracking_updated_at
  BEFORE UPDATE ON assessment_time_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add time limit defaults based on seniority for different assessment types
CREATE OR REPLACE FUNCTION get_default_time_limit(
  p_assessment_type text,
  p_seniority text
)
RETURNS interval
LANGUAGE plpgsql
AS $$
BEGIN
  CASE p_assessment_type
    WHEN 'code' THEN
      CASE p_seniority
        WHEN 'junior' THEN RETURN '02:00:00'::interval;
        WHEN 'mid' THEN RETURN '02:30:00'::interval;
        WHEN 'senior' THEN RETURN '03:00:00'::interval;
        WHEN 'lead' THEN RETURN '03:30:00'::interval;
        ELSE RETURN '02:30:00'::interval;
      END CASE;
    WHEN 'mcq' THEN
      RETURN '01:00:00'::interval; -- Will be calculated based on questions
    WHEN 'case_study' THEN
      CASE p_seniority
        WHEN 'junior' THEN RETURN '01:30:00'::interval;
        WHEN 'mid' THEN RETURN '02:00:00'::interval;
        WHEN 'senior' THEN RETURN '02:30:00'::interval;
        WHEN 'lead' THEN RETURN '03:00:00'::interval;
        ELSE RETURN '02:00:00'::interval;
      END CASE;
    ELSE
      RETURN '02:00:00'::interval;
  END CASE;
END;
$$;
