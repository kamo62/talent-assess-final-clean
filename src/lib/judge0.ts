import { supabase } from './supabase';

interface Judge0Submission {
  source_code: string;
  language_id: number;
  stdin?: string;
  expected_output?: string;
  cpu_time_limit?: number;
  cpu_extra_time?: number;
  wall_time_limit?: number;
  memory_limit?: number;
  stack_limit?: number;
  max_processes_and_or_threads?: number;
  enable_per_process_and_thread_time_limit?: boolean;
  enable_per_process_and_thread_memory_limit?: boolean;
  max_file_size?: number;
  enable_network?: boolean;
}

interface Judge0Response {
  token?: string;
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  time: string | null;
  memory: number | null;
  status: {
    id: number;
    description: string;
  };
  expected_output?: string;
}

// Status IDs from Judge0 documentation
export const STATUS = {
  IN_QUEUE: 1,
  PROCESSING: 2,
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT_EXCEEDED: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR: 7,
  RUNTIME_ERROR_SIGSEGV: 11,
  RUNTIME_ERROR_SIGXFSZ: 12,
  RUNTIME_ERROR_SIGFPE: 13,
  RUNTIME_ERROR_SIGABRT: 14,
  RUNTIME_ERROR_NZEC: 15,
  RUNTIME_ERROR_OTHER: 16,
  INTERNAL_ERROR: 17,
  EXEC_FORMAT_ERROR: 18,
};

export const JUDGE0_LANGUAGES = {
  javascript: 63,
  typescript: 74,
  python: 71,
  java: 62,
  cpp: 54,
  csharp: 51,
  go: 60,
  rust: 73,
  ruby: 72,
  kotlin: 78,
  scala: 79,
  swift: 83,
};

export class Judge0Service {
  private static instance: Judge0Service;
  private baseUrl: string;
  private apiKey: string;

  private constructor() {
    // Using Judge0 CE API through RapidAPI
    this.baseUrl = import.meta.env.VITE_JUDGE0_URL || 'https://judge0-ce.p.rapidapi.com';
    this.apiKey = import.meta.env.VITE_JUDGE0_API_KEY || '';
  }

  public static getInstance(): Judge0Service {
    if (!Judge0Service.instance) {
      Judge0Service.instance = new Judge0Service();
    }
    return Judge0Service.instance;
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': this.apiKey,
      'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
    };
  }

  async getLanguageId(language: string): Promise<number> {
    const languageId = JUDGE0_LANGUAGES[language as keyof typeof JUDGE0_LANGUAGES];
    if (!languageId) {
      throw new Error(`Unsupported language: ${language}`);
    }
    return languageId;
  }

  async submitCode(submission: Judge0Submission): Promise<Judge0Response> {
    try {
      const response = await fetch(`${this.baseUrl}/submissions?base64_encoded=false&wait=true`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(submission),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to submit code to Judge0: ${error}`);
      }

      const result = await response.json();
      return {
        ...result,
        expected_output: submission.expected_output,
      };
    } catch (error) {
      console.error('Judge0 submission error:', error);
      throw error;
    }
  }

  async getSubmissionResult(token: string): Promise<Judge0Response> {
    const response = await fetch(`${this.baseUrl}/submissions/${token}?base64_encoded=false`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get submission result');
    }

    return response.json();
  }

  async runTestCases(
    code: string,
    language: string,
    testCases: { input: string; expected_output: string; name?: string }[]
  ): Promise<{
    results: (Judge0Response & { testName?: string; passed: boolean })[];
    passed: number;
    total: number;
    summary: {
      compilation_error?: string;
      runtime_errors: number;
      time_limit_exceeded: number;
      wrong_answers: number;
    };
  }> {
    const languageId = await this.getLanguageId(language);
    
    // First, check if code compiles
    const compilationCheck = await this.submitCode({
      source_code: code,
      language_id: languageId,
      stdin: '',
      cpu_time_limit: 2,
      memory_limit: 128000,
      enable_network: false,
    });

    if (compilationCheck.status.id === STATUS.COMPILATION_ERROR) {
      return {
        results: testCases.map(tc => ({
          ...compilationCheck,
          testName: tc.name,
          passed: false,
        })),
        passed: 0,
        total: testCases.length,
        summary: {
          compilation_error: compilationCheck.compile_output || 'Compilation failed',
          runtime_errors: 0,
          time_limit_exceeded: 0,
          wrong_answers: 0,
        },
      };
    }

    // Run all test cases
    const results = await Promise.all(
      testCases.map(async (testCase) => {
        const submission = await this.submitCode({
          source_code: code,
          language_id: languageId,
          stdin: testCase.input,
          expected_output: testCase.expected_output,
          cpu_time_limit: 5,
          memory_limit: 128000,
          stack_limit: 64000,
          max_processes_and_or_threads: 60,
          enable_network: false,
        });

        const passed = submission.status.id === STATUS.ACCEPTED && 
                      submission.stdout?.trim() === testCase.expected_output?.trim();

        return {
          ...submission,
          testName: testCase.name,
          passed,
        };
      })
    );

    const summary = {
      compilation_error: undefined,
      runtime_errors: results.filter(r => 
        r.status.id >= STATUS.RUNTIME_ERROR && r.status.id <= STATUS.RUNTIME_ERROR_OTHER
      ).length,
      time_limit_exceeded: results.filter(r => r.status.id === STATUS.TIME_LIMIT_EXCEEDED).length,
      wrong_answers: results.filter(r => r.status.id === STATUS.WRONG_ANSWER || 
        (r.status.id === STATUS.ACCEPTED && !r.passed)).length,
    };

    const passed = results.filter(r => r.passed).length;

    return {
      results,
      passed,
      total: testCases.length,
      summary,
    };
  }

  async runSingleTest(
    code: string,
    language: string,
    input: string = ''
  ): Promise<Judge0Response> {
    const languageId = await this.getLanguageId(language);
    
    return this.submitCode({
      source_code: code,
      language_id: languageId,
      stdin: input,
      cpu_time_limit: 5,
      memory_limit: 128000,
      stack_limit: 64000,
      enable_network: false,
    });
  }
}

export const judge0Service = Judge0Service.getInstance();

export interface Judge0Result {
  stdout: string | null;
  time: string;
  memory: number;
  stderr: string | null;
  token: string;
  compile_output: string | null;
  message: string | null;
  status: {
    id: number;
    description: string;
  };
}

export interface TestCase {
  id: string;
  name: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
  weight: number;
}

export interface TestResult {
  test_case_id: string;
  test_case_name: string;
  passed: boolean;
  actual_output: string;
  expected_output: string;
  error?: string;
  time?: string;
  memory?: number;
}

// Get Judge0 configuration for an organization
export async function getJudge0Config(organizationId: string) {
  const { data, error } = await supabase
    .from('organizations')
    .select('judge0_enabled, judge0_api_url, judge0_api_key')
    .eq('id', organizationId)
    .single();

  if (error) throw error;
  return data;
}

// Get available languages
export async function getJudge0Languages() {
  const { data, error } = await supabase
    .from('judge0_languages')
    .select('*')
    .order('name');

  if (error) throw error;
  return data;
}

// Get test cases for an assessment
export async function getTestCases(assessmentId: string) {
  const { data, error } = await supabase
    .from('code_test_cases')
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('name');

  if (error) throw error;
  return data as TestCase[];
}

// Create a new test case
export async function createTestCase(
  assessmentId: string,
  testCase: Omit<TestCase, 'id'>
) {
  const { data, error } = await supabase
    .from('code_test_cases')
    .insert({
      assessment_id: assessmentId,
      ...testCase,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update a test case
export async function updateTestCase(
  testCaseId: string,
  updates: Partial<Omit<TestCase, 'id'>>
) {
  const { data, error } = await supabase
    .from('code_test_cases')
    .update(updates)
    .eq('id', testCaseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete a test case
export async function deleteTestCase(testCaseId: string) {
  const { error } = await supabase
    .from('code_test_cases')
    .delete()
    .eq('id', testCaseId);

  if (error) throw error;
}
