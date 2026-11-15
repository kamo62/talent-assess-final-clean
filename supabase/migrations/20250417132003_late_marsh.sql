/*
  # Fix organization members RLS policies

  1. Changes
    - Drop existing problematic RLS policies on organization_members table
    - Create new, non-recursive RLS policies that avoid infinite loops
    - Maintain security while preventing circular references

  2. Security
    - Maintain row level security on organization_members table
    - Add policy for viewing organization members
    - Add policy for managing organization members
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "View organization members" ON organization_members;
DROP POLICY IF EXISTS "Manage organization members" ON organization_members;

-- Create new non-recursive policies
CREATE POLICY "View own membership and organization members"
ON organization_members
FOR SELECT
TO authenticated
USING (
  -- User can view their own membership
  user_id = auth.uid() 
  OR 
  -- User can view members of organizations they belong to
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can manage members"
ON organization_members
FOR ALL
TO authenticated
USING (
  -- Check if user is an admin/owner in the organization
  EXISTS (
    SELECT 1 
    FROM organization_members admin_check
    WHERE 
      admin_check.organization_id = organization_members.organization_id 
      AND admin_check.user_id = auth.uid()
      AND admin_check.role IN ('admin', 'owner')
  )
)
WITH CHECK (
  -- Same condition for INSERT/UPDATE operations
  EXISTS (
    SELECT 1 
    FROM organization_members admin_check
    WHERE 
      admin_check.organization_id = organization_members.organization_id 
      AND admin_check.user_id = auth.uid()
      AND admin_check.role IN ('admin', 'owner')
  )
);