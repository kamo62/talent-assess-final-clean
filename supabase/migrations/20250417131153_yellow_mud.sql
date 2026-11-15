/*
  # Enhanced User Roles and Organization Management

  1. Changes
    - Add user_type enum for different user types
    - Add organization invite system
    - Add organization settings and preferences
    - Add user profile fields
    - Add organization role management

  2. Security
    - Add policies for role-based access
    - Add policies for organization management
*/

-- Create user type enum
CREATE TYPE user_type AS ENUM (
  'super_admin',    -- Platform administrator
  'org_admin',      -- Organization administrator
  'org_member',     -- Regular organization member
  'candidate'       -- Assessment candidate
);

-- Add user_type to organization_members
ALTER TABLE organization_members
ADD COLUMN user_type user_type NOT NULL DEFAULT 'org_member';

-- Create organization invites table
CREATE TABLE organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL,
  user_type user_type NOT NULL DEFAULT 'org_member',
  invited_by uuid REFERENCES auth.users(id),
  token uuid DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'member'))
);

-- Create user profiles table
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  first_name text,
  last_name text,
  avatar_url text,
  phone text,
  job_title text,
  department text,
  bio text,
  skills text[],
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add organization preferences
ALTER TABLE organizations
ADD COLUMN preferences jsonb DEFAULT '{
  "allow_self_registration": false,
  "require_email_verification": true,
  "default_user_type": "org_member",
  "assessment_settings": {
    "allow_retakes": false,
    "time_limit_default": 3600,
    "proctoring_enabled": true
  }
}'::jsonb;

-- Enable RLS
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for organization invites
CREATE POLICY "Organization admins can manage invites"
ON organization_invites
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_invites.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
);

-- Policies for user profiles
CREATE POLICY "Users can view their own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to handle organization invites
CREATE OR REPLACE FUNCTION handle_invite_acceptance()
RETURNS trigger AS $$
BEGIN
  -- Create organization member entry
  INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    user_type
  )
  VALUES (
    NEW.organization_id,
    auth.uid(),
    NEW.role,
    NEW.user_type
  );
  
  -- Delete the invite
  DELETE FROM organization_invites WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for invite acceptance
CREATE TRIGGER on_invite_accept
  AFTER UPDATE ON organization_invites
  FOR EACH ROW
  WHEN (NEW.status = 'accepted')
  EXECUTE FUNCTION handle_invite_acceptance();