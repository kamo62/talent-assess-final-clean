-- Add organization_id to code_assessments table
ALTER TABLE code_assessments 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Update RLS policies to respect organization boundaries
DROP POLICY IF EXISTS "Code assessments are viewable by authenticated users" ON code_assessments;

CREATE POLICY "View code assessments in same organization"
ON code_assessments FOR SELECT
TO authenticated
USING (
  organization_id IS NULL OR -- Legacy assessments without org
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Manage code assessments in organization"
ON code_assessments FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id FROM organization_members om
    WHERE om.user_id = auth.uid() 
    AND (om.role IN ('admin', 'owner') OR om.permissions->>'manage_assessments' = 'true')
  )
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_code_assessments_org ON code_assessments(organization_id); 