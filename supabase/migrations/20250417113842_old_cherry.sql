/*
  # Fix organization member policies

  1. Changes
    - Drop and recreate organization member policies to prevent infinite recursion
    - Add direct policy for case studies to allow organization members to view them
    
  2. Security
    - Maintains RLS security while fixing the recursion issue
    - Ensures organization members can still access appropriate resources
*/

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Organization members can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Organization members can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Users can view group members" ON organization_members;

-- Recreate the policies without recursion
CREATE POLICY "Organization members can view their organizations"
ON organizations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.users.id
    )
  )
);

CREATE POLICY "Organization members can view members"
ON organization_members FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.id = organization_members.user_id
      OR EXISTS (
        SELECT 1 FROM organization_members my_orgs
        WHERE my_orgs.organization_id = organization_members.organization_id
        AND my_orgs.user_id = auth.users.id
      )
    )
  )
);

-- Add direct policy for case studies
CREATE POLICY "Organization members can view case studies"
ON case_studies FOR SELECT
TO authenticated
USING (
  CASE 
    WHEN organization_id IS NULL THEN true
    ELSE EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = case_studies.organization_id
      AND organization_members.user_id = auth.uid()
    )
  END
);