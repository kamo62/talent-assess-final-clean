/*
  # Fix organization members policy recursion

  1. Changes
    - Drop and recreate the "Manage organization members" policy to fix infinite recursion
    - The policy was comparing organization_id with itself instead of the outer query's organization_id

  2. Security
    - Maintains the same security level but fixes the recursion issue
    - Only organization owners and admins can manage members
*/

DROP POLICY IF EXISTS "Manage organization members" ON organization_members;

CREATE POLICY "Manage organization members" ON organization_members
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  ));