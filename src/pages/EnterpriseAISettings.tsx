import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, AlertCircle, CheckCircle, Key, Settings, Info } from 'lucide-react';

interface CustomAIKeys {
  openai?: { api_key: string };
  claude?: { api_key: string };
  gemini?: { api_key: string };
  azure?: { api_key: string; endpoint: string; deployment: string };
}

export default function EnterpriseAISettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isEnterprise, setIsEnterprise] = useState(false);
  const [customKeys, setCustomKeys] = useState<CustomAIKeys>({});
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [azureConfig, setAzureConfig] = useState({
    endpoint: '',
    deployment: 'gpt-4'
  });

  useEffect(() => {
    checkEnterpriseStatus();
  }, []);

  const checkEnterpriseStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) return;

      const { data: org } = await supabase
        .from('organizations')
        .select('subscription_status, ai_provider_config')
        .eq('id', profile.organization_id)
        .single();

      if (org?.subscription_status === 'enterprise') {
        setIsEnterprise(true);
        if (org.ai_provider_config?.custom_keys) {
          setCustomKeys(org.ai_provider_config.custom_keys);
          if (org.ai_provider_config.custom_keys.azure) {
            setAzureConfig({
              endpoint: org.ai_provider_config.custom_keys.azure.endpoint || '',
              deployment: org.ai_provider_config.custom_keys.azure.deployment || 'gpt-4'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking enterprise status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) throw new Error('Organization not found');

      // Build custom keys object
      const updatedCustomKeys: CustomAIKeys = { ...customKeys };

      if (apiKeys.openai) {
        updatedCustomKeys.openai = { api_key: apiKeys.openai };
      }
      if (apiKeys.claude) {
        updatedCustomKeys.claude = { api_key: apiKeys.claude };
      }
      if (apiKeys.gemini) {
        updatedCustomKeys.gemini = { api_key: apiKeys.gemini };
      }
      if (apiKeys.azure || azureConfig.endpoint) {
        updatedCustomKeys.azure = {
          api_key: apiKeys.azure || customKeys.azure?.api_key || '',
          endpoint: azureConfig.endpoint,
          deployment: azureConfig.deployment
        };
      }

      // Update organization with custom keys
      const { error } = await supabase
        .from('organizations')
        .update({
          ai_provider_config: {
            default_provider: 'openai',
            allow_custom_keys: true,
            custom_keys: updatedCustomKeys
          }
        })
        .eq('id', profile.organization_id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Custom AI provider settings saved successfully' });
      setApiKeys({}); // Clear API keys from state
      setCustomKeys(updatedCustomKeys);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const removeProvider = (provider: string) => {
    const updated = { ...customKeys };
    delete updated[provider as keyof CustomAIKeys];
    setCustomKeys(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isEnterprise) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex">
            <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Enterprise Feature
              </h3>
              <p className="mt-2 text-sm text-yellow-700">
                Custom AI provider configuration is only available for Enterprise customers. 
                This allows you to use your own API keys instead of the platform's default providers.
              </p>
              <p className="mt-2 text-sm text-yellow-700">
                Please contact sales to upgrade to an Enterprise plan.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <Settings className="h-6 w-6 text-gray-400 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Custom AI Provider Settings</h2>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Configure your own AI provider API keys. When configured, these will be used instead of the platform's default providers.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {message && (
            <div className={`rounded-md p-4 ${
              message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex">
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-400" />
                )}
                <div className="ml-3">
                  <p className={`text-sm ${
                    message.type === 'success' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {message.text}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* OpenAI Configuration */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">OpenAI GPT-4</h3>
              <div className="flex items-center text-sm text-gray-500">
                <Key className="h-4 w-4 mr-1" />
                {customKeys.openai ? 'Configured' : 'Not configured'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={apiKeys.openai || ''}
                onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
                placeholder={customKeys.openai ? '••••••••••••••••' : 'sk-...'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {customKeys.openai && 'Leave blank to keep existing key'}
              </p>
            </div>
            {customKeys.openai && (
              <button
                onClick={() => removeProvider('openai')}
                className="mt-2 text-sm text-red-600 hover:text-red-500"
              >
                Remove custom key
              </button>
            )}
          </div>

          {/* Claude Configuration */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Anthropic Claude</h3>
              <div className="flex items-center text-sm text-gray-500">
                <Key className="h-4 w-4 mr-1" />
                {customKeys.claude ? 'Configured' : 'Not configured'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={apiKeys.claude || ''}
                onChange={(e) => setApiKeys({ ...apiKeys, claude: e.target.value })}
                placeholder={customKeys.claude ? '••••••••••••••••' : 'sk-ant-...'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {customKeys.claude && 'Leave blank to keep existing key'}
              </p>
            </div>
            {customKeys.claude && (
              <button
                onClick={() => removeProvider('claude')}
                className="mt-2 text-sm text-red-600 hover:text-red-500"
              >
                Remove custom key
              </button>
            )}
          </div>

          {/* Gemini Configuration */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Google Gemini</h3>
              <div className="flex items-center text-sm text-gray-500">
                <Key className="h-4 w-4 mr-1" />
                {customKeys.gemini ? 'Configured' : 'Not configured'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={apiKeys.gemini || ''}
                onChange={(e) => setApiKeys({ ...apiKeys, gemini: e.target.value })}
                placeholder={customKeys.gemini ? '••••••••••••••••' : 'AIza...'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {customKeys.gemini && 'Leave blank to keep existing key'}
              </p>
            </div>
            {customKeys.gemini && (
              <button
                onClick={() => removeProvider('gemini')}
                className="mt-2 text-sm text-red-600 hover:text-red-500"
              >
                Remove custom key
              </button>
            )}
          </div>

          {/* Azure Configuration */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Azure OpenAI</h3>
              <div className="flex items-center text-sm text-gray-500">
                <Key className="h-4 w-4 mr-1" />
                {customKeys.azure ? 'Configured' : 'Not configured'}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKeys.azure || ''}
                  onChange={(e) => setApiKeys({ ...apiKeys, azure: e.target.value })}
                  placeholder={customKeys.azure ? '••••••••••••••••' : 'Enter API key'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {customKeys.azure && 'Leave blank to keep existing key'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Azure Endpoint
                </label>
                <input
                  type="text"
                  value={azureConfig.endpoint}
                  onChange={(e) => setAzureConfig({ ...azureConfig, endpoint: e.target.value })}
                  placeholder="https://your-resource.openai.azure.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deployment Name
                </label>
                <input
                  type="text"
                  value={azureConfig.deployment}
                  onChange={(e) => setAzureConfig({ ...azureConfig, deployment: e.target.value })}
                  placeholder="gpt-4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            {customKeys.azure && (
              <button
                onClick={() => removeProvider('azure')}
                className="mt-2 text-sm text-red-600 hover:text-red-500"
              >
                Remove custom key
              </button>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">How it works</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• When you configure custom API keys, they will be used instead of the platform's default providers</li>
              <li>• Your API keys are encrypted and stored securely</li>
              <li>• You can remove custom keys at any time to revert to platform defaults</li>
              <li>• Usage will be billed directly to your AI provider accounts</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
