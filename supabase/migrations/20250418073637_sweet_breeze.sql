/*
  # Add subscription tracking to organizations

  1. Changes
    - Add subscription_id column to organizations table
    - Add subscription_status column to organizations table
    - Add subscription_tier column to organizations table
    - Add subscription_updated_at column to organizations table

  2. Security
    - Enable RLS
    - Add policies for subscription management
*/

-- Add subscription columns to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_id text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_updated_at timestamptz DEFAULT now();

-- Add subscription status check constraint
ALTER TABLE organizations ADD CONSTRAINT valid_subscription_status 
  CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'canceled'));

-- Add subscription tier check constraint
ALTER TABLE organizations ADD CONSTRAINT valid_subscription_tier
  CHECK (subscription_tier IN ('free', 'basic', 'professional', 'enterprise'));

-- Create subscription management policies
CREATE POLICY "Organization admins can manage subscription"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- Create function to update subscription status
CREATE OR REPLACE FUNCTION update_subscription_status()
RETURNS trigger AS $$
BEGIN
  NEW.subscription_updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscription updates
CREATE TRIGGER subscription_status_update
  BEFORE UPDATE OF subscription_status, subscription_tier
  ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_status();