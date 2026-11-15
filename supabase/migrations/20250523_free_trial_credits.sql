-- Add free trial and credits columns to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS trial_used boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS credits_balance integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_used integer DEFAULT 0;

-- Create credits transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('purchase', 'usage', 'bonus', 'refund')),
  description text,
  reference text, -- For Paystack transaction reference
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create credits packages table
CREATE TABLE IF NOT EXISTS credit_packages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  credits integer NOT NULL,
  price_kobo integer NOT NULL, -- Price in kobo (Nigerian currency)
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Insert default credit packages
INSERT INTO credit_packages (name, credits, price_kobo, description) VALUES
  ('Starter Pack', 100, 500000, '100 assessment credits'), -- R500
  ('Growth Pack', 500, 2000000, '500 assessment credits with 10% bonus'), -- R2000
  ('Professional Pack', 1000, 3500000, '1000 assessment credits with 15% bonus'), -- R3500
  ('Enterprise Pack', 5000, 15000000, '5000 assessment credits with 20% bonus'); -- R15000

-- Create function to start free trial
CREATE OR REPLACE FUNCTION start_free_trial(org_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE organizations 
  SET 
    trial_ends_at = now() + interval '14 days',
    trial_used = true,
    subscription_tier = 'free',
    subscription_status = 'trialing',
    credits_balance = 50 -- Give 50 free credits for trial
  WHERE id = org_id AND trial_used = false;
  
  -- Log the trial credits
  INSERT INTO credit_transactions (organization_id, amount, type, description, created_by)
  SELECT org_id, 50, 'bonus', 'Free trial credits', created_by
  FROM organizations WHERE id = org_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to check trial status
CREATE OR REPLACE FUNCTION check_trial_status()
RETURNS trigger AS $$
BEGIN
  -- If trial has ended, update subscription status
  IF NEW.trial_ends_at IS NOT NULL AND NEW.trial_ends_at < now() AND NEW.subscription_status = 'trialing' THEN
    NEW.subscription_status = 'expired';
    NEW.subscription_tier = 'free';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check trial status on organization update
CREATE TRIGGER check_trial_status_trigger
BEFORE UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION check_trial_status();

-- Create function to use credits
CREATE OR REPLACE FUNCTION use_credits(org_id uuid, amount integer, description text)
RETURNS boolean AS $$
DECLARE
  current_balance integer;
BEGIN
  -- Get current balance
  SELECT credits_balance INTO current_balance
  FROM organizations WHERE id = org_id;
  
  -- Check if enough credits
  IF current_balance >= amount THEN
    -- Deduct credits
    UPDATE organizations 
    SET 
      credits_balance = credits_balance - amount,
      credits_used = credits_used + amount
    WHERE id = org_id;
    
    -- Log transaction
    INSERT INTO credit_transactions (organization_id, amount, type, description)
    VALUES (org_id, -amount, 'usage', description);
    
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to add credits
CREATE OR REPLACE FUNCTION add_credits(org_id uuid, amount integer, transaction_type text, description text, reference text DEFAULT NULL)
RETURNS void AS $$
BEGIN
  -- Add credits
  UPDATE organizations 
  SET credits_balance = credits_balance + amount
  WHERE id = org_id;
  
  -- Log transaction
  INSERT INTO credit_transactions (organization_id, amount, type, description, reference)
  VALUES (org_id, amount, transaction_type, description, reference);
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for credit_transactions
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own credit transactions"
ON credit_transactions FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- RLS Policies for credit_packages
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View active credit packages"
ON credit_packages FOR SELECT
TO authenticated
USING (is_active = true);

-- Add indexes
CREATE INDEX idx_credit_transactions_org ON credit_transactions(organization_id);
CREATE INDEX idx_credit_transactions_created ON credit_transactions(created_at);
