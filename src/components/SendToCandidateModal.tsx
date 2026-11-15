import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Send, Clock, Calendar } from 'lucide-react';

interface Assessment {
  id: string;
  title: string;
  type: 'case_study' | 'code' | 'mcq';
}

interface SendToCandidateModalProps {
  assessment: Assessment;
  organizationId: string;
  onClose: () => void;
  onSend: (accessCode: string) => void;
}

export function SendToCandidateModal({ 
  assessment, 
  organizationId,
  onClose, 
  onSend 
}: SendToCandidateModalProps) {
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidateFirstName, setCandidateFirstName] = useState('');
  const [candidateLastName, setCandidateLastName] = useState('');
  const [candidateIdNumber, setCandidateIdNumber] = useState('');
  const [expirationDays, setExpirationDays] = useState(7);
  const [timeLimit, setTimeLimit] = useState(60); // minutes
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError('');
    
    try {
      // Validate inputs
      if (!candidateEmail || !candidateFirstName || !candidateLastName || !candidateIdNumber) {
        throw new Error('All fields are required');
      }
      
      // Create assessment instance
      const { data, error } = await supabase
        .from('assessment_instances')
        .insert({
          assessment_id: assessment.id,
          assessment_type: assessment.type,
          candidate_email: candidateEmail,
          candidate_first_name: candidateFirstName,
          candidate_last_name: candidateLastName,
          candidate_id_number: candidateIdNumber,
          time_limit: `${timeLimit} minutes`,
          expires_at: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString(),
          organization_id: organizationId,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Call the onSend callback with the access code
      onSend(data.access_code);
      onClose();
    } catch (error) {
      console.error('Error sending assessment:', error);
      setError(error instanceof Error ? error.message : 'Failed to send assessment');
    } finally {
      setSending(false);
    }
  }
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Send Assessment to Candidate</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              required
              value={candidateEmail}
              onChange={(e) => setCandidateEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              First Name
            </label>
            <input
              type="text"
              required
              value={candidateFirstName}
              onChange={(e) => setCandidateFirstName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Last Name
            </label>
            <input
              type="text"
              required
              value={candidateLastName}
              onChange={(e) => setCandidateLastName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              ID Number
            </label>
            <input
              type="text"
              required
              value={candidateIdNumber}
              onChange={(e) => setCandidateIdNumber(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              The candidate will need to verify this ID number to access the assessment.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Time Limit (minutes)
              </label>
              <input
                type="number"
                min="5"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Expires After (days)
              </label>
              <input
                type="number"
                min="1"
                value={expirationDays}
                onChange={(e) => setExpirationDays(parseInt(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              />
            </div>
          </div>
          
          <div className="pt-2">
            <button
              type="submit"
              disabled={sending}
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Assessment
                </>
              )}
            </button>
          </div>
          
          <div className="text-xs text-gray-500 text-center">
            Email functionality is currently being implemented. You will need to manually share the assessment link with the candidate.
          </div>
        </form>
      </div>
    </div>
  );
}
