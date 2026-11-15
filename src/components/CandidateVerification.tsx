import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, AlertCircle } from 'lucide-react';

interface VerificationProps {
  accessCode: string;
  onVerificationSuccess: () => void;
}

export function CandidateVerification({ accessCode, onVerificationSuccess }: VerificationProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  
  const MAX_ATTEMPTS = 3;

  async function handleVerification(e: React.FormEvent) {
    e.preventDefault();
    
    if (attempts >= MAX_ATTEMPTS) {
      setError('Maximum verification attempts exceeded. Please contact the assessment administrator.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Fetch the assessment instance
      const { data: instance, error: fetchError } = await supabase
        .from('assessment_instances')
        .select('*')
        .eq('access_code', accessCode)
        .single();
      
      if (fetchError) throw new Error('Assessment not found or has expired');
      
      // Check if verification information matches
      if (
        instance.candidate_first_name.toLowerCase() === firstName.toLowerCase() &&
        instance.candidate_last_name.toLowerCase() === lastName.toLowerCase() &&
        instance.candidate_id_number === idNumber
      ) {
        // Update verification status
        await supabase
          .from('assessment_instances')
          .update({
            verification_status: 'verified',
            verification_attempts: instance.verification_attempts
          })
          .eq('id', instance.id);
        
        onVerificationSuccess();
      } else {
        // Increment attempts counter
        const newAttempts = (instance.verification_attempts || 0) + 1;
        await supabase
          .from('assessment_instances')
          .update({
            verification_attempts: newAttempts
          })
          .eq('id', instance.id);
        
        setAttempts(newAttempts);
        setError('Verification failed. Please check your information and try again.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during verification. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-center mb-6">
        <Shield className="h-12 w-12 text-indigo-600" />
      </div>
      
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Verify Your Identity</h2>
      <p className="text-center text-gray-600 mb-6">
        Please confirm your identity to access your assessment.
      </p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleVerification} className="space-y-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            First Name
          </label>
          <input
            id="firstName"
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        
        <div>
          <label htmlFor="idNumber" className="block text-sm font-medium text-gray-700">
            ID Number
          </label>
          <input
            id="idNumber"
            type="text"
            required
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || attempts >= MAX_ATTEMPTS}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>
        </div>
        
        <div className="text-xs text-gray-500 text-center">
          This information will be used only for verification purposes.
        </div>
      </form>
    </div>
  );
}
