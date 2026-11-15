/*
  # Add Candidate Features

  1. New Tables
    - `assessment_types` - Different types of assessments
    - `mcq_questions` - Multiple choice questions
    - `behavioral_questions` - Video/audio questions
    - `whiteboard_sessions` - System design exercises
    - `proctoring_events` - Anti-cheat monitoring
    - `collaboration_sessions` - Live coding sessions

  2. Security
    - Enable RLS on all tables
    - Add policies for candidates
*/

-- Create assessment_types table
CREATE TABLE assessment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  requires_proctoring boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create mcq_questions table
CREATE TABLE mcq_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES code_assessments(id),
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_answer text NOT NULL,
  explanation text,
  points integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create behavioral_questions table
CREATE TABLE behavioral_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES code_assessments(id),
  question text NOT NULL,
  time_limit interval,
  response_type text NOT NULL CHECK (response_type IN ('video', 'audio')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create whiteboard_sessions table
CREATE TABLE whiteboard_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES code_assessments(id),
  title text NOT NULL,
  description text NOT NULL,
  canvas_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create proctoring_events table
CREATE TABLE proctoring_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  event_data jsonb,
  screenshot_url text,
  created_at timestamptz DEFAULT now()
);

-- Create collaboration_sessions table
CREATE TABLE collaboration_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  candidate_id uuid REFERENCES auth.users(id),
  interviewer_id uuid REFERENCES auth.users(id),
  session_data jsonb,
  recording_url text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE assessment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whiteboard_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proctoring_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Assessment types are viewable by authenticated users"
  ON assessment_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "MCQ questions are viewable by assigned users"
  ON mcq_questions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM assessment_assignments aa
    WHERE aa.assessment_id = mcq_questions.assessment_id
    AND aa.user_email = auth.email()
  ));

CREATE POLICY "Behavioral questions are viewable by assigned users"
  ON behavioral_questions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM assessment_assignments aa
    WHERE aa.assessment_id = behavioral_questions.assessment_id
    AND aa.user_email = auth.email()
  ));

CREATE POLICY "Whiteboard sessions are viewable by participants"
  ON whiteboard_sessions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM assessment_assignments aa
    WHERE aa.assessment_id = whiteboard_sessions.assessment_id
    AND aa.user_email = auth.email()
  ));

CREATE POLICY "Proctoring events can be created by authenticated users"
  ON proctoring_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Collaboration sessions are viewable by participants"
  ON collaboration_sessions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = candidate_id
    OR auth.uid() = interviewer_id
  );

-- Add triggers for updated_at
CREATE TRIGGER update_assessment_types_updated_at
  BEFORE UPDATE ON assessment_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mcq_questions_updated_at
  BEFORE UPDATE ON mcq_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_behavioral_questions_updated_at
  BEFORE UPDATE ON behavioral_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whiteboard_sessions_updated_at
  BEFORE UPDATE ON whiteboard_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collaboration_sessions_updated_at
  BEFORE UPDATE ON collaboration_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();