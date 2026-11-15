/*
  # Enhance MCQ Assessment Features

  1. Changes
    - Add MCQ-specific fields to code_assessments table
    - Add MCQ responses table for tracking answers
    - Add MCQ analytics table
    - Add MCQ categories for organization

  2. Security
    - Enable RLS on new tables
    - Add policies for candidates and admins
*/

-- Add MCQ-specific fields to assessment_types
INSERT INTO assessment_types (name, description) 
VALUES ('mcq', 'Multiple Choice Questions Assessment');

-- Create MCQ categories table
CREATE TABLE mcq_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add category reference to MCQ questions
ALTER TABLE mcq_questions
ADD COLUMN category_id uuid REFERENCES mcq_categories(id),
ADD COLUMN time_limit interval,
ADD COLUMN shuffle_options boolean DEFAULT false,
ADD COLUMN show_explanation boolean DEFAULT true;

-- Create MCQ responses table
CREATE TABLE mcq_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES mcq_questions(id),
  user_id uuid REFERENCES auth.users(id),
  selected_answer text NOT NULL,
  is_correct boolean NOT NULL,
  time_taken interval,
  created_at timestamptz DEFAULT now()
);

-- Create MCQ analytics table
CREATE TABLE mcq_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES mcq_questions(id),
  total_attempts integer DEFAULT 0,
  correct_attempts integer DEFAULT 0,
  avg_time_taken interval DEFAULT '0'::interval,
  difficulty_rating numeric DEFAULT 0,
  discrimination_index numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE mcq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_analytics ENABLE ROW LEVEL SECURITY;

-- Policies for MCQ categories
CREATE POLICY "MCQ categories are viewable by authenticated users"
  ON mcq_categories FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = mcq_categories.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Policies for MCQ responses
CREATE POLICY "Users can view their own responses"
  ON mcq_responses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own responses"
  ON mcq_responses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policies for MCQ analytics
CREATE POLICY "Analytics are viewable by admins"
  ON mcq_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER update_mcq_categories_updated_at
  BEFORE UPDATE ON mcq_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mcq_analytics_updated_at
  BEFORE UPDATE ON mcq_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update MCQ analytics
CREATE OR REPLACE FUNCTION update_mcq_analytics()
RETURNS trigger AS $$
BEGIN
  INSERT INTO mcq_analytics (question_id)
  VALUES (NEW.question_id)
  ON CONFLICT (question_id) DO UPDATE
  SET 
    total_attempts = mcq_analytics.total_attempts + 1,
    correct_attempts = mcq_analytics.correct_attempts + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
    avg_time_taken = (mcq_analytics.avg_time_taken * mcq_analytics.total_attempts + NEW.time_taken) / (mcq_analytics.total_attempts + 1),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for updating analytics
CREATE TRIGGER update_mcq_analytics_on_response
  AFTER INSERT ON mcq_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_mcq_analytics();