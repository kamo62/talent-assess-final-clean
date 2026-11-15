/*
  # Fix RLS policies and relationships

  1. Changes
    - Update organization_members RLS policies to prevent recursion
    - Update user_roles RLS policies to prevent recursion
    - Add foreign key relationship between code_assessments and assessment_order
    - Add trigger to create user profile on user creation

  2. Security
    - Maintain RLS while fixing recursion issues
    - Ensure proper access control
*/

-- Fix organization_members policies
DROP POLICY IF EXISTS "View organization members" ON organization_members;
DROP POLICY IF EXISTS "Manage organization members" ON organization_members;

CREATE POLICY "View organization members"
ON organization_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = organization_members.organization_id
    AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = o.id
      AND om.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Manage organization members"
ON organization_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = organization_members.organization_id
    AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = o.id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  )
);

-- Fix user_roles policies
DROP POLICY IF EXISTS "Only admins can manage user roles" ON user_roles;
DROP POLICY IF EXISTS "User roles are viewable by authenticated users" ON user_roles;

CREATE POLICY "Only admins can manage user roles"
ON user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM roles r
    WHERE r.id IN (
      SELECT role_id FROM user_roles ur2
      WHERE ur2.user_id = auth.uid()
    )
    AND r.name = 'admin'
  )
);

CREATE POLICY "User roles are viewable by authenticated users"
ON user_roles
FOR SELECT
TO authenticated
USING (true);

-- Add relationship between code_assessments and assessment_order
ALTER TABLE assessment_order
ADD COLUMN IF NOT EXISTS assessment_id uuid REFERENCES code_assessments(id) ON DELETE CASCADE;

-- Create trigger to create user profile on user creation
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();