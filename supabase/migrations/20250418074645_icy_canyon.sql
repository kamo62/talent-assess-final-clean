-- Add subscription-related columns to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_email text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_name text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_phone text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS last_payment_status text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS last_payment_error text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_end timestamptz;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- Create subscription logs table
CREATE TABLE IF NOT EXISTS subscription_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  subscription_id text,
  invoice_id text,
  payment_method_id text,
  data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on subscription logs
ALTER TABLE subscription_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for subscription logs
CREATE POLICY "Organization admins can view subscription logs"
ON subscription_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = subscription_logs.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('owner', 'admin')
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscription_logs_org_id ON subscription_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_logs_created_at ON subscription_logs(created_at);