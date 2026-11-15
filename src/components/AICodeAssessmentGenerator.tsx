import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, AlertCircle } from 'lucide-react';

interface AIGeneratedAssessment {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  testCases: {
    name: string;
    input: string;
    expected_output: string;
    is_hidden: boolean;
  }[];
}

interface Props {
  onGenerated: (assessment: AIGeneratedAssessment) => void;
  language?: string;
}

export function AICodeAssessmentGenerator({ onGenerated, language = 'javascript' }: Props) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const generateAssessment = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const systemPrompt = `You are an expert coding interviewer creating programming assessments.
      Generate a coding problem with the following requirements:
      1. Clear problem statement with examples
      2. Input/output format specification
      3. Constraints and edge cases
      4. At least 3-5 test cases (mix of visible and hidden)
      
      The problem should be appropriate for ${language} and test algorithmic thinking.
      
      Return your response in this exact JSON format:
      {
        "title": "Problem Title",
        "description": "Full problem description in Markdown format",
        "difficulty": "easy|medium|hard",
        "testCases": [
          {
            "name": "Test case name",
            "input": "Input for the test case",
            "expected_output": "Expected output",
            "is_hidden": false
          }
        ]
      }`;

      const { data, error: fnError } = await supabase.functions.invoke('generate-assessment', {
        body: {
          prompt: systemPrompt,
          userPrompt: prompt,
          type: 'code'
        }
      });

      if (fnError) throw fnError;

      const assessment = JSON.parse(data.content) as AIGeneratedAssessment;
      
      // Validate the response
      if (!assessment.title || !assessment.description || !assessment.testCases || assessment.testCases.length < 3) {
        throw new Error('Invalid assessment format received from AI');
      }

      onGenerated(assessment);
    } catch (err) {
      console.error('Error generating assessment:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate assessment');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg">
      <div className="flex items-center mb-4">
        <Sparkles className="h-6 w-6 text-purple-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">AI Assessment Generator</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe the coding problem you want to create
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            rows={4}
            placeholder="e.g., Create a problem about finding the longest palindromic substring with dynamic programming approach..."
            disabled={generating}
          />
        </div>

        {error && (
          <div className="flex items-center text-red-600 text-sm">
            <AlertCircle className="h-4 w-4 mr-1" />
            {error}
          </div>
        )}

        <button
          onClick={generateAssessment}
          disabled={generating || !prompt.trim()}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating Assessment...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Assessment
            </>
          )}
        </button>

        <div className="text-sm text-gray-600">
          <p className="font-medium mb-1">Tips for better results:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Specify the data structures or algorithms to test</li>
            <li>Mention the difficulty level and time complexity expectations</li>
            <li>Include any specific constraints or requirements</li>
            <li>Describe the target audience (junior, mid, senior)</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 