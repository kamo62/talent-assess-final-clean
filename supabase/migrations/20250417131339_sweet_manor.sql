/*
  # Make Existing Users Super Admins

  1. Changes
    - Update all existing users in organization_members to be super_admins
    - This is a one-time migration to set up initial super admin users
    
  2. Security
    - Only affects existing users
    - Maintains RLS policies
*/

-- Update all existing users to be super admins
UPDATE organization_members
SET user_type = 'super_admin'
WHERE user_id IN (
  SELECT id FROM auth.users
);

-- Log the change in audit_logs
INSERT INTO audit_logs (
  user_id,
  action,
  table_name,
  record_id,
  old_data,
  new_data
)
SELECT 
  user_id,
  'update',
  'organization_members',
  id,
  jsonb_build_object('user_type', 'org_member'),
  jsonb_build_object('user_type', 'super_admin')
FROM organization_members;