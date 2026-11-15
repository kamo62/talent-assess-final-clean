import React, { useEffect, useState, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { supabase } from '../lib/supabase';
import { Play, Save, ChevronUp, ChevronDown, Plus, CheckCircle, XCircle, AlertCircle, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import MDEditor from '@uiw/react-md-editor';
import { AssessmentTimerWithPlagiarism, AssessmentTimerHandle } from '../components/AssessmentTimerWithPlagiarism';
import { getDefaultTimeLimit } from '../lib/timeTracking';
import { judge0Service, STATUS } from '../lib/judge0';
import { AICodeAssessmentGenerator } from '../components/AICodeAssessmentGenerator';
import { AssessmentTypeSelector } from '../components/AssessmentTypeSelector';

interface CodeAssessment {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  organization_id?: string;
}

interface TestCase {
  id: string;
  assessment_id: string;
  name: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
  weight: number;
}

const LANGUAGE_OPTIONS = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
];

export function CodeAssessment() {
  const [assessment, setAssessment] = useState<CodeAssessment | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showTestCaseModal, setShowTestCaseModal] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [newAssessment, setNewAssessment] = useState<{
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>({
    title: '',
    description: '',
    difficulty: 'medium'
  });
  const [newTestCase, setNewTestCase] = useState({
    name: '',
    input: '',
    expected_output: '',
    is_hidden: false,
    weight: 1
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [timeLimit, setTimeLimit] = useState<string>('02:00:00');
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [showTestResults, setShowTestResults] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  
  const timerRef = useRef<AssessmentTimerHandle | null>(null);

  useEffect(() => {
    fetchCodeAssessment();
    // Get default time limit based on seniority (defaulting to 'mid' for now)
    getDefaultTimeLimit('code', 'mid').then(setTimeLimit);
  }, []);

  useEffect(() => {
    if (assessment) {
      fetchTestCases(assessment.id);
    }
  }, [assessment]);

  async function fetchCodeAssessment() {
    try {
      const { data, error } = await supabase
        .from('code_assessments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }

      if (data) {
        setAssessment(data);
      }
    } catch (error) {
      console.error('Error fetching code assessment:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTestCases(assessmentId: string) {
    try {
      const { data, error } = await supabase
        .from('code_test_cases')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTestCases(data || []);
    } catch (error) {
      console.error('Error fetching test cases:', error);
    }
  }

  async function createAssessment(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userData.user?.id)
        .single();

      const { data, error } = await supabase
        .from('code_assessments')
        .insert([{
          ...newAssessment,
          organization_id: member?.organization_id
        }])
        .select()
        .single();

      if (error) throw error;

      setAssessment(data);
      setShowCreateModal(false);
      setNewAssessment({
        title: '',
        description: '',
        difficulty: 'medium'
      });
    } catch (error) {
      console.error('Error creating assessment:', error);
      setError('Failed to create assessment');
    } finally {
      setSubmitting(false);
    }
  }

  async function createTestCase(e: React.FormEvent) {
    e.preventDefault();
    if (!assessment) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('code_test_cases')
        .insert([{
          ...newTestCase,
          assessment_id: assessment.id
        }]);

      if (error) throw error;

      await fetchTestCases(assessment.id);
      setShowTestCaseModal(false);
      setNewTestCase({
        name: '',
        input: '',
        expected_output: '',
        is_hidden: false,
        weight: 1
      });
    } catch (error) {
      console.error('Error creating test case:', error);
      setError('Failed to create test case');
    } finally {
      setSubmitting(false);
    }
  }

  const handleRunCode = async () => {
    if (!code.trim()) {
      setOutput('Please write some code first!');
      return;
    }

    setIsRunning(true);
    setOutput('Running code...');
    setShowTestResults(false);
    
    try {
      if (testCases.length > 0) {
        // Run with test cases
        const results = await judge0Service.runTestCases(
          code,
          language,
          testCases.map(tc => ({
            name: tc.name,
            input: tc.input,
            expected_output: tc.expected_output
          }))
        );

        setTestResults(results.results);
        setShowTestResults(true);
        
        // Generate summary output
        let outputText = `Test Results: ${results.passed}/${results.total} passed\n\n`;
        
        if (results.summary.compilation_error) {
          outputText += `Compilation Error:\n${results.summary.compilation_error}\n`;
        } else {
          results.results.forEach((result, index) => {
            const tc = testCases[index];
            outputText += `Test Case ${index + 1}: ${tc.name}\n`;
            outputText += `Status: ${result.passed ? '✓ Passed' : '✗ Failed'} (${result.status.description})\n`;
            
            if (result.stderr) {
              outputText += `Error: ${result.stderr}\n`;
            } else if (!result.passed && result.stdout) {
              outputText += `Expected: ${tc.expected_output}\n`;
              outputText += `Got: ${result.stdout}\n`;
            }
            
            if (result.time) {
              outputText += `Time: ${result.time}s, Memory: ${result.memory}KB\n`;
            }
            outputText += '\n';
          });
        }
        
        setOutput(outputText);
      } else {
        // Run without test cases (simple execution)
        const result = await judge0Service.runSingleTest(code, language);
        
        let outputText = '';
        if (result.compile_output) {
          outputText = `Compilation Error:\n${result.compile_output}`;
        } else if (result.stderr) {
          outputText = `Runtime Error:\n${result.stderr}`;
        } else if (result.stdout) {
          outputText = result.stdout;
        } else {
          outputText = 'No output';
        }
        
        if (result.time && result.status.id === STATUS.ACCEPTED) {
          outputText += `\n\nExecution time: ${result.time}s\nMemory used: ${result.memory}KB`;
        }
        
        setOutput(outputText);
      }
    } catch (error) {
      console.error('Error running code:', error);
      setOutput(`Error: ${error instanceof Error ? error.message : 'Failed to run code'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    setLoading(true);
    try {
      // Save submission to database
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('code_submissions').insert({
        code,
        language,
        user_id: userData.user?.id,
        assessment_id: assessment?.id,
        test_results: testResults.length > 0 ? testResults : null,
      });

      if (error) throw error;
      
      // Complete the assessment timer
      if (timerRef.current) {
        await timerRef.current.completeAssessment();
      }
      
      setOutput('Code submitted successfully!');
    } catch (error) {
      console.error('Error:', error);
      setOutput('Error submitting code');
    } finally {
      setLoading(false);
    }
  };

  const handleAIGenerated = async (generated: {
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    testCases: { name: string; input: string; expected_output: string; is_hidden: boolean }[];
  }) => {
    try {
      setSubmitting(true);
      
      // Get organization ID
      const { data: userData } = await supabase.auth.getUser();
      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userData.user?.id)
        .single();

      // Create the assessment
      const { data: newAssessment, error: assessmentError } = await supabase
        .from('code_assessments')
        .insert([{
          title: generated.title,
          description: generated.description,
          difficulty: generated.difficulty,
          organization_id: member?.organization_id
        }])
        .select()
        .single();

      if (assessmentError) throw assessmentError;

      // Create test cases
      if (generated.testCases && generated.testCases.length > 0) {
        const testCasesToInsert = generated.testCases.map((tc, index) => ({
          assessment_id: newAssessment.id,
          name: tc.name,
          input: tc.input,
          expected_output: tc.expected_output,
          is_hidden: tc.is_hidden,
          weight: 1
        }));

        const { error: testCaseError } = await supabase
          .from('code_test_cases')
          .insert(testCasesToInsert);

        if (testCaseError) throw testCaseError;
      }

      // Update the current assessment and fetch test cases
      setAssessment(newAssessment);
      await fetchTestCases(newAssessment.id);
      setShowAIGenerator(false);
      
      // Show success message
      setOutput('AI-generated assessment created successfully!');
    } catch (error) {
      console.error('Error creating AI-generated assessment:', error);
      setError('Failed to create AI-generated assessment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
        <div className="flex items-center gap-4">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {assessment ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900">{assessment.title}</h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  assessment.difficulty === 'easy'
                    ? 'bg-green-100 text-green-800'
                    : assessment.difficulty === 'medium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {assessment.difficulty}
              </span>
              {testCases.length > 0 && (
                <span className="text-sm text-gray-600">
                  {testCases.length} test case{testCases.length > 1 ? 's' : ''}
                </span>
              )}
            </>
          ) : (
            <h2 className="text-xl font-semibold text-gray-900">Code Assessment</h2>
          )}
        </div>
        <div className="flex items-center gap-4">
          {assessment && (
            <AssessmentTimerWithPlagiarism
              ref={timerRef}
              assessmentId={assessment.id}
              assessmentType="code"
              timeLimit={timeLimit}
              onTimeUp={() => {
                setIsTimedOut(true);
                setOutput('Time is up! Your assessment has been auto-submitted.');
                handleSubmitCode();
              }}
              onComplete={(totalTime: string, plagiarismReportId?: string) => {
                console.log('Assessment completed in:', totalTime);
                if (plagiarismReportId) {
                  console.log('Plagiarism report generated:', plagiarismReportId);
                }
              }}
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setShowAIGenerator(true)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Generate
            </button>
            <button
              onClick={() => setShowTypeSelector(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Assessment
            </button>
            {assessment && (
              <button
                onClick={() => setShowTestCaseModal(true)}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Test Case
              </button>
            )}
            <button
              onClick={handleRunCode}
              disabled={isRunning || isTimedOut}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              <Play className="h-4 w-4 mr-2" />
              {isRunning ? 'Running...' : 'Run Code'}
            </button>
            <button
              onClick={handleSubmitCode}
              disabled={loading || isTimedOut}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              Submit
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-3/5 border-r">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            language={language}
            value={code}
            onChange={(value) => setCode(value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              automaticLayout: true,
            }}
          />
        </div>
        <div className="w-2/5 bg-gray-900 text-white overflow-hidden flex flex-col">
          {showTestResults && testResults.length > 0 && (
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold mb-2">Test Results</h3>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span>{result.testName || `Test ${index + 1}`}</span>
                    {result.passed ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : result.status.id === STATUS.COMPILATION_ERROR ? (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold">Output</h3>
          </div>
          <div className="flex-1 p-4 font-mono text-sm overflow-auto">
            <pre className="whitespace-pre-wrap">{output}</pre>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100"
        >
          <span className="font-medium text-gray-700">Problem Details</span>
          {showDetails ? (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          )}
        </button>
        {showDetails && assessment && (
          <div className="p-6 bg-white overflow-y-auto" style={{ maxHeight: '40vh' }}>
            <div className="prose prose-indigo max-w-none">
              <ReactMarkdown className="prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700">
                {assessment.description}
              </ReactMarkdown>
            </div>
            
            {testCases.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Test Cases</h3>
                <div className="space-y-3">
                  {testCases.filter(tc => !tc.is_hidden).map((tc, index) => (
                    <div key={tc.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="font-medium text-gray-700">Test Case {index + 1}: {tc.name}</div>
                      <div className="mt-2 text-sm text-gray-600">
                        <div><strong>Input:</strong> <pre className="inline">{tc.input || '(empty)'}</pre></div>
                        <div><strong>Expected Output:</strong> <pre className="inline">{tc.expected_output}</pre></div>
                      </div>
                    </div>
                  ))}
                  {testCases.filter(tc => tc.is_hidden).length > 0 && (
                    <div className="text-sm text-gray-500 italic">
                      + {testCases.filter(tc => tc.is_hidden).length} hidden test case(s)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Assessment Modal */}
      {showCreateModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={createAssessment}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                      type="text"
                      required
                      value={newAssessment.title}
                      onChange={(e) => setNewAssessment({ ...newAssessment, title: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Difficulty</label>
                    <select
                      value={newAssessment.difficulty}
                      onChange={(e) => setNewAssessment({ ...newAssessment, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description (Markdown)</label>
                    <div data-color-mode="light">
                      <MDEditor
                        value={newAssessment.description}
                        onChange={(value) => setNewAssessment({ ...newAssessment, description: value || '' })}
                        preview="edit"
                        height={200}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="mt-4 text-sm text-red-600">
                      {error}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Create Assessment
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Test Case Modal */}
      {showTestCaseModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={createTestCase}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Test Case Name</label>
                    <input
                      type="text"
                      required
                      value={newTestCase.name}
                      onChange={(e) => setNewTestCase({ ...newTestCase, name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="e.g., Basic Addition"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Input</label>
                    <textarea
                      value={newTestCase.input}
                      onChange={(e) => setNewTestCase({ ...newTestCase, input: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
                      rows={3}
                      placeholder="Test input (can be empty)"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Expected Output</label>
                    <textarea
                      required
                      value={newTestCase.expected_output}
                      onChange={(e) => setNewTestCase({ ...newTestCase, expected_output: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
                      rows={3}
                      placeholder="Expected output"
                    />
                  </div>

                  <div className="mb-4 flex items-center">
                    <input
                      type="checkbox"
                      id="is_hidden"
                      checked={newTestCase.is_hidden}
                      onChange={(e) => setNewTestCase({ ...newTestCase, is_hidden: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_hidden" className="ml-2 block text-sm text-gray-900">
                      Hidden test case (not shown to candidates)
                    </label>
                  </div>

                  {error && (
                    <div className="mt-4 text-sm text-red-600">
                      {error}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Add Test Case
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTestCaseModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* AI Generator Modal */}
      {showAIGenerator && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Generate AI Assessment</h3>
                  <button
                    onClick={() => setShowAIGenerator(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <AICodeAssessmentGenerator 
                  onGenerated={handleAIGenerated}
                  language={language}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assessment Type Selector Modal */}
      {showTypeSelector && (
        <AssessmentTypeSelector onClose={() => setShowTypeSelector(false)} />
      )}
    </div>
  );
}
