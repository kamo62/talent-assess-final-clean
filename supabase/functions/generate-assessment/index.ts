// @ts-nocheck
// This is a Supabase Edge Function that runs on Deno runtime
// The import syntax and Deno global are specific to Deno, not Node.js

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import { OpenAI } from "npm:openai@4.28.0";
import { Anthropic } from "npm:@anthropic-ai/sdk@0.17.1";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.2.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface AssessmentRequest {
  type: 'case_study' | 'programming' | 'system_design' | 'mcq';
  role: string;
  seniority: 'junior' | 'mid' | 'senior' | 'lead';
}

interface MCQQuestion {
  question: string;
  options: { text: string; id: string }[];
  correctAnswerId: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimitMinutes: number;
}

interface MCQAssessment {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'mcq';
  metadata: {
    roleCategory: string;
    seniority: string;
    framework?: string;
    skills: string[];
    estimatedDuration: string;
  };
  questions: MCQQuestion[];
}

interface GeneralAssessment {
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
  };
  testCases?: TestCase[]; // Add optional testCases for programming assessments
}

interface TestCase {
  name: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
  weight: number;
}

interface AIProvider {
  generateAssessment(jobSpec: string, request: AssessmentRequest): Promise<GeneralAssessment | MCQAssessment>;
}

class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || Deno.env.get('OPENAI_API_KEY') || '',
    });
  }

  async generateAssessment(jobSpec: string, request: AssessmentRequest): Promise<GeneralAssessment | MCQAssessment> {
    let prompt: string;
    let systemContent: string;
    let responseFormat: { type: "json_object" };

    if (request.type === 'mcq') {
      systemContent = "You are an expert at creating multiple-choice questions for technical assessments. You carefully analyze job specifications to create relevant and challenging questions.";
      prompt = `Analyze the following job specification and create a set of 10-15 multiple-choice questions for a ${request.seniority} ${request.role} position.
      
      Job specification: ${jobSpec}

      For each question:
      1. Provide a clear question.
      2. Provide exactly 4 options, each with a unique ID (e.g., "a", "b", "c", "d").
      3. Clearly indicate the correct option's ID.
      4. Provide a concise explanation for the correct answer.
      5. Assign a difficulty level: "easy", "medium", or "hard".
      6. Assign a time limit in minutes (e.g., 1, 2, 3).

      Return the response in JSON format with:
      - title: string (e.g., "Frontend Developer MCQ Assessment")
      - description: string (in markdown, e.g., "This assessment covers key concepts for a frontend developer role.")
      - difficulty: "easy" | "medium" | "hard" (overall assessment difficulty)
      - type: "mcq"
      - metadata: {
          roleCategory: string,
          seniority: string,
          framework: string (extracted from job spec, if applicable),
          skills: string[],
          estimatedDuration: string (e.g., "60 minutes" for the entire assessment)
        }
      - questions: MCQQuestion[] (an array of question objects)
      `;
    } else {
      systemContent = "You are an expert at creating technical assessments for job candidates. You carefully analyze job specifications to identify required frameworks and technologies.";
      prompt = `Analyze the following job specification and create a ${request.type} assessment for a ${request.seniority} ${request.role} position.
      
      Job specification: ${jobSpec}

      First, analyze the job specification to:
      1. Identify the required framework(s) or technology stack
      2. Determine key technical skills needed
      3. Understand the role's scope and responsibilities

      Then, provide a detailed assessment that:
      1. Matches the specific role and seniority level
      2. Tests relevant technical skills
      3. Includes clear evaluation criteria
      4. Has appropriate difficulty for the seniority level
      5. Uses the identified framework(s) from the job spec
      
      Return the response in JSON format with:
      - title: string
      - description: string (in markdown)
      - difficulty: "easy" | "medium" | "hard"
      - type: "${request.type}"
      - metadata: {
          roleCategory: string,
          seniority: string,
          framework: string (extracted from job spec),
          skills: string[],
          estimatedDuration: string
        }
      ${request.type === 'programming' ? `- testCases: TestCase[] (an array of test case objects, each with name, input, expected_output, is_hidden, and weight)` : ''}`;
    }

    const completion = await this.client.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "system",
        content: systemContent
      }, {
        role: "user",
        content: prompt
      }],
      response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
  }
}

class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || Deno.env.get('ANTHROPIC_API_KEY') || '',
    });
  }

  async generateAssessment(jobSpec: string, request: AssessmentRequest): Promise<GeneralAssessment | MCQAssessment> {
    let prompt: string;
    let systemContent: string;

    if (request.type === 'mcq') {
      systemContent = "You are an expert at creating multiple-choice questions for technical assessments. You carefully analyze job specifications to create relevant and challenging questions.";
      prompt = `Analyze the following job specification and create a set of 10-15 multiple-choice questions for a ${request.seniority} ${request.role} position.
      
      Job specification: ${jobSpec}

      For each question:
      1. Provide a clear question.
      2. Provide exactly 4 options, each with a unique ID (e.g., "a", "b", "c", "d").
      3. Clearly indicate the correct option's ID.
      4. Provide a concise explanation for the correct answer.
      5. Assign a difficulty level: "easy", "medium", or "hard".
      6. Assign a time limit in minutes (e.g., 1, 2, 3).

      Return the response in JSON format with:
      - title: string (e.g., "Frontend Developer MCQ Assessment")
      - description: string (in markdown, e.g., "This assessment covers key concepts for a frontend developer role.")
      - difficulty: "easy" | "medium" | "hard" (overall assessment difficulty)
      - type: "mcq"
      - metadata: {
          roleCategory: string,
          seniority: string,
          framework: string (extracted from job spec, if applicable),
          skills: string[],
          estimatedDuration: string (e.g., "60 minutes" for the entire assessment)
        }
      - questions: MCQQuestion[] (an array of question objects)
      `;
    } else {
      systemContent = "You are an expert at creating technical assessments for job candidates. You carefully analyze job specifications to identify required frameworks and technologies.";
      prompt = `Analyze the following job specification and create a ${request.type} assessment for a ${request.seniority} ${request.role} position.
      
      Job specification: ${jobSpec}

      First, analyze the job specification to:
      1. Identify the required framework(s) or technology stack
      2. Determine key technical skills needed
      3. Understand the role's scope and responsibilities

      Then, provide a detailed assessment that:
      1. Matches the specific role and seniority level
      2. Tests relevant technical skills
      3. Includes clear evaluation criteria
      4. Has appropriate difficulty for the seniority level
      5. Uses the identified framework(s) from the job spec
      
      Return the response in JSON format with:
      - title: string
      - description: string (in markdown)
      - difficulty: "easy" | "medium" | "hard"
      - type: "${request.type}"
      - metadata: {
          roleCategory: string,
          seniority: string,
          framework: string (extracted from job spec),
          skills: string[],
          estimatedDuration: string
        }
      ${request.type === 'programming' ? `- testCases: TestCase[] (an array of test case objects, each with name, input, expected_output, is_hidden, and weight)` : ''}`;
    }

    const message = await this.client.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 4000,
      system: systemContent,
      messages: [{
        role: "user",
        content: prompt
      }]
    });

    return JSON.parse(message.content[0].text);
  }
}

class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    this.client = new GoogleGenerativeAI(apiKey || Deno.env.get('GOOGLE_AI_API_KEY') || '');
  }

  async generateAssessment(jobSpec: string, request: AssessmentRequest): Promise<GeneralAssessment | MCQAssessment> {
    let prompt: string;
    let systemContent: string; // Gemini doesn't use a separate system content, but keeping for consistency

    if (request.type === 'mcq') {
      prompt = `You are an expert at creating multiple-choice questions for technical assessments. You carefully analyze job specifications to create relevant and challenging questions.

      Analyze the following job specification and create a set of 10-15 multiple-choice questions for a ${request.seniority} ${request.role} position.
      
      Job specification: ${jobSpec}

      For each question:
      1. Provide a clear question.
      2. Provide exactly 4 options, each with a unique ID (e.g., "a", "b", "c", "d").
      3. Clearly indicate the correct option's ID.
      4. Provide a concise explanation for the correct answer.
      5. Assign a difficulty level: "easy", "medium", or "hard".
      6. Assign a time limit in minutes (e.g., 1, 2, 3).

      Return the response in JSON format with:
      - title: string (e.g., "Frontend Developer MCQ Assessment")
      - description: string (in markdown, e.g., "This assessment covers key concepts for a frontend developer role.")
      - difficulty: "easy" | "medium" | "hard" (overall assessment difficulty)
      - type: "mcq"
      - metadata: {
          roleCategory: string,
          seniority: string,
          framework: string (extracted from job spec, if applicable),
          skills: string[],
          estimatedDuration: string (e.g., "60 minutes" for the entire assessment)
        }
      - questions: MCQQuestion[] (an array of question objects)
      `;
    } else {
      prompt = `You are an expert at creating technical assessments for job candidates. You carefully analyze job specifications to identify required frameworks and technologies.

      Analyze the following job specification and create a ${request.type} assessment for a ${request.seniority} ${request.role} position.
      
      Job specification: ${jobSpec}

      First, analyze the job specification to:
      1. Identify the required framework(s) or technology stack
      2. Determine key technical skills needed
      3. Understand the role's scope and responsibilities

      Then, provide a detailed assessment that:
      1. Matches the specific role and seniority level
      2. Tests relevant technical skills
      3. Includes clear evaluation criteria
      4. Has appropriate difficulty for the seniority level
      5. Uses the identified framework(s) from the job spec
      
      Return the response in JSON format with:
      - title: string
      - description: string (in markdown)
      - difficulty: "easy" | "medium" | "hard"
      - type: "${request.type}"
      - metadata: {
          roleCategory: string,
          seniority: string,
          framework: string (extracted from job spec),
          skills: string[],
          estimatedDuration: string
        }
      ${request.type === 'programming' ? `- testCases: TestCase[] (an array of test case objects, each with name, input, expected_output, is_hidden, and weight)` : ''}`;
    }

    const model = this.client.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return JSON.parse(response.text());
  }
}

class AzureOpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor(config?: { apiKey?: string; endpoint?: string; deployment?: string }) {
    const apiKey = config?.apiKey || Deno.env.get('AZURE_OPENAI_API_KEY') || '';
    const endpoint = config?.endpoint || Deno.env.get('AZURE_OPENAI_ENDPOINT') || '';
    const deployment = config?.deployment || Deno.env.get('AZURE_OPENAI_DEPLOYMENT') || 'gpt-4';
    
    this.client = new OpenAI({
      apiKey,
      baseURL: `${endpoint}/openai/deployments/${deployment}`,
      defaultQuery: { 'api-version': '2024-02-15-preview' },
      defaultHeaders: { 'api-key': apiKey },
    });
  }

  async generateAssessment(jobSpec: string, request: AssessmentRequest): Promise<GeneralAssessment | MCQAssessment> {
    let prompt: string;
    let systemContent: string;

    if (request.type === 'mcq') {
      systemContent = "You are an expert at creating multiple-choice questions for technical assessments. You carefully analyze job specifications to create relevant and challenging questions.";
      prompt = `Analyze the following job specification and create a set of 10-15 multiple-choice questions for a ${request.seniority} ${request.role} position.
      
      Job specification: ${jobSpec}

      For each question:
      1. Provide a clear question.
      2. Provide exactly 4 options, each with a unique ID (e.g., "a", "b", "c", "d").
      3. Clearly indicate the correct option's ID.
      4. Provide a concise explanation for the correct answer.
      5. Assign a difficulty level: "easy", "medium", or "hard".
      6. Assign a time limit in minutes (e.g., 1, 2, 3).

      Return the response in JSON format with:
      - title: string (e.g., "Frontend Developer MCQ Assessment")
      - description: string (in markdown, e.g., "This assessment covers key concepts for a frontend developer role.")
      - difficulty: "easy" | "medium" | "hard" (overall assessment difficulty)
      - type: "mcq"
      - metadata: {
          roleCategory: string,
          seniority: string,
          framework: string (extracted from job spec, if applicable),
          skills: string[],
          estimatedDuration: string (e.g., "60 minutes" for the entire assessment)
        }
      - questions: MCQQuestion[] (an array of question objects)
      `;
    } else {
      systemContent = "You are an expert at creating technical assessments for job candidates. You carefully analyze job specifications to identify required frameworks and technologies.";
      prompt = `Analyze the following job specification and create a ${request.type} assessment for a ${request.seniority} ${request.role} position.
      
      Job specification: ${jobSpec}

      First, analyze the job specification to:
      1. Identify the required framework(s) or technology stack
      2. Determine key technical skills needed
      3. Understand the role's scope and responsibilities

      Then, provide a detailed assessment that:
      1. Matches the specific role and seniority level
      2. Tests relevant technical skills
      3. Includes clear evaluation criteria
      4. Has appropriate difficulty for the seniority level
      5. Uses the identified framework(s) from the job spec
      
      Return the response in JSON format with:
      - title: string
      - description: string (in markdown)
      - difficulty: "easy" | "medium" | "hard"
      - type: "${request.type}"
      - metadata: {
          roleCategory: string,
          seniority: string,
          framework: string (extracted from job spec),
          skills: string[],
          estimatedDuration: string
        }
      ${request.type === 'programming' ? `- testCases: TestCase[] (an array of test case objects, each with name, input, expected_output, is_hidden, and weight)` : ''}`;
    }

    const completion = await this.client.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "system",
        content: systemContent
      }, {
        role: "user",
        content: prompt
      }],
      response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { jobSpec, provider = 'openai', assessmentType, role, seniority, organizationId } = await req.json();

    if (!jobSpec) {
      throw new Error('Job specification is required');
    }

    if (!role || !seniority || !assessmentType) {
      throw new Error('Role, seniority, and assessment type are required');
    }

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    // Check assessment balance and get organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('assessments_balance, subscription_status, ai_provider_config')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      throw new Error('Organization not found');
    }

    // Check if they have assessments available
    const { data: balanceCheck, error: balanceError } = await supabase
      .rpc('check_assessment_balance', {
        org_id: organizationId,
        required_assessments: 1
      });

    if (balanceError || !balanceCheck) {
      throw new Error('Insufficient assessments. You need at least 1 assessment available to generate.');
    }

    // Get effective AI configuration
    const { data: aiConfig } = await supabase.rpc('get_effective_ai_config', {
      org_id: organizationId,
      provider: provider
    });

    if (!aiConfig) {
      throw new Error(`AI provider ${provider} is not configured or enabled`);
    }

    let aiProvider: AIProvider;
    
    // Check if using custom keys (Enterprise only)
    if (aiConfig.use_custom && org.ai_provider_config?.custom_keys?.[provider]) {
      const customConfig = org.ai_provider_config.custom_keys[provider];
      
      switch (provider.toLowerCase()) {
        case 'claude':
          aiProvider = new ClaudeProvider(customConfig.api_key);
          break;
        case 'gemini':
          aiProvider = new GeminiProvider(customConfig.api_key);
          break;
        case 'azure':
          aiProvider = new AzureOpenAIProvider({
            apiKey: customConfig.api_key,
            endpoint: customConfig.endpoint,
            deployment: customConfig.deployment
          });
          break;
        default:
          aiProvider = new OpenAIProvider(customConfig.api_key);
      }
    } else {
      // Use admin-configured providers
      const { data: adminProvider } = await supabase
        .from('ai_provider_settings')
        .select('*')
        .eq('provider', provider)
        .eq('is_enabled', true)
        .single();

      if (!adminProvider || !adminProvider.api_key_encrypted) {
        throw new Error(`AI provider ${provider} is not properly configured by admin`);
      }

      // Decrypt API key (simple base64 decode for demo - use proper encryption in production)
      const apiKey = atob(adminProvider.api_key_encrypted);

      switch (provider.toLowerCase()) {
        case 'claude':
          aiProvider = new ClaudeProvider(apiKey);
          break;
        case 'gemini':
          aiProvider = new GeminiProvider(apiKey);
          break;
        case 'azure':
          aiProvider = new AzureOpenAIProvider({
            apiKey: apiKey,
            endpoint: adminProvider.additional_config?.endpoint,
            deployment: adminProvider.additional_config?.deployment
          });
          break;
        default:
          aiProvider = new OpenAIProvider(apiKey);
      }
    }

    const request: AssessmentRequest = {
      type: assessmentType,
      role,
      seniority
    };

    const assessment = await aiProvider.generateAssessment(jobSpec, request);

    // Deduct assessment
    const { error: deductError } = await supabase.rpc('use_assessments', {
      org_id: organizationId,
      assessments_to_deduct: 1,
      description: `AI Assessment Generation - ${assessment.title}`
    });

    if (deductError) {
      throw new Error('Failed to deduct assessment');
    }

    // Store the assessment in the database
    let insertedAssessment;
    if (assessment.type === 'mcq') {
      const mcqAssessment = assessment as MCQAssessment;
      const { data, error } = await supabase
        .from('mcq_assessments')
        .insert({
          title: mcqAssessment.title,
          description: mcqAssessment.description,
          difficulty: mcqAssessment.difficulty,
          organization_id: organizationId,
          metadata: {
            roleCategory: mcqAssessment.metadata.roleCategory,
            seniority: mcqAssessment.metadata.seniority,
            framework: mcqAssessment.metadata.framework,
            skills: mcqAssessment.metadata.skills,
            estimatedDuration: mcqAssessment.metadata.estimatedDuration,
            generatedBy: provider,
            originalJobSpec: jobSpec,
            creditsUsed: 5
          },
          questions: mcqAssessment.questions
        })
        .select()
        .single();

      if (error) throw error;
      insertedAssessment = data;
    } else {
      const generalAssessment = assessment as GeneralAssessment;
      const { data, error } = await supabase
        .from('case_studies') // Assuming case_studies is a generic table for other assessment types
        .insert({
          title: generalAssessment.title,
          description: generalAssessment.description,
          type: generalAssessment.type,
          difficulty: generalAssessment.difficulty,
          organization_id: organizationId,
          metadata: {
            roleCategory: generalAssessment.metadata.roleCategory,
            seniority: generalAssessment.metadata.seniority,
            framework: generalAssessment.metadata.framework,
            skills: generalAssessment.metadata.skills,
            estimatedDuration: generalAssessment.metadata.estimatedDuration,
            generatedBy: provider,
            originalJobSpec: jobSpec,
            creditsUsed: 5
          },
          test_cases: generalAssessment.type === 'programming' ? generalAssessment.testCases : null
      })
      .select()
      .single();

      if (error) throw error;
      insertedAssessment = data;
    }

    return new Response(
      JSON.stringify({ success: true, assessment: insertedAssessment, creditsUsed: 5 }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating assessment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
