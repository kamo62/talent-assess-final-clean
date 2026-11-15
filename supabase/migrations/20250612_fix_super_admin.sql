-- Super admin operations and policies, without account-specific bootstrap data.
-- No user is created or promoted by this migration. A trusted operator must
-- explicitly approve administrator accounts in their own Supabase project.
-- Removing the old bootstrap from source does not revoke existing account grants
-- or reapply this migration to databases where it has already run.

-- Create functions for super admin operations
CREATE OR REPLACE FUNCTION create_organization_as_super_admin(
  org_name TEXT,
  org_slug TEXT,
  owner_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
  owner_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Check if current user is super admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = current_user_id 
    AND raw_app_meta_data->>'is_super_admin' = 'true'
  ) THEN
    RAISE EXCEPTION 'Only super admins can use this function';
  END IF;
  
  -- If owner_email is provided, get their user ID
  IF owner_email IS NOT NULL THEN
    SELECT id INTO owner_id FROM auth.users WHERE email = owner_email;
    IF owner_id IS NULL THEN
      RAISE EXCEPTION 'User with email % not found', owner_email;
    END IF;
  ELSE
    owner_id := current_user_id;
  END IF;
  
  -- Create the organization
  INSERT INTO organizations (name, slug, created_by)
  VALUES (org_name, org_slug, owner_id)
  RETURNING id INTO new_org_id;
  
  -- Add the owner as a member
  INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    user_type,
    permissions
  )
  VALUES (
    new_org_id,
    owner_id,
    'owner',
    CASE 
      WHEN owner_id = current_user_id THEN 'super_admin'
      ELSE 'org_admin'
    END,
    jsonb_build_object(
      'can_manage_assessments', true,
      'can_manage_members', true,
      'can_view_analytics', true,
      'can_manage_billing', true,
      'can_create_templates', true,
      'can_manage_candidates', true,
      'can_send_invites', true
    )
  );
  
  -- Initialize organization with free trial
  INSERT INTO organizations_usage (
    organization_id,
    assessments_balance,
    assessments_used,
    subscription_tier,
    trial_ends_at
  )
  VALUES (
    new_org_id,
    25, -- Free trial assessments
    0,
    'trial',
    NOW() + INTERVAL '14 days'
  );
  
  RETURN new_org_id;
END;
$$;

-- Function to grant assessments to an organization (super admin only)
CREATE OR REPLACE FUNCTION grant_assessments_to_organization(
  org_id UUID,
  assessment_count INTEGER,
  reason TEXT DEFAULT 'Super admin grant'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Check if current user is super admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = current_user_id 
    AND raw_app_meta_data->>'is_super_admin' = 'true'
  ) THEN
    RAISE EXCEPTION 'Only super admins can grant assessments';
  END IF;
  
  -- Update the organization's assessment balance
  UPDATE organizations_usage
  SET 
    assessments_balance = assessments_balance + assessment_count,
    updated_at = NOW()
  WHERE organization_id = org_id;
  
  -- Log the transaction
  INSERT INTO assessment_transactions (
    organization_id,
    amount,
    transaction_type,
    description,
    created_by
  )
  VALUES (
    org_id,
    assessment_count,
    'credit',
    reason,
    current_user_id
  );
END;
$$;

-- Update RLS policies to properly recognize super admins
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE id = user_id 
    AND raw_app_meta_data->>'is_super_admin' = 'true'
  );
END;
$$;

-- Create a policy for super admins to access all organizations
CREATE POLICY "Super admins can view all organizations" ON organizations
  FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can create organizations" ON organizations
  FOR INSERT
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all organizations" ON organizations
  FOR UPDATE
  USING (is_super_admin(auth.uid()));

-- Create policies for organization_members
CREATE POLICY "Super admins can view all organization members" ON organization_members
  FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all organization members" ON organization_members
  FOR ALL
  USING (is_super_admin(auth.uid()));

-- Create policies for organizations_usage
CREATE POLICY "Super admins can view all usage" ON organizations_usage
  FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all usage" ON organizations_usage
  FOR UPDATE
  USING (is_super_admin(auth.uid()));

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION create_organization_as_super_admin TO authenticated;
GRANT EXECUTE ON FUNCTION grant_assessments_to_organization TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin TO authenticated;

-- Create a view for super admins to see all organizations with usage
CREATE OR REPLACE VIEW super_admin_organizations AS
SELECT 
  o.*,
  ou.assessments_balance,
  ou.assessments_used,
  ou.subscription_tier,
  ou.trial_ends_at,
  COUNT(DISTINCT om.user_id) as member_count
FROM organizations o
LEFT JOIN organizations_usage ou ON o.id = ou.organization_id
LEFT JOIN organization_members om ON o.id = om.organization_id
WHERE is_super_admin(auth.uid())
GROUP BY o.id, ou.organization_id, ou.assessments_balance, ou.assessments_used, ou.subscription_tier, ou.trial_ends_at;

-- Grant access to the view
GRANT SELECT ON super_admin_organizations TO authenticated;
