-- Create assessment instances table for tracking candidate assessments
CREATE TABLE assessment_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL,
  assessment_type TEXT NOT NULL,
  candidate_email TEXT NOT NULL,
  candidate_first_name TEXT NOT NULL,
  candidate_last_name TEXT NOT NULL,
  candidate_id_number TEXT NOT NULL,
  verification_attempts INT DEFAULT 0,
  verification_status TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'pending', -- pending, started, completed, expired
  access_code UUID DEFAULT uuid_generate_v4(),
  start_time TIMESTAMPTZ,
  completion_time TIMESTAMPTZ,
  time_limit INTERVAL,
  expires_at TIMESTAMPTZ,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for faster access by access_code
CREATE INDEX idx_assessment_instances_access_code ON assessment_instances(access_code);

-- Create index for organization filtering
CREATE INDEX idx_assessment_instances_organization ON assessment_instances(organization_id);

-- Create index for assessment filtering
CREATE INDEX idx_assessment_instances_assessment ON assessment_instances(assessment_id, assessment_type);

-- Enable RLS
ALTER TABLE assessment_instances ENABLE ROW LEVEL SECURITY;

-- Create policy for organization members to view their organization's assessment instances
CREATE POLICY "Organization members can view their assessment instances"
  ON assessment_instances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.organization_id = assessment_instances.organization_id
    )
  );

-- Create policy for organization members to create assessment instances
CREATE POLICY "Organization members can create assessment instances"
  ON assessment_instances FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.organization_id = assessment_instances.organization_id
    )
  );

-- Create policy for public access to assessment instances via access_code
CREATE POLICY "Public access to assessment instances via access_code"
  ON assessment_instances FOR SELECT
  TO anon
  USING (
    access_code IS NOT NULL
  );

-- Create policy for public updates to assessment instances via access_code
CREATE POLICY "Public updates to assessment instances via access_code"
  ON assessment_instances FOR UPDATE
  TO anon
  USING (
    access_code IS NOT NULL
  )
  WITH CHECK (
    -- Only allow updates to specific fields
    (
      verification_attempts IS NOT NULL OR
      verification_status IS NOT NULL OR
      status IS NOT NULL OR
      start_time IS NOT NULL OR
      completion_time IS NOT NULL
    )
  );
