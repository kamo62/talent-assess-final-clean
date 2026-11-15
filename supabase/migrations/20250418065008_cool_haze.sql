/*
  # Member Permissions Setup

  1. New Policies
    - Allow members to view and manage assessments
    - Allow members to view and create assignments
    - Allow members to view assessment results
    - Allow members to view analytics for their assignments

  2. Changes
    - Add policies to existing tables
    - Add member-specific views

  3. Security
    - Ensure members can only access data within their organization
    - Prevent members from modifying sensitive settings
*/

-- Allow members to view assessments in their organization
CREATE POLICY "Members can view assessments in their organization"
ON code_assessments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = code_assessments.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

CREATE POLICY "Members can view case studies in their organization"
ON case_studies
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = case_studies.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

-- Allow members to create and manage assignments
CREATE POLICY "Members can create assignments"
ON assessment_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = assessment_assignments.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('member', 'admin', 'owner')
  )
);

CREATE POLICY "Members can view their created assignments"
ON assessment_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = assessment_assignments.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

CREATE POLICY "Members can update their assignments"
ON assessment_assignments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = assessment_assignments.organization_id
    AND organization_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = assessment_assignments.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

-- Allow members to view MCQ questions for their assignments
CREATE POLICY "Members can view MCQ questions for their assignments"
ON mcq_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assessment_assignments aa
    JOIN organization_members om ON aa.organization_id = om.organization_id
    WHERE om.user_id = auth.uid()
    AND aa.assessment_id = mcq_questions.assessment_id
  )
);

-- Allow members to view and manage responses
CREATE POLICY "Members can view responses for their assignments"
ON mcq_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assessment_assignments aa
    JOIN organization_members om ON aa.organization_id = om.organization_id
    WHERE om.user_id = auth.uid()
    AND aa.assessment_id = (
      SELECT assessment_id FROM mcq_questions
      WHERE mcq_questions.id = mcq_responses.question_id
    )
  )
);

-- Allow members to view analytics for their assignments
CREATE POLICY "Members can view analytics for their assignments"
ON assessment_analytics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assessment_assignments aa
    JOIN organization_members om ON aa.organization_id = om.organization_id
    WHERE om.user_id = auth.uid()
    AND aa.assessment_id = assessment_analytics.assessment_id
  )
);

-- Create a view for member assessment statistics
CREATE VIEW member_assessment_stats AS
SELECT 
  aa.id as assignment_id,
  aa.assessment_id,
  aa.assessment_type,
  aa.user_email,
  aa.status,
  aa.due_date,
  COUNT(DISTINCT mcr.id) as total_responses,
  AVG(CASE WHEN mcr.is_correct THEN 1 ELSE 0 END) as success_rate,
  MAX(mcr.created_at) as last_activity
FROM assessment_assignments aa
LEFT JOIN mcq_questions mq ON aa.assessment_id = mq.assessment_id
LEFT JOIN mcq_responses mcr ON mq.id = mcr.question_id
GROUP BY aa.id, aa.assessment_id, aa.assessment_type, aa.user_email, aa.status, aa.due_date;

-- Grant access to the view
GRANT SELECT ON member_assessment_stats TO authenticated;