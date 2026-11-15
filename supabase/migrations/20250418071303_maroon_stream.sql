/*
  # Add Custom Permissions System

  1. New Tables
    - permission_types: Defines available permissions
    - organization_permissions: Links permissions to org members
    - permission_defaults: Default permission templates

  2. Changes
    - Add permission management to existing tables
    - Update member policies

  3. Security
    - Enable RLS on new tables
    - Add appropriate policies
*/

-- Create permission_types table
CREATE TABLE permission_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create organization_permissions table
CREATE TABLE organization_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  member_id uuid REFERENCES organization_members(id) ON DELETE CASCADE,
  permission_type_id uuid REFERENCES permission_types(id) ON DELETE CASCADE,
  is_granted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (organization_id, member_id, permission_type_id)
);

-- Create permission_defaults table
CREATE TABLE permission_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  role text NOT NULL,
  permission_type_id uuid REFERENCES permission_types(id) ON DELETE CASCADE,
  is_granted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (organization_id, role, permission_type_id)
);

-- Enable RLS
ALTER TABLE permission_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_defaults ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Permission types are viewable by authenticated users"
  ON permission_types
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Organization admins can manage permissions"
  ON organization_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_permissions.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Members can view their permissions"
  ON organization_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.id = organization_permissions.member_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can manage permission defaults"
  ON permission_defaults
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = permission_defaults.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- Insert default permission types
INSERT INTO permission_types (name, description, category) VALUES
  ('create_assessment', 'Can create new assessments', 'assessment'),
  ('edit_assessment', 'Can edit existing assessments', 'assessment'),
  ('delete_assessment', 'Can delete assessments', 'assessment'),
  ('view_analytics', 'Can view assessment analytics', 'analytics'),
  ('manage_candidates', 'Can manage candidates', 'recruitment'),
  ('send_invites', 'Can send assessment invites', 'assessment'),
  ('view_templates', 'Can view assessment templates', 'template'),
  ('create_templates', 'Can create assessment templates', 'template'),
  ('manage_mcq', 'Can manage MCQ questions', 'assessment'),
  ('view_audit_logs', 'Can view audit logs', 'admin');

-- Create function to set default permissions
CREATE OR REPLACE FUNCTION set_default_member_permissions()
RETURNS trigger AS $$
BEGIN
  INSERT INTO organization_permissions (
    organization_id,
    member_id,
    permission_type_id,
    is_granted
  )
  SELECT
    NEW.organization_id,
    NEW.id,
    pd.permission_type_id,
    pd.is_granted
  FROM permission_defaults pd
  WHERE pd.organization_id = NEW.organization_id
    AND pd.role = NEW.role;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new members
CREATE TRIGGER set_member_permissions
  AFTER INSERT ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION set_default_member_permissions();

-- Create helper function to check permissions
CREATE OR REPLACE FUNCTION has_permission(
  p_user_id uuid,
  p_organization_id uuid,
  p_permission_name text
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM organization_permissions op
    JOIN organization_members om ON op.member_id = om.id
    JOIN permission_types pt ON op.permission_type_id = pt.id
    WHERE om.user_id = p_user_id
      AND om.organization_id = p_organization_id
      AND pt.name = p_permission_name
      AND op.is_granted = true
  );
END;
$$ LANGUAGE plpgsql;