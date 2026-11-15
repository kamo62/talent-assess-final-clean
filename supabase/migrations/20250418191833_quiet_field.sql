-- Add metadata column to case_studies if it doesn't exist
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Create index for faster searches on metadata
CREATE INDEX IF NOT EXISTS idx_case_studies_metadata ON case_studies USING gin (metadata);

-- Add comment explaining the metadata structure
COMMENT ON COLUMN case_studies.metadata IS 'Stores assessment metadata including roleCategory, seniority, framework, skills, estimatedDuration, etc.';

-- Update case_studies policies to make them organization-agnostic
DROP POLICY IF EXISTS "View case studies" ON case_studies;

CREATE POLICY "View case studies"
ON case_studies FOR SELECT
TO authenticated
USING (true);  -- Allow all authenticated users to view all case studies