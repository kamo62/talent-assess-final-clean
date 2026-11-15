import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CandidateVerification } from '../components/CandidateVerification';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';

export function PublicAssessment() {
  const { accessCode } = useParams<{ accessCode: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);
  const [assessment, setAssessment] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);
  
  useEffect(() => {
    if (!accessCode) {
      setError('Invalid assessment link');
      setLoading(false);
      return;
    }
    
    checkAssessment();
  }, [accessCode]);
  
  // Timer effect
  useEffect(() => {
    if (!verified || !assessment || !timeRemaining) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [verified, assessment, timeRemaining]);
  
  async function checkAssessment() {
    try {
      const { data, error: fetchError } = await supabase
        .from('assessment_instances')
        .select(`
          id,
          assessment_id,
          assessment_type,
          verification_status,
          status,
          expires_at,
          time_limit,
          start_time
        `)
        .eq('access_code', accessCode)
        .single();
      
      if (fetchError) throw new Error('Assessment not found or has expired');
      
      // Check if assessment has expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        throw new Error('This assessment has expired');
      }
      
      // Check if assessment has already been completed
      if (data.status === 'completed') {
        setAssessmentCompleted(true);
      }
      
      // Check if already verified
      if (data.verification_status === 'verified') {
        setVerified(true);
        
        // Calculate time remaining if assessment is in progress
        if (data.status === 'started' && data.start_time && data.time_limit) {
          const startTime = new Date(data.start_time).getTime();
          const currentTime = Date.now();
          const timeLimitMs = parsePgInterval(data.time_limit);
          const elapsed = currentTime - startTime;
          const remaining = Math.max(0, timeLimitMs - elapsed);
          
          setTimeRemaining(Math.floor(remaining / 1000));
        } else if (data.time_limit) {
          // Not started yet, set full time
          setTimeRemaining(Math.floor(parsePgInterval(data.time_limit) / 1000));
        }
      }
      
      // Now fetch the actual assessment content based on type
      let assessmentData;
      
      switch (data.assessment_type) {
        case 'case_study':
          const { data: caseStudy } = await supabase
            .from('case_studies')
            .select('*')
            .eq('id', data.assessment_id)
            .single();
          assessmentData = caseStudy;
          break;
        
        case 'code':
          const { data: codeAssessment } = await supabase
            .from('code_assessments')
            .select('*')
            .eq('id', data.assessment_id)
            .single();
          assessmentData = codeAssessment;
          break;
        
        case 'mcq':
          const { data: mcqAssessment } = await supabase
            .from('mcq_assessments')
            .select('*')
            .eq('id', data.assessment_id)
            .single();
          assessmentData = mcqAssessment;
          break;
      }
      
      setAssessment({
        ...data,
        details: assessmentData
      });
    } catch (error) {
      console.error('Error loading assessment:', error);
      setError(error instanceof Error ? error.message : 'Failed to load assessment');
    } finally {
      setLoading(false);
    }
  }
  
  function handleVerificationSuccess() {
    setVerified(true);
    // Update the assessment status to 'started' if not already
    if (assessment.status === 'pending') {
      supabase
        .from('assessment_instances')
        .update({
          status: 'started',
          start_time: new Date().toISOString()
        })
        .eq('id', assessment.id);
    }
  }
  
  function handleTimeUp() {
    // Auto-submit the assessment when time is up
    handleSubmitAssessment();
  }
  
  async function handleSubmitAssessment() {
    try {
      await supabase
        .from('assessment_instances')
        .update({
          status: 'completed',
          completion_time: new Date().toISOString()
        })
        .eq('id', assessment.id);
      
      setAssessmentCompleted(true);
    } catch (error) {
      console.error('Error submitting assessment:', error);
    }
  }
  
  // Helper function to parse Postgres interval to milliseconds
  function parsePgInterval(interval: string): number {
    // Simple parser for "HH:MM:SS" format
    if (interval.includes(':')) {
      const [hours, minutes, seconds] = interval.split(':').map(Number);
      return ((hours * 60 + minutes) * 60 + seconds) * 1000;
    }
    
    // Default to 60 minutes if parsing fails
    return 60 * 60 * 1000;
  }
  
  function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Assessment Unavailable</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }
  
  if (assessmentCompleted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Assessment Completed</h2>
          <p className="text-gray-600">Thank you for completing this assessment. Your responses have been recorded.</p>
        </div>
      </div>
    );
  }
  
  if (!verified) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <CandidateVerification 
          accessCode={accessCode!} 
          onVerificationSuccess={handleVerificationSuccess} 
        />
      </div>
    );
  }
  
  // Render the appropriate assessment type
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Timer and header */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900">
            {assessment.details?.title || 'Assessment'}
          </h1>
          
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-indigo-600 mr-2" />
            <span className={`font-mono font-medium ${
              timeRemaining && timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'
            }`}>
              {timeRemaining !== null ? formatTime(timeRemaining) : '--:--:--'}
            </span>
          </div>
        </div>
        
        {/* Assessment content based on type */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          {assessment.assessment_type === 'case_study' && (
            <div className="prose max-w-none">
              <h2 className="text-2xl font-bold mb-4">{assessment.details?.title}</h2>
              <div className="mb-6">
                {assessment.details?.description}
              </div>
              
              <h3 className="text-lg font-semibold mb-2">Your Response</h3>
              <textarea
                className="w-full h-64 p-3 border border-gray-300 rounded-md"
                placeholder="Type your response here..."
              ></textarea>
            </div>
          )}
          
          {assessment.assessment_type === 'code' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">{assessment.details?.title}</h2>
              <div className="mb-6">
                {assessment.details?.description}
              </div>
              
              <div className="border border-gray-300 rounded-md h-64 mb-4">
                {/* Code editor would go here */}
                <div className="p-4 bg-gray-100 h-full">
                  <p className="text-gray-500">Code editor placeholder - this would be replaced with a proper code editor component</p>
                </div>
              </div>
            </div>
          )}
          
          {assessment.assessment_type === 'mcq' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">{assessment.details?.title}</h2>
              <div className="mb-6">
                {assessment.details?.description}
              </div>
              
              <div className="space-y-6">
                <p className="text-gray-500">MCQ questions would be loaded here</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Submit button */}
        <div className="flex justify-end">
          <button
            onClick={handleSubmitAssessment}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Submit Assessment
          </button>
        </div>
      </div>
    </div>
  );
}
