import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, CheckCircle, AlertCircle, ChevronRight, Filter, Plus } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';

interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  category: {
    name: string;
  };
  time_limit: string;
  points: number;
}

interface MCQResponse {
  id: string;
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  time_taken: string;
}

export function MCQ() {
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<MCQQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    options: ['', '', '', ''],
    correct_answer: '',
    category_id: '',
    time_limit: '00:05:00',
    points: 1,
    explanation: ''
  });

  useEffect(() => {
    fetchCategories();
    fetchQuestions();
  }, [categoryFilter]);

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('mcq_categories')
        .select('id, name');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }

  async function fetchQuestions() {
    try {
      let query = supabase
        .from('mcq_questions')
        .select(`
          *,
          category:category_id (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (categoryFilter !== 'all') {
        query = query.eq('category_id', categoryFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setQuestions(data || []);
      if (data && data.length > 0 && !currentQuestion) {
        setCurrentQuestion(data[0]);
        if (data[0].time_limit) {
          startTimer(data[0].time_limit);
        }
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      setError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }

  async function createQuestion(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('mcq_questions')
        .insert([newQuestion])
        .select()
        .single();

      if (error) throw error;

      setQuestions([data, ...questions]);
      setShowCreateModal(false);
      setNewQuestion({
        question: '',
        options: ['', '', '', ''],
        correct_answer: '',
        category_id: '',
        time_limit: '00:05:00',
        points: 1,
        explanation: ''
      });
    } catch (error) {
      console.error('Error creating question:', error);
      setError('Failed to create question');
    }
  }

  function startTimer(timeLimit: string) {
    const minutes = parseInt(timeLimit.split(':')[1]);
    setTimeLeft(minutes * 60);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }

  async function handleSubmit() {
    if (!currentQuestion || !selectedAnswer) return;

    try {
      const { error } = await supabase
        .from('mcq_responses')
        .insert({
          question_id: currentQuestion.id,
          selected_answer: selectedAnswer,
          is_correct: selectedAnswer === currentQuestion.options[0],
          time_taken: `${Math.floor((currentQuestion.time_limit - (timeLeft || 0)) / 60)}:${(currentQuestion.time_limit - (timeLeft || 0)) % 60}`
        });

      if (error) throw error;

      const currentIndex = questions.findIndex(q => q.id === currentQuestion.id);
      if (currentIndex < questions.length - 1) {
        setCurrentQuestion(questions[currentIndex + 1]);
        setSelectedAnswer('');
        if (questions[currentIndex + 1].time_limit) {
          startTimer(questions[currentIndex + 1].time_limit);
        }
      } else {
        setCurrentQuestion(null);
        setTimeLeft(null);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      setError('Failed to submit answer');
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
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Multiple Choice Questions</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Question
          </button>
        </div>
      </div>

      {currentQuestion ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-500">
                Question {questions.findIndex(q => q.id === currentQuestion.id) + 1} of {questions.length}
              </span>
              {currentQuestion.category && (
                <span className="ml-4 px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                  {currentQuestion.category.name}
                </span>
              )}
            </div>
            {timeLeft !== null && (
              <div className="flex items-center text-gray-500">
                <Clock className="h-5 w-5 mr-2" />
                <span>
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </span>
              </div>
            )}
          </div>

          <div className="prose prose-indigo max-w-none mb-6">
            <h2 className="text-xl font-semibold text-gray-900">{currentQuestion.question}</h2>
          </div>

          <div className="space-y-4">
            {currentQuestion.options.map((option, index) => (
              <label
                key={index}
                className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedAnswer === option
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="answer"
                    value={option}
                    checked={selectedAnswer === option}
                    onChange={(e) => setSelectedAnswer(e.target.value)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-3">{option}</span>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!selectedAnswer}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Submit Answer
              <ChevronRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">All questions completed!</h2>
          <p className="mt-2 text-gray-500">
            You've answered all the questions in this category.
          </p>
          <button
            onClick={() => {
              if (questions.length > 0) {
                setCurrentQuestion(questions[0]);
                if (questions[0].time_limit) {
                  startTimer(questions[0].time_limit);
                }
              }
            }}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Start Over
          </button>
        </div>
      )}

      {/* Create Question Modal */}
      {showCreateModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={createQuestion}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Question</label>
                    <div data-color-mode="light">
                      <MDEditor
                        value={newQuestion.question}
                        onChange={(value) => setNewQuestion({ ...newQuestion, question: value || '' })}
                        preview="edit"
                        height={150}
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                      value={newQuestion.category_id}
                      onChange={(e) => setNewQuestion({ ...newQuestion, category_id: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Options</label>
                    {newQuestion.options.map((option, index) => (
                      <input
                        key={index}
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...newQuestion.options];
                          newOptions[index] = e.target.value;
                          setNewQuestion({ ...newQuestion, options: newOptions });
                        }}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder={`Option ${index + 1}`}
                        required
                      />
                    ))}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Correct Answer</label>
                    <select
                      value={newQuestion.correct_answer}
                      onChange={(e) => setNewQuestion({ ...newQuestion, correct_answer: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    >
                      <option value="">Select correct answer</option>
                      {newQuestion.options.map((option, index) => (
                        <option key={index} value={option}>
                          {option || `Option ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Time Limit (minutes)</label>
                    <input
                      type="number"
                      value={parseInt(newQuestion.time_limit.split(':')[1])}
                      onChange={(e) => setNewQuestion({ ...newQuestion, time_limit: `00:${e.target.value}:00` })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      min="1"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Points</label>
                    <input
                      type="number"
                      value={newQuestion.points}
                      onChange={(e) => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Explanation</label>
                    <div data-color-mode="light">
                      <MDEditor
                        value={newQuestion.explanation}
                        onChange={(value) => setNewQuestion({ ...newQuestion, explanation: value || '' })}
                        preview="edit"
                        height={100}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Create Question
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
    </div>
  );
}