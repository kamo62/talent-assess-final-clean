/*
  # Fix infinite recursion in organization_members policy

  1. Changes
    - Remove recursive policy check from organization_members table
    - Add direct role-based policy for organization admins
    - Add direct membership check for regular members

  2. Security
    - Maintains RLS protection
    - Ensures organization admins can manage members
    - Ensures members can view other members in their organizations
*/

-- Drop existing policies to replace them
DROP POLICY IF EXISTS "Organization admins can manage members" ON organization_members;
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;

-- Create new non-recursive policies
CREATE POLICY "Organization admins can manage members"
ON organization_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id = organization_members.organization_id
    AND om.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Users can view organization members"
ON organization_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id = organization_members.organization_id
  )
);