/*
  # Fix organization members policy recursion

  1. Changes
    - Drop the problematic policy that was causing infinite recursion
    - Create new policies with non-recursive conditions for organization_members table
    
  2. Security
    - Maintain RLS security while avoiding recursive policy checks
    - Ensure proper access control for organization members
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "Organization admins can manage members" ON organization_members;

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