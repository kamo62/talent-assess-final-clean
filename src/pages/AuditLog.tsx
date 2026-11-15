import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, Clock, User, FileText } from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_data: any;
  new_data: any;
  created_at: string;
}

export function AuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  async function fetchAuditLogs() {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-red-50 p-4 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Audit Log</h1>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-gray-200">
          {logs.map((log) => (
            <li key={log.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${
                    log.action === 'create' ? 'bg-green-100' :
                    log.action === 'update' ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    <FileText className={`h-5 w-5 ${
                      log.action === 'create' ? 'text-green-600' :
                      log.action === 'update' ? 'text-yellow-600' : 'text-red-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {log.action.charAt(0).toUpperCase() + log.action.slice(1)} - {log.table_name}
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <User className="h-4 w-4" />
                      <span>{log.user_id}</span>
                      <Clock className="h-4 w-4 ml-2" />
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {(log.old_data || log.new_data) && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {log.old_data && (
                    <div className="bg-gray-50 rounded-md p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Previous Data</h4>
                      <pre className="text-xs text-gray-600 overflow-auto">
                        {JSON.stringify(log.old_data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.new_data && (
                    <div className="bg-gray-50 rounded-md p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">New Data</h4>
                      <pre className="text-xs text-gray-600 overflow-auto">
                        {JSON.stringify(log.new_data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}