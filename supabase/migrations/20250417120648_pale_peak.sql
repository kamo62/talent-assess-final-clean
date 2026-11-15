/*
  # Add Recruitment Pipeline Features

  1. New Tables
    - `candidates`
      - Basic candidate information
      - Current pipeline stage
      - Application metadata
    
    - `pipeline_stages`
      - Configurable recruitment stages
      - Order tracking
      - Stage settings

    - `interviews`
      - Interview scheduling
      - Calendar integration
      - Reminder settings

    - `feedback`
      - Interview feedback
      - Score cards
      - Aggregated ratings

    - `scoring_criteria`
      - Customizable evaluation criteria
      - Section weights
      - Pass/fail thresholds

  2. Security
    - Enable RLS on all tables
    - Add policies for recruiters and admins
*/

-- Create enum for pipeline stages
CREATE TYPE pipeline_stage AS ENUM (
  'applied',
  'screening',
  'assessment',
  'interview',
  'offer',
  'hired',
  'rejected'
);

-- Create candidates table
CREATE TABLE candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  current_stage pipeline_stage DEFAULT 'applied',
  position_applied text NOT NULL,
  resume_url text,
  cover_letter_url text,
  source text,
  notes text,
  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create pipeline_stages table for customizable stages
CREATE TABLE pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  order_number integer NOT NULL,
  is_active boolean DEFAULT true,
  requires_feedback boolean DEFAULT false,
  auto_advance_on_complete boolean DEFAULT false,
  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, order_number)
);

-- Create interviews table
CREATE TABLE interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES candidates(id),
  interviewer_id uuid REFERENCES auth.users(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  type text NOT NULL,
  location text,
  meeting_link text,
  status text DEFAULT 'scheduled',
  calendar_event_id text,
  reminder_sent boolean DEFAULT false,
  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_status CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled'))
);

-- Create feedback table
CREATE TABLE feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES candidates(id),
  interviewer_id uuid REFERENCES auth.users(id),
  interview_id uuid REFERENCES interviews(id),
  overall_rating integer NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  recommendation text NOT NULL CHECK (recommendation IN ('strong_yes', 'yes', 'maybe', 'no', 'strong_no')),
  strengths text[],
  weaknesses text[],
  notes text,
  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create scoring_criteria table
CREATE TABLE scoring_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  weight numeric NOT NULL CHECK (weight BETWEEN 0 AND 1),
  passing_score numeric NOT NULL,
  is_required boolean DEFAULT true,
  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create candidate_scores table
CREATE TABLE candidate_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES candidates(id),
  criteria_id uuid REFERENCES scoring_criteria(id),
  score numeric NOT NULL,
  notes text,
  evaluator_id uuid REFERENCES auth.users(id),
  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_score CHECK (score BETWEEN 0 AND 100)
);

-- Enable RLS and create policies
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_scores ENABLE ROW LEVEL SECURITY;

-- Policies for candidates
CREATE POLICY "Users can view candidates in their organization"
  ON candidates FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = candidates.organization_id
    AND organization_members.user_id = auth.uid()
  ));

-- Policies for pipeline stages
CREATE POLICY "Users can view pipeline stages in their organization"
  ON pipeline_stages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = pipeline_stages.organization_id
    AND organization_members.user_id = auth.uid()
  ));

-- Policies for interviews
CREATE POLICY "Users can view interviews in their organization"
  ON interviews FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = interviews.organization_id
    AND organization_members.user_id = auth.uid()
  ));

-- Policies for feedback
CREATE POLICY "Users can view feedback in their organization"
  ON feedback FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = feedback.organization_id
    AND organization_members.user_id = auth.uid()
  ));

-- Add triggers for updated_at
CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_stages_updated_at
  BEFORE UPDATE ON pipeline_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interviews_updated_at
  BEFORE UPDATE ON interviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();