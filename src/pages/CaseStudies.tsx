import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';
import MDEditor from '@uiw/react-md-editor';
import { FileText, Send, Plus, Sparkles } from 'lucide-react';
import { AssessmentGenerator } from '../components/AssessmentGenerator';
import { AssessmentTypeSelector } from '../components/AssessmentTypeSelector';

interface CaseStudy {
  id: string;
  title: string;
  description: string;
  type: 'system_design';
  difficulty: 'easy' | 'medium' | 'hard';
}

export function CaseStudies() {
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [selectedStudy, setSelectedStudy] = useState<CaseStudy | null>(null);
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [newStudy, setNewStudy] = useState({
    title: '',
    description: '',
    type: 'system_design' as const,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard'
  });

  useEffect(() => {
    fetchCaseStudies();
  }, []);

  async function fetchCaseStudies() {
    try {
      const { data, error } = await supabase
        .from('case_studies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setCaseStudies(data || []);
    } catch (error) {
      console.error('Error fetching case studies:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createCaseStudy(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('case_studies')
        .insert([newStudy])
        .select()
        .single();

      if (error) throw error;

      setCaseStudies([data, ...caseStudies]);
      setShowCreateModal(false);
      setNewStudy({
        title: '',
        description: '',
        type: 'system_design',
        difficulty: 'medium'
      });
    } catch (error) {
      console.error('Error creating case study:', error);
    } finally {
      setSubmitting(false);
    }
  }

  const handleSubmitResponse = async () => {
    if (!selectedStudy || !response.trim()) return;

    setSubmitting(true);
    try {
      // Here you would typically save the response to your database
      alert('Response submitted successfully!');
      setResponse('');
    } catch (error) {
      console.error('Error submitting response:', error);
      alert('Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-1/3 border-r border-gray-200 p-4 overflow-y-auto bg-gray-50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Case Studies</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAIGenerator(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Generate
            </button>
            <button
              onClick={() => setShowTypeSelector(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Assessment
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {caseStudies.map((study) => (
              <div
                key={study.id}
                className={`p-4 rounded-lg cursor-pointer transition-all transform hover:scale-[1.02] ${
                  selectedStudy?.id === study.id
                    ? 'bg-white border-indigo-500 shadow-md border-2'
                    : 'bg-white hover:bg-gray-50 border border-gray-200 hover:shadow-sm'
                }`}
                onClick={() => setSelectedStudy(study)}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-semibold text-lg text-gray-900">{study.title}</h3>
                </div>
                <div className="flex gap-2 mt-3">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {study.type.replace('_', ' ')}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      study.difficulty === 'easy'
                        ? 'bg-green-100 text-green-800'
                        : study.difficulty === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {study.difficulty}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-2/3 flex flex-col h-full">
        <div className="flex-1 p-6 overflow-y-auto bg-white">
          {selectedStudy ? (
            <div className="prose prose-indigo max-w-none">
              <h1 className="text-3xl font-bold mb-6 text-gray-900">{selectedStudy.title}</h1>
              <ReactMarkdown className="prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700">
                {selectedStudy.description}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <FileText className="h-12 w-12 mb-4 text-gray-400" />
              <p className="text-lg">Select a case study to view its details</p>
            </div>
          )}
        </div>

        {selectedStudy && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="mb-2 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Your Response</h3>
              <button
                onClick={handleSubmitResponse}
                disabled={submitting || !response.trim()}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4 mr-2" />
                Submit Response
              </button>
            </div>
            <div data-color-mode="light">
              <MDEditor
                value={response}
                onChange={(value) => setResponse(value || '')}
                preview="edit"
                height={300}
                className="border border-gray-200 rounded-md"
              />
            </div>
          </div>
        )}
      </div>

      {/* Create Case Study Modal */}
      {showCreateModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={createCaseStudy}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                      type="text"
                      required
                      value={newStudy.title}
                      onChange={(e) => setNewStudy({ ...newStudy, title: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                      value={newStudy.type}
                      onChange={(e) => setNewStudy({ ...newStudy, type: e.target.value as 'system_design' })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="system_design">System Design</option>
                      <option value="programming">Programming</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Difficulty</label>
                    <select
                      value={newStudy.difficulty}
                      onChange={(e) => setNewStudy({ ...newStudy, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
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
                        value={newStudy.description}
                        onChange={(value) => setNewStudy({ ...newStudy, description: value || '' })}
                        preview="edit"
                        height={200}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Create Case Study
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

      {/* AI Generator Modal */}
      {showAIGenerator && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <AssessmentGenerator />
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
