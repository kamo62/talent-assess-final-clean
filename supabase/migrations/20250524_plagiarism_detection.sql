-- Enhanced plagiarism detection tables
CREATE TABLE plagiarism_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('code', 'mcq', 'case_study')),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'copy', 'paste', 'cut', 'tab_switch', 'window_blur', 
    'right_click', 'dev_tools', 'screenshot', 'print',
    'drag_drop', 'external_paste'
  )),
  event_details JSONB, -- Additional context (e.g., pasted content hash, source info)
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Indexes for performance
  INDEX idx_plagiarism_assessment (assessment_id),
  INDEX idx_plagiarism_user (user_id),
  INDEX idx_plagiarism_timestamp (timestamp),
  INDEX idx_plagiarism_severity (severity)
);

-- Plagiarism risk reports
CREATE TABLE plagiarism_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL,
  assessment_type TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  total_events INTEGER DEFAULT 0,
  copy_events INTEGER DEFAULT 0,
  paste_events INTEGER DEFAULT 0,
  cut_events INTEGER DEFAULT 0,
  tab_switches INTEGER DEFAULT 0,
  window_blurs INTEGER DEFAULT 0,
  dev_tools_attempts INTEGER DEFAULT 0,
  suspicious_patterns JSONB, -- Pattern analysis results
  risk_score DECIMAL(3,2) CHECK (risk_score >= 0 AND risk_score <= 1), -- 0.00 to 1.00
  risk_level TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN risk_score >= 0.8 THEN 'critical'
      WHEN risk_score >= 0.6 THEN 'high'
      WHEN risk_score >= 0.4 THEN 'medium'
      ELSE 'low'
    END
  ) STORED,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT,
  
  -- Indexes
  INDEX idx_plagiarism_report_assessment (assessment_id),
  INDEX idx_plagiarism_report_user (user_id),
  INDEX idx_plagiarism_report_risk (risk_level)
);

-- Function to calculate risk score based on events
CREATE OR REPLACE FUNCTION calculate_plagiarism_risk_score(
  p_assessment_id UUID,
  p_assessment_type TEXT
) RETURNS DECIMAL AS $$
DECLARE
  v_score DECIMAL := 0;
  v_event_count RECORD;
  v_pattern_multiplier DECIMAL := 1;
  v_time_window INTEGER := 300; -- 5 minutes
BEGIN
  -- Count events by type
  SELECT 
    COUNT(*) FILTER (WHERE event_type = 'paste') as paste_count,
    COUNT(*) FILTER (WHERE event_type = 'copy') as copy_count,
    COUNT(*) FILTER (WHERE event_type = 'dev_tools') as dev_tools_count,
    COUNT(*) FILTER (WHERE event_type = 'tab_switch') as tab_switch_count,
    COUNT(*) FILTER (WHERE event_type = 'external_paste') as external_paste_count
  INTO v_event_count
  FROM plagiarism_events
  WHERE assessment_id = p_assessment_id;
  
  -- Base scoring
  v_score := v_score + (v_event_count.paste_count * 0.15);
  v_score := v_score + (v_event_count.copy_count * 0.05);
  v_score := v_score + (v_event_count.dev_tools_count * 0.25);
  v_score := v_score + (v_event_count.tab_switch_count * 0.10);
  v_score := v_score + (v_event_count.external_paste_count * 0.30);
  
  -- Check for suspicious patterns
  -- Pattern 1: Rapid paste events (multiple pastes within 5 minutes)
  IF EXISTS (
    SELECT 1
    FROM plagiarism_events e1
    JOIN plagiarism_events e2 ON e1.assessment_id = e2.assessment_id
    WHERE e1.assessment_id = p_assessment_id
      AND e1.event_type = 'paste'
      AND e2.event_type = 'paste'
      AND e1.id != e2.id
      AND ABS(EXTRACT(EPOCH FROM (e2.timestamp - e1.timestamp))) < v_time_window
    HAVING COUNT(*) > 3
  ) THEN
    v_pattern_multiplier := v_pattern_multiplier * 1.5;
  END IF;
  
  -- Pattern 2: Tab switch followed by paste
  IF EXISTS (
    SELECT 1
    FROM plagiarism_events e1
    JOIN plagiarism_events e2 ON e1.assessment_id = e2.assessment_id
    WHERE e1.assessment_id = p_assessment_id
      AND e1.event_type = 'tab_switch'
      AND e2.event_type = 'paste'
      AND e2.timestamp > e1.timestamp
      AND e2.timestamp - e1.timestamp < INTERVAL '30 seconds'
  ) THEN
    v_pattern_multiplier := v_pattern_multiplier * 2.0;
  END IF;
  
  -- Apply pattern multiplier and cap at 1.0
  v_score := LEAST(v_score * v_pattern_multiplier, 1.0);
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Function to generate plagiarism report
CREATE OR REPLACE FUNCTION generate_plagiarism_report(
  p_assessment_id UUID,
  p_assessment_type TEXT,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_report_id UUID;
  v_event_counts RECORD;
  v_risk_score DECIMAL;
  v_patterns JSONB;
BEGIN
  -- Calculate event counts
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE event_type = 'copy') as copy_count,
    COUNT(*) FILTER (WHERE event_type = 'paste') as paste_count,
    COUNT(*) FILTER (WHERE event_type = 'cut') as cut_count,
    COUNT(*) FILTER (WHERE event_type = 'tab_switch') as tab_switch_count,
    COUNT(*) FILTER (WHERE event_type = 'window_blur') as window_blur_count,
    COUNT(*) FILTER (WHERE event_type = 'dev_tools') as dev_tools_count
  INTO v_event_counts
  FROM plagiarism_events
  WHERE assessment_id = p_assessment_id;
  
  -- Calculate risk score
  v_risk_score := calculate_plagiarism_risk_score(p_assessment_id, p_assessment_type);
  
  -- Analyze patterns
  v_patterns := jsonb_build_object(
    'rapid_paste', EXISTS (
      SELECT 1 FROM plagiarism_events 
      WHERE assessment_id = p_assessment_id 
        AND event_type = 'paste'
      GROUP BY DATE_TRUNC('minute', timestamp)
      HAVING COUNT(*) > 3
    ),
    'external_source_paste', EXISTS (
      SELECT 1 FROM plagiarism_events e1
      JOIN plagiarism_events e2 ON e1.assessment_id = e2.assessment_id
      WHERE e1.assessment_id = p_assessment_id
        AND e1.event_type = 'tab_switch'
        AND e2.event_type = 'paste'
        AND e2.timestamp BETWEEN e1.timestamp AND e1.timestamp + INTERVAL '30 seconds'
    ),
    'dev_tools_usage', v_event_counts.dev_tools_count > 0
  );
  
  -- Insert report
  INSERT INTO plagiarism_reports (
    assessment_id,
    assessment_type,
    user_id,
    total_events,
    copy_events,
    paste_events,
    cut_events,
    tab_switches,
    window_blurs,
    dev_tools_attempts,
    suspicious_patterns,
    risk_score
  ) VALUES (
    p_assessment_id,
    p_assessment_type,
    p_user_id,
    v_event_counts.total,
    v_event_counts.copy_count,
    v_event_counts.paste_count,
    v_event_counts.cut_count,
    v_event_counts.tab_switch_count,
    v_event_counts.window_blur_count,
    v_event_counts.dev_tools_count,
    v_patterns,
    v_risk_score
  ) RETURNING id INTO v_report_id;
  
  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql;

-- RLS policies
ALTER TABLE plagiarism_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE plagiarism_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own plagiarism events
CREATE POLICY "Users can view own plagiarism events"
  ON plagiarism_events FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create plagiarism events for their assessments
CREATE POLICY "Users can create own plagiarism events"
  ON plagiarism_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own plagiarism reports
CREATE POLICY "Users can view own plagiarism reports"
  ON plagiarism_reports FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all plagiarism reports
CREATE POLICY "Admins can view all plagiarism reports"
  ON plagiarism_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Admins can update plagiarism reports (for review)
CREATE POLICY "Admins can update plagiarism reports"
  ON plagiarism_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );
