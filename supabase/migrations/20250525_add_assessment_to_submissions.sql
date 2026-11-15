-- Add assessment_id to code_submissions table
ALTER TABLE code_submissions 
ADD COLUMN IF NOT EXISTS assessment_id uuid REFERENCES code_assessments(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_code_submissions_assessment ON code_submissions(assessment_id); 