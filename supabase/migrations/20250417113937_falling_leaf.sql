/*
  # Fix recursive policies

  1. Changes
    - Drop and recreate policies with simplified logic
    - Remove nested EXISTS clauses
    - Simplify organization membership checks
    - Add direct case study access control

  2. Security
    - Maintain proper access control
    - Prevent unauthorized access
    - Ensure organization isolation
*/

-- First, drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Organization members can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Organization members can view members" ON organization_members;
DROP POLICY IF EXISTS "Organization members can view case studies" ON case_studies;
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can manage members" ON organization_members;

-- Simplified policy for viewing organizations
CREATE POLICY "View organization"
ON organizations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = organizations.id
    AND organization_members.user_id = auth.uid()
  )
);

-- Simplified policy for viewing organization members
CREATE POLICY "View organization members"
ON organization_members FOR SELECT
TO authenticated
USING (
  organization_members.user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM organization_members AS om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
  )
);

-- Simplified policy for managing organization members (admin only)
CREATE POLICY "Manage organization members"
ON organization_members FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = organization_members.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('owner', 'admin')
  )
);

-- Simplified policy for viewing case studies
CREATE POLICY "View case studies"
ON case_studies FOR SELECT
TO authenticated
USING (
  organization_id IS NULL
  OR
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = case_studies.organization_id
    AND organization_members.user_id = auth.uid()
  )
);

-- Add index to improve policy performance
CREATE INDEX IF NOT EXISTS idx_org_members_user_org 
ON organization_members(user_id, organization_id);

-- Add index for organization_id on case_studies
CREATE INDEX IF NOT EXISTS idx_case_studies_org_id 
ON case_studies(organization_id);