import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getAssessmentBalance } from '../lib/assessments';
import { Upload, Loader, AlertCircle, CreditCard } from 'lucide-react';
import * as PDFJS from 'pdfjs-dist';

interface GeneratedAssessment {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'programming' | 'system_design' | 'case_study';
  metadata: {
    roleCategory: string;
    seniority: string;
    framework?: string;
    skills: string[];
    estimatedDuration: string;
    generatedBy: string;
  };
}

const ROLES = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Quality Engineer',
  'Data Engineer',
  'Mobile Developer',
  'Security Engineer'
] as const;

const SENIORITY_LEVELS = [
  'junior',
  'mid',
  'senior',
  'lead'
] as const;

const ASSESSMENT_TYPES = [
  'programming',
  'system_design',
  'case_study'
] as const;

export function AssessmentGenerator() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobSpec, setJobSpec] = useState('');
  const [generatedAssessment, setGeneratedAssessment] = useState<GeneratedAssessment | null>(null);
  const [aiProvider, setAiProvider] = useState<'openai' | 'claude' | 'gemini' | 'azure'>('openai');
  const [selectedRole, setSelectedRole] = useState<typeof ROLES[number]>(ROLES[0]);
  const [selectedSeniority, setSelectedSeniority] = useState<typeof SENIORITY_LEVELS[number]>('mid');
  const [selectedType, setSelectedType] = useState<typeof ASSESSMENT_TYPES[number]>('programming');
  const [assessmentBalance, setAssessmentBalance] = useState<number>(0);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAssessmentBalance();
  }, []);

  const loadAssessmentBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (member?.organization_id) {
        setOrganizationId(member.organization_id);
        const balance = await getAssessmentBalance(member.organization_id);
        setAssessmentBalance(balance?.available || 0);
      }
    } catch (error) {
      console.error('Error loading assessment balance:', error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf')) {
      setError('Please upload a PDF file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size should be less than 5MB');
      return;
    }

    setFile(file);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFJS.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ') + '\n';
      }

      setJobSpec(text);
    } catch (error) {
      console.error('Error reading PDF:', error);
      setError('Failed to read PDF file');
    }
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!organizationId) {
        throw new Error('Organization not found');
      }

      if (assessmentBalance < 1) {
        throw new Error('Insufficient assessments. You need at least 1 assessment available to generate.');
      }

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Upload file to Supabase storage if provided
      let fileUrl = '';
      if (file) {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('job-specs')
          .upload(`${Date.now()}-${file.name}`, file);

        if (uploadError) throw uploadError;
        fileUrl = supabase.storage.from('job-specs').getPublicUrl(uploadData.path).data.publicUrl;
      }

      // Call assessment generation function
      const { data: assessment, error } = await supabase.functions.invoke('generate-assessment', {
        body: {
          jobSpec,
          provider: aiProvider,
          fileUrl,
          assessmentType: selectedType,
          role: selectedRole,
          seniority: selectedSeniority,
          organizationId
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      setGeneratedAssessment(assessment.assessment);
      
      // Refresh assessment balance
      await loadAssessmentBalance();
    } catch (error: any) {
      console.error('Error generating assessment:', error);
      setError(error.message || 'Failed to generate assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Generate Assessment from Job Specification</h2>

        {/* Role and Seniority Selection */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as typeof ROLES[number])}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seniority Level
            </label>
            <select
              value={selectedSeniority}
              onChange={(e) => setSelectedSeniority(e.target.value as typeof SENIORITY_LEVELS[number])}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              {SENIORITY_LEVELS.map((level) => (
                <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Assessment Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assessment Type
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as typeof ASSESSMENT_TYPES[number])}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            {ASSESSMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Assessment Balance Display */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">Available Assessments:</span>
              <span className="ml-2 text-lg font-bold text-gray-900">{assessmentBalance}</span>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Cost:</span> 1 assessment
            </div>
          </div>
        </div>

        {/* AI Provider Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            AI Provider
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="openai"
                checked={aiProvider === 'openai'}
                onChange={(e) => setAiProvider(e.target.value as 'openai' | 'claude' | 'gemini' | 'azure')}
                className="form-radio h-4 w-4 text-indigo-600"
              />
              <span className="ml-2">OpenAI GPT-4</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="claude"
                checked={aiProvider === 'claude'}
                onChange={(e) => setAiProvider(e.target.value as 'openai' | 'claude' | 'gemini' | 'azure')}
                className="form-radio h-4 w-4 text-indigo-600"
              />
              <span className="ml-2">Anthropic Claude</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="gemini"
                checked={aiProvider === 'gemini'}
                onChange={(e) => setAiProvider(e.target.value as 'openai' | 'claude' | 'gemini' | 'azure')}
                className="form-radio h-4 w-4 text-indigo-600"
              />
              <span className="ml-2">Google Gemini</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="azure"
                checked={aiProvider === 'azure'}
                onChange={(e) => setAiProvider(e.target.value as 'openai' | 'claude' | 'gemini' | 'azure')}
                className="form-radio h-4 w-4 text-indigo-600"
              />
              <span className="ml-2">Azure OpenAI</span>
            </label>
          </div>
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Job Specification (PDF)
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                >
                  <span>Upload a file</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept=".pdf"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">
                PDF up to 5MB
              </p>
            </div>
          </div>
        </div>

        {/* Job Specification Text */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Specification
          </label>
          <textarea
            value={jobSpec}
            onChange={(e) => setJobSpec(e.target.value)}
            rows={10}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
            placeholder="Paste job specification here or upload a PDF..."
          />
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || !jobSpec.trim() || assessmentBalance < 1}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader className="animate-spin h-5 w-5 mr-3" />
              Generating Assessment...
            </>
          ) : assessmentBalance < 1 ? (
            'Insufficient Assessments'
          ) : (
            'Generate Assessment'
          )}
        </button>

        {/* Generated Assessment Preview */}
        {generatedAssessment && (
          <div className="mt-8 border-t pt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Generated Assessment</h3>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xl font-semibold text-gray-900">{generatedAssessment.title}</h4>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    generatedAssessment.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                    generatedAssessment.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {generatedAssessment.difficulty}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                    {generatedAssessment.type}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Role Category:</span>
                  <span className="ml-2 text-sm text-gray-900">{generatedAssessment.metadata.roleCategory}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Seniority:</span>
                  <span className="ml-2 text-sm text-gray-900">{generatedAssessment.metadata.seniority}</span>
                </div>
                {generatedAssessment.metadata.framework && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Framework:</span>
                    <span className="ml-2 text-sm text-gray-900">{generatedAssessment.metadata.framework}</span>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-gray-500">Duration:</span>
                  <span className="ml-2 text-sm text-gray-900">{generatedAssessment.metadata.estimatedDuration}</span>
                </div>
              </div>

              <div className="mb-4">
                <span className="text-sm font-medium text-gray-500">Required Skills:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {generatedAssessment.metadata.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="prose prose-indigo max-w-none">
                <div dangerouslySetInnerHTML={{ __html: generatedAssessment.description }} />
              </div>

              <div className="mt-6 text-sm text-gray-500">
                Generated by {generatedAssessment.metadata.generatedBy}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
