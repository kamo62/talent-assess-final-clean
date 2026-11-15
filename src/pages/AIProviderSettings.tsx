import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, AlertCircle, CheckCircle, Key, Settings } from 'lucide-react';

interface AIProvider {
  id: string;
  provider: string;
  is_enabled: boolean;
  api_key_encrypted: string | null;
  additional_config: any;
}

export default function AIProviderSettings() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [azureConfig, setAzureConfig] = useState({
    endpoint: '',
    deployment: 'gpt-4'
  });

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_provider_settings')
        .select('*')
        .order('provider');

      if (error) throw error;
      setProviders(data || []);

      // Load Azure config if exists
      const azureProvider = data?.find(p => p.provider === 'azure');
      if (azureProvider?.additional_config) {
        setAzureConfig(azureProvider.additional_config);
      }
    } catch (error) {
      console.error('Error loading providers:', error);
      setMessage({ type: 'error', text: 'Failed to load AI provider settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Update each provider
      for (const provider of providers) {
        const updates: any = {
          is_enabled: provider.is_enabled,
          updated_at: new Date().toISOString()
        };

        // If API key is provided, update it (in real app, this should be encrypted)
        if (apiKeys[provider.provider]) {
          updates.api_key_encrypted = btoa(apiKeys[provider.provider]); // Simple encoding for demo
        }

        // Add Azure-specific config
        if (provider.provider === 'azure') {
          updates.additional_config = azureConfig;
        }

        const { error } = await supabase
          .from('ai_provider_settings')
          .update(updates)
          .eq('id', provider.id);

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'AI provider settings saved successfully' });
      setApiKeys({}); // Clear API keys from state
    } catch (error) {
      console.error('Error saving providers:', error);
      setMessage({ type: 'error', text: 'Failed to save AI provider settings' });
    } finally {
      setSaving(false);
    }
  };

  const toggleProvider = (providerId: string) => {
    setProviders(providers.map(p => 
      p.id === providerId ? { ...p, is_enabled: !p.is_enabled } : p
    ));
  };

  const getProviderDisplayName = (provider: string) => {
    const names: Record<string, string> = {
      openai: 'OpenAI GPT-4',
      claude: 'Anthropic Claude',
      gemini: 'Google Gemini',
      azure: 'Azure OpenAI'
    };
    return names[provider] || provider;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <Settings className="h-6 w-6 text-gray-400 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">AI Provider Settings</h2>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Configure default AI providers for all organizations. Enterprise customers can override these with their own API keys.
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

          {providers.map((provider) => (
            <div key={provider.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={provider.is_enabled}
                    onChange={() => toggleProvider(provider.id)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label className="ml-3 text-lg font-medium text-gray-900">
                    {getProviderDisplayName(provider.provider)}
                  </label>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Key className="h-4 w-4 mr-1" />
                  {provider.api_key_encrypted ? 'Configured' : 'Not configured'}
                </div>
              </div>

              {provider.is_enabled && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={apiKeys[provider.provider] || ''}
                      onChange={(e) => setApiKeys({ ...apiKeys, [provider.provider]: e.target.value })}
                      placeholder={provider.api_key_encrypted ? '••••••••••••••••' : 'Enter API key'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {provider.api_key_encrypted && 'Leave blank to keep existing key'}
                    </p>
                  </div>

                  {provider.provider === 'azure' && (
                    <>
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
                    </>
                  )}
                </div>
              )}
            </div>
          ))}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Enterprise Override</h3>
            <p className="text-sm text-blue-700">
              Enterprise customers can configure their own API keys to use instead of these default providers. 
              This allows them to manage their own AI provider relationships and billing.
            </p>
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
