-- Add Judge0 configuration to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS judge0_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS judge0_api_url text DEFAULT 'https://judge0-ce.p.rapidapi.com',
ADD COLUMN IF NOT EXISTS judge0_api_key text;

-- Add execution tracking to code_submissions
ALTER TABLE code_submissions
ADD COLUMN IF NOT EXISTS execution_token text,
ADD COLUMN IF NOT EXISTS execution_status text,
ADD COLUMN IF NOT EXISTS execution_output text,
ADD COLUMN IF NOT EXISTS execution_error text,
ADD COLUMN IF NOT EXISTS execution_time numeric,
ADD COLUMN IF NOT EXISTS execution_memory integer,
ADD COLUMN IF NOT EXISTS test_results jsonb DEFAULT '[]'::jsonb;

-- Create code execution logs table
CREATE TABLE IF NOT EXISTS code_execution_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id uuid REFERENCES code_submissions(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  judge0_token text,
  status text,
  stdout text,
  stderr text,
  compile_output text,
  time numeric,
  memory integer,
  credits_used integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now()
);

-- Create test cases table for code assessments
CREATE TABLE IF NOT EXISTS code_test_cases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id uuid REFERENCES code_assessments(id) ON DELETE CASCADE,
  name text NOT NULL,
  input text,
  expected_output text NOT NULL,
  is_hidden boolean DEFAULT false,
  weight integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now()
);

-- Create function to execute code with credits
CREATE OR REPLACE FUNCTION execute_code_with_credits(
  p_submission_id uuid,
  p_organization_id uuid,
  p_credits_required integer DEFAULT 1
)
RETURNS boolean AS $$
DECLARE
  v_has_credits boolean;
BEGIN
  -- Check if organization has enough credits
  SELECT use_credits(p_organization_id, p_credits_required, 'Code execution') INTO v_has_credits;
  
  IF NOT v_has_credits THEN
    -- Update submission with error
    UPDATE code_submissions
    SET 
      execution_status = 'error',
      execution_error = 'Insufficient credits for code execution'
    WHERE id = p_submission_id;
    
    RETURN false;
  END IF;
  
  -- Log the execution
  INSERT INTO code_execution_logs (submission_id, organization_id, credits_used)
  VALUES (p_submission_id, p_organization_id, p_credits_required);
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for code_execution_logs
ALTER TABLE code_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own execution logs"
ON code_execution_logs FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- RLS Policies for code_test_cases
ALTER TABLE code_test_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View test cases"
ON code_test_cases FOR SELECT
TO authenticated
USING (
  assessment_id IN (
    SELECT id FROM code_assessments
    -- Test cases are viewable by all authenticated users
  )
);

CREATE POLICY "Manage test cases"
ON code_test_cases FOR ALL
TO authenticated
USING (
  assessment_id IN (
    SELECT ca.id FROM code_assessments ca
    JOIN organization_members om ON om.organization_id = ca.organization_id
    WHERE om.user_id = auth.uid() 
    AND (om.role IN ('admin', 'owner') OR om.permissions->>'manage_assessments' = 'true')
  )
);

-- Add indexes
CREATE INDEX idx_code_execution_logs_submission ON code_execution_logs(submission_id);
CREATE INDEX idx_code_execution_logs_org ON code_execution_logs(organization_id);
CREATE INDEX idx_code_test_cases_assessment ON code_test_cases(assessment_id);

-- Add default Judge0 language mappings
CREATE TABLE IF NOT EXISTS judge0_languages (
  id integer PRIMARY KEY,
  name text NOT NULL,
  source_file text,
  compile_cmd text,
  run_cmd text
);

-- Insert common language mappings for Judge0
INSERT INTO judge0_languages (id, name, source_file, compile_cmd, run_cmd) VALUES
  (50, 'C (GCC 9.2.0)', 'main.c', NULL, NULL),
  (54, 'C++ (GCC 9.2.0)', 'main.cpp', NULL, NULL),
  (62, 'Java (OpenJDK 13.0.1)', 'Main.java', NULL, NULL),
  (63, 'JavaScript (Node.js 12.14.0)', 'main.js', NULL, NULL),
  (71, 'Python (3.8.1)', 'main.py', NULL, NULL),
  (72, 'Ruby (2.7.0)', 'main.rb', NULL, NULL),
  (73, 'Rust (1.40.0)', 'main.rs', NULL, NULL),
  (74, 'TypeScript (3.7.4)', 'main.ts', NULL, NULL),
  (78, 'Kotlin (1.3.70)', 'Main.kt', NULL, NULL),
  (79, 'Scala (2.13.2)', 'Main.scala', NULL, NULL),
  (80, 'R (4.0.0)', 'main.r', NULL, NULL),
  (82, 'SQL (SQLite 3.27.2)', 'main.sql', NULL, NULL),
  (83, 'Swift (5.2.3)', 'main.swift', NULL, NULL),
  (84, 'Visual Basic.Net (vbnc 0.0.0.5943)', 'Main.vb', NULL, NULL),
  (85, 'Perl (5.28.1)', 'main.pl', NULL, NULL),
  (86, 'Clojure (1.10.1)', 'main.clj', NULL, NULL),
  (87, 'F# (.NET Core SDK 3.1.202)', 'main.fs', NULL, NULL),
  (88, 'Groovy (3.0.3)', 'Main.groovy', NULL, NULL),
  (89, 'Multi-file program', NULL, NULL, NULL),
  (90, 'Executable', NULL, NULL, NULL),
  (91, 'Objective-C (Clang 7.0.1)', 'main.m', NULL, NULL),
  (92, 'Common Lisp (SBCL 2.0.0)', 'main.lisp', NULL, NULL),
  (93, 'Octave (5.2.0)', 'main.m', NULL, NULL)
ON CONFLICT (id) DO NOTHING;
