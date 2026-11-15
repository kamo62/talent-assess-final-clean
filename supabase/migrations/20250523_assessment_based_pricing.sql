-- Migration: Convert from credit-based to assessment-based pricing model
-- This migration updates the system to use assessments as the primary billing unit

-- Update organizations table to track assessments instead of credits
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS assessments_balance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_assessment_limit INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS assessments_used_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_cycle_start DATE DEFAULT CURRENT_DATE;

-- Create assessment packages (replacing credit packages)
CREATE TABLE IF NOT EXISTS assessment_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  assessments INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert assessment packages
INSERT INTO assessment_packages (name, assessments, price, description) VALUES
('Pay as You Go', 1, 20.00, 'Single assessment purchase'),
('Starter Bundle', 50, 750.00, 'Bundle of 50 assessments - R15 each'),
('Growth Bundle', 150, 1800.00, 'Bundle of 150 assessments - R12 each'),
('Professional Bundle', 500, 5000.00, 'Bundle of 500 assessments - R10 each');

-- Update subscription plans to include assessment limits
UPDATE subscription_plans SET 
  features = jsonb_set(
    features, 
    '{monthly_assessments}', 
    CASE 
      WHEN name = 'Starter' THEN '200'::jsonb
      WHEN name = 'Professional' THEN '750'::jsonb
      WHEN name = 'Enterprise' THEN '9999'::jsonb -- Effectively unlimited
      ELSE '0'::jsonb
    END
  ),
  features = jsonb_set(
    features,
    '{overage_rate}',
    CASE
      WHEN name = 'Starter' THEN '8'::jsonb
      WHEN name = 'Professional' THEN '6.5'::jsonb
      WHEN name = 'Enterprise' THEN '5'::jsonb
      ELSE '20'::jsonb
    END
  )
WHERE name IN ('Starter', 'Professional', 'Enterprise');

-- Create assessment transactions table (replacing credit_transactions)
CREATE TABLE IF NOT EXISTS assessment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- positive for additions, negative for usage
  balance_after INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'monthly_allocation', 'usage', 'overage', 'refund', 'trial')),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_assessment_transactions_org_created 
ON assessment_transactions(organization_id, created_at DESC);

-- Migrate existing credit balance to assessment balance (1 assessment = 2 credits)
UPDATE organizations 
SET assessments_balance = CEIL(credits_balance::DECIMAL / 2)
WHERE credits_balance > 0;

-- Migrate credit transactions to assessment transactions
INSERT INTO assessment_transactions (
  organization_id,
  amount,
  balance_after,
  type,
  description,
  metadata,
  created_at
)
SELECT 
  organization_id,
  CASE 
    WHEN amount > 0 THEN CEIL(amount::DECIMAL / 2)
    ELSE FLOOR(amount::DECIMAL / 2)
  END as amount,
  CEIL(balance_after::DECIMAL / 2) as balance_after,
  type,
  REPLACE(description, 'credits', 'assessments'),
  metadata,
  created_at
FROM credit_transactions;

-- Update free trial to give 25 assessments instead of 50 credits
UPDATE organizations 
SET assessments_balance = 25
WHERE free_trial_started_at IS NOT NULL 
  AND free_trial_started_at > NOW() - INTERVAL '14 days'
  AND assessments_balance < 25;

-- Function to check assessment balance
CREATE OR REPLACE FUNCTION check_assessment_balance(org_id UUID, required_assessments INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
  monthly_limit INTEGER;
  used_this_month INTEGER;
  has_subscription BOOLEAN;
BEGIN
  SELECT 
    assessments_balance,
    monthly_assessment_limit,
    assessments_used_this_month,
    subscription_id IS NOT NULL
  INTO 
    current_balance,
    monthly_limit,
    used_this_month,
    has_subscription
  FROM organizations
  WHERE id = org_id;

  -- If they have assessments in their balance, they can use them
  IF current_balance >= required_assessments THEN
    RETURN TRUE;
  END IF;

  -- If they have a subscription with monthly limit
  IF has_subscription AND monthly_limit IS NOT NULL THEN
    -- Check if they have remaining monthly assessments
    IF (monthly_limit - used_this_month) >= required_assessments THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to deduct assessments
CREATE OR REPLACE FUNCTION deduct_assessments(
  org_id UUID, 
  assessments_to_deduct INTEGER,
  description TEXT
)
RETURNS JSONB AS $$
DECLARE
  current_balance INTEGER;
  monthly_limit INTEGER;
  used_this_month INTEGER;
  has_subscription BOOLEAN;
  new_balance INTEGER;
  deducted_from_balance INTEGER := 0;
  deducted_from_monthly INTEGER := 0;
BEGIN
  -- Get current state
  SELECT 
    assessments_balance,
    monthly_assessment_limit,
    assessments_used_this_month,
    subscription_id IS NOT NULL
  INTO 
    current_balance,
    monthly_limit,
    used_this_month,
    has_subscription
  FROM organizations
  WHERE id = org_id
  FOR UPDATE;

  -- First, try to deduct from balance
  IF current_balance > 0 THEN
    deducted_from_balance := LEAST(current_balance, assessments_to_deduct);
    new_balance := current_balance - deducted_from_balance;
    assessments_to_deduct := assessments_to_deduct - deducted_from_balance;
  ELSE
    new_balance := current_balance;
  END IF;

  -- Then, try to deduct from monthly allocation
  IF assessments_to_deduct > 0 AND has_subscription AND monthly_limit IS NOT NULL THEN
    IF (monthly_limit - used_this_month) >= assessments_to_deduct THEN
      deducted_from_monthly := assessments_to_deduct;
      assessments_to_deduct := 0;
    END IF;
  END IF;

  -- Check if we could deduct everything
  IF assessments_to_deduct > 0 THEN
    RAISE EXCEPTION 'Insufficient assessments';
  END IF;

  -- Update the organization
  UPDATE organizations
  SET 
    assessments_balance = new_balance,
    assessments_used_this_month = assessments_used_this_month + deducted_from_monthly
  WHERE id = org_id;

  -- Record transaction if deducted from balance
  IF deducted_from_balance > 0 THEN
    INSERT INTO assessment_transactions (
      organization_id,
      amount,
      balance_after,
      type,
      description
    ) VALUES (
      org_id,
      -deducted_from_balance,
      new_balance,
      'usage',
      description
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deducted_from_balance', deducted_from_balance,
    'deducted_from_monthly', deducted_from_monthly,
    'new_balance', new_balance
  );
END;
$$ LANGUAGE plpgsql;

-- Function to reset monthly usage (run this monthly)
CREATE OR REPLACE FUNCTION reset_monthly_assessment_usage()
RETURNS void AS $$
BEGIN
  UPDATE organizations
  SET 
    assessments_used_this_month = 0,
    billing_cycle_start = CURRENT_DATE
  WHERE subscription_id IS NOT NULL
    AND billing_cycle_start < CURRENT_DATE - INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to reset monthly usage (requires pg_cron extension)
-- This would need to be set up separately in your Supabase dashboard
-- SELECT cron.schedule('reset-monthly-assessments', '0 0 1 * *', 'SELECT reset_monthly_assessment_usage();');

-- Add RLS policies for assessment_transactions
ALTER TABLE assessment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's assessment transactions"
  ON assessment_transactions
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Update the assessment generation cost (was 5 credits, now 1 assessment)
-- This is handled in the application code

-- Add comment for clarity
COMMENT ON COLUMN organizations.assessments_balance IS 'Prepaid assessments that can be used anytime';
COMMENT ON COLUMN organizations.monthly_assessment_limit IS 'Monthly assessment allocation from subscription';
COMMENT ON COLUMN organizations.assessments_used_this_month IS 'Assessments used from monthly allocation';
COMMENT ON COLUMN organizations.billing_cycle_start IS 'Start date of current billing cycle';
