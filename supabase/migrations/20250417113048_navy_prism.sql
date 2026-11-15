/*
  # Add remaining features

  1. New Tables
    - `assessment_progress` - Track user progress on assessments
    - `assessment_templates` - Store reusable assessment templates
    - `test_cases` - Store test cases for code assessments
    - `assessment_analytics` - Store analytics data
    - `assessment_rubrics` - Store rubrics for case studies

  2. Changes
    - Add new columns to existing tables
    - Add relationships between tables

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies
*/

-- Assessment Progress
CREATE TABLE assessment_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  assessment_id uuid NOT NULL,
  assessment_type text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  time_spent interval DEFAULT '0'::interval,
  last_activity timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT status_check CHECK (status IN ('not_started', 'in_progress', 'completed'))
);

ALTER TABLE assessment_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
  ON assessment_progress
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own progress"
  ON assessment_progress
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Assessment Templates
CREATE TABLE assessment_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  type text NOT NULL,
  difficulty difficulty_level NOT NULL,
  category text NOT NULL,
  tags text[] DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE assessment_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates are viewable by authenticated users"
  ON assessment_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage templates"
  ON assessment_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Test Cases
CREATE TABLE test_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES code_assessments(id),
  input text NOT NULL,
  expected_output text NOT NULL,
  is_hidden boolean DEFAULT false,
  order_number integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Test cases are viewable by authenticated users"
  ON test_cases
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage test cases"
  ON test_cases
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Assessment Analytics
CREATE TABLE assessment_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  assessment_type text NOT NULL,
  total_attempts integer DEFAULT 0,
  avg_completion_time interval DEFAULT '0'::interval,
  success_rate decimal DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE assessment_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Analytics are viewable by admins"
  ON assessment_analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Assessment Rubrics
CREATE TABLE assessment_rubrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_study_id uuid REFERENCES case_studies(id),
  criteria text NOT NULL,
  description text NOT NULL,
  max_score integer NOT NULL,
  weight decimal NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE assessment_rubrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rubrics are viewable by authenticated users"
  ON assessment_rubrics
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage rubrics"
  ON assessment_rubrics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Add triggers for updated_at columns
CREATE TRIGGER update_assessment_progress_updated_at
  BEFORE UPDATE ON assessment_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_templates_updated_at
  BEFORE UPDATE ON assessment_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_cases_updated_at
  BEFORE UPDATE ON test_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_analytics_updated_at
  BEFORE UPDATE ON assessment_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_rubrics_updated_at
  BEFORE UPDATE ON assessment_rubrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();