-- Add subscription columns to organizations table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' 
    AND column_name = 'subscription_id'
  ) THEN
    ALTER TABLE organizations ADD COLUMN subscription_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' 
    AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE organizations ADD COLUMN subscription_status text DEFAULT 'inactive';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' 
    AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE organizations ADD COLUMN subscription_tier text DEFAULT 'free';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' 
    AND column_name = 'subscription_updated_at'
  ) THEN
    ALTER TABLE organizations ADD COLUMN subscription_updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add constraints if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_subscription_status'
  ) THEN
    ALTER TABLE organizations ADD CONSTRAINT valid_subscription_status 
      CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'canceled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_subscription_tier'
  ) THEN
    ALTER TABLE organizations ADD CONSTRAINT valid_subscription_tier
      CHECK (subscription_tier IN ('free', 'basic', 'professional', 'enterprise'));
  END IF;
END $$;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Organization admins can manage subscription" ON organizations;

-- Create subscription management policy
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

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_subscription_status CASCADE;

-- Create function to update subscription status
CREATE OR REPLACE FUNCTION update_subscription_status()
RETURNS trigger AS $$
BEGIN
  NEW.subscription_updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS subscription_status_update ON organizations;

-- Create trigger for subscription updates
CREATE TRIGGER subscription_status_update
  BEFORE UPDATE OF subscription_status, subscription_tier
  ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_status();