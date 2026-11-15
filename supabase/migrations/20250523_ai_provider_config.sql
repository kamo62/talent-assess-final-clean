-- Add AI provider configuration to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ai_provider_config JSONB DEFAULT '{
  "default_provider": "openai",
  "allow_custom_keys": false,
  "admin_keys": {
    "openai": {
      "configured": false
    },
    "claude": {
      "configured": false
    },
    "gemini": {
      "configured": false
    },
    "azure": {
      "configured": false
    }
  },
  "custom_keys": {}
}'::jsonb;

-- Add system-wide AI provider settings table for admin configuration
CREATE TABLE IF NOT EXISTS ai_provider_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT true,
  api_key_encrypted TEXT,
  additional_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default providers
INSERT INTO ai_provider_settings (provider, is_enabled) VALUES
  ('openai', true),
  ('claude', true),
  ('gemini', true),
  ('azure', true)
ON CONFLICT (provider) DO NOTHING;

-- Function to check if organization can use custom AI keys
CREATE OR REPLACE FUNCTION can_use_custom_ai_keys(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  org_record RECORD;
BEGIN
  SELECT subscription_status, ai_provider_config
  INTO org_record
  FROM organizations
  WHERE id = org_id;
  
  -- Only Enterprise customers can use custom keys
  RETURN org_record.subscription_status = 'enterprise' 
    AND (org_record.ai_provider_config->>'allow_custom_keys')::boolean = true;
END;
$$ LANGUAGE plpgsql;

-- RLS policies for ai_provider_settings (admin only)
ALTER TABLE ai_provider_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can view AI provider settings"
  ON ai_provider_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can update AI provider settings"
  ON ai_provider_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to get effective AI provider config for an organization
CREATE OR REPLACE FUNCTION get_effective_ai_config(org_id UUID, provider TEXT)
RETURNS JSONB AS $$
DECLARE
  org_config JSONB;
  can_use_custom BOOLEAN;
  admin_settings RECORD;
BEGIN
  -- Get organization config
  SELECT ai_provider_config INTO org_config
  FROM organizations WHERE id = org_id;
  
  -- Check if org can use custom keys
  can_use_custom := can_use_custom_ai_keys(org_id);
  
  -- Get admin settings for the provider
  SELECT * INTO admin_settings
  FROM ai_provider_settings
  WHERE ai_provider_settings.provider = provider
  AND is_enabled = true;
  
  -- If org has custom keys and is allowed to use them
  IF can_use_custom AND org_config->'custom_keys' ? provider THEN
    RETURN jsonb_build_object(
      'provider', provider,
      'use_custom', true,
      'config', org_config->'custom_keys'->provider
    );
  -- Otherwise use admin keys
  ELSIF admin_settings.api_key_encrypted IS NOT NULL THEN
    RETURN jsonb_build_object(
      'provider', provider,
      'use_custom', false,
      'config', admin_settings.additional_config
    );
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
