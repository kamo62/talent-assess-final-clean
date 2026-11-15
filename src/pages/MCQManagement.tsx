import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  getCategories,
  getQuestions,
  createCategory,
  createQuestion,
  createAssessment,
  getAssessmentAnalytics,
  getUserPerformance,
  MCQCategory,
  MCQQuestion,
  MCQAssessment
} from '../lib/mcqSystem';
import {
  BookOpen,
  Plus,
  Filter,
  BarChart3,
  Clock,
  Target,
  TrendingUp,
  Users,
  Award,
  Brain,
  Layers,
  Settings,
  ChevronRight,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { AssessmentTypeSelector } from '../components/AssessmentTypeSelector';

interface QuestionFormData {
  category_id: string;
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'true_false';
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  time_limit_seconds: number | null;
  explanation: string;
  tags: string[];
  options: {
    option_text: string;
    is_correct: boolean;
    explanation: string;
  }[];
}

interface AssessmentFormData {
  title: string;
  description: string;
  category_id: string;
  time_limit_minutes: number;
  passing_score_percentage: number;
  randomize_questions: boolean;
  randomize_options: boolean;
  show_correct_answers: boolean;
  allow_review: boolean;
  max_attempts: number;
  difficulty_distribution: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export function MCQManagement() {
  const [activeTab, setActiveTab] = useState<'questions' | 'assessments' | 'analytics'>('questions');
  const [categories, setCategories] = useState<MCQCategory[]>([]);
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [assessments, setAssessments] = useState<MCQAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [userPerformance, setUserPerformance] = useState<any>(null);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const [questionForm, setQuestionForm] = useState<QuestionFormData>({
    category_id: '',
    question_text: '',
    question_type: 'single_choice',
    difficulty: 'medium',
    points: 1,
    time_limit_seconds: null,
    explanation: '',
    tags: [],
    options: [
      { option_text: '', is_correct: false, explanation: '' },
      { option_text: '', is_correct: false, explanation: '' },
      { option_text: '', is_correct: false, explanation: '' },
      { option_text: '', is_correct: false, explanation: '' }
    ]
  });

  const [assessmentForm, setAssessmentForm] = useState<AssessmentFormData>({
    title: '',
    description: '',
    category_id: '',
    time_limit_minutes: 60,
    passing_score_percentage: 70,
    randomize_questions: true,
    randomize_options: true,
    show_correct_answers: false,
    allow_review: true,
    max_attempts: 1,
    difficulty_distribution: {
      easy: 30,
      medium: 50,
      hard: 20
    }
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    parent_id: null as string | null
  });

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedDifficulty]);

  async function loadData() {
    try {
      setLoading(true);
      
      // Load categories
      const categoriesData = await getCategories();
      setCategories(categoriesData);

      // Load questions with filters
      const filters: any = {};
      if (selectedCategory !== 'all') {
        filters.category_id = selectedCategory;
      }
      if (selectedDifficulty !== 'all') {
        filters.difficulty = selectedDifficulty;
      }
      
      const questionsData = await getQuestions(filters);
      setQuestions(questionsData);

      // Load assessments
      const { data: assessmentsData } = await supabase
        .from('mcq_assessments')
        .select('*')
        .order('created_at', { ascending: false });
      setAssessments(assessmentsData || []);

      // Load user performance
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const performance = await getUserPerformance(user.id);
        setUserPerformance(performance);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createCategory(categoryForm);
      setCategoryForm({ name: '', description: '', parent_id: null });
      setShowCategoryModal(false);
      loadData();
    } catch (error) {
      console.error('Error creating category:', error);
    }
  }

  async function handleCreateQuestion(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { options, ...questionData } = questionForm;
      await createQuestion(
        { ...questionData, created_by: user.id, is_active: true },
        options.map((opt, index) => ({ ...opt, display_order: index }))
      );
      
      setShowQuestionModal(false);
      loadData();
    } catch (error) {
      console.error('Error creating question:', error);
    }
  }

  async function handleCreateAssessment(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      await createAssessment({ ...assessmentForm, created_by: user.id });
      setShowAssessmentModal(false);
      loadData();
    } catch (error) {
      console.error('Error creating assessment:', error);
    }
  }

  function addOption() {
    setQuestionForm({
      ...questionForm,
      options: [...questionForm.options, { option_text: '', is_correct: false, explanation: '' }]
    });
  }

  function removeOption(index: number) {
    setQuestionForm({
      ...questionForm,
      options: questionForm.options.filter((_, i) => i !== index)
    });
  }

  function updateOption(index: number, field: string, value: any) {
    const newOptions = [...questionForm.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setQuestionForm({ ...questionForm, options: newOptions });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">MCQ Management System</h1>
        <p className="mt-2 text-gray-600">Manage questions, assessments, and track performance</p>
      </div>

      {/* Performance Overview */}
      {userPerformance && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Attempts</p>
                <p className="text-2xl font-semibold text-gray-900">{userPerformance.totalAttempts}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Award className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Passed</p>
                <p className="text-2xl font-semibold text-gray-900">{userPerformance.passedAttempts}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-indigo-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-semibold text-gray-900">{userPerformance.averageScore.toFixed(1)}%</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {((userPerformance.completedAttempts / userPerformance.totalAttempts) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('questions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'questions'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BookOpen className="inline-block h-5 w-5 mr-2" />
            Question Bank
          </button>
          <button
            onClick={() => setActiveTab('assessments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assessments'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Layers className="inline-block h-5 w-5 mr-2" />
            Assessments
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="inline-block h-5 w-5 mr-2" />
            Analytics
          </button>
        </nav>
      </div>

      {/* Question Bank Tab */}
      {activeTab === 'questions' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowCategoryModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Category
              </button>
              <button
                onClick={() => setShowQuestionModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Question
              </button>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {questions.map((question) => (
                <li key={question.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {question.question_text}
                        </p>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {question.difficulty}
                          </span>
                          <span className="ml-2">{question.points} points</span>
                          {question.time_limit_seconds && (
                            <span className="ml-2 flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {Math.floor(question.time_limit_seconds / 60)}m
                            </span>
                          )}
                          {question.tags.length > 0 && (
                            <span className="ml-2">
                              Tags: {question.tags.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="text-gray-400 hover:text-gray-500">
                          <Eye className="h-5 w-5" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-500">
                          <Edit className="h-5 w-5" />
                        </button>
                        <button className="text-gray-400 hover:text-red-500">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Assessments Tab */}
      {activeTab === 'assessments' && (
        <div>
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setShowTypeSelector(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Assessment
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assessments.map((assessment) => (
              <div key={assessment.id} className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900">{assessment.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{assessment.description}</p>
                
                <div className="mt-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-2" />
                    {assessment.time_limit_minutes} minutes
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Target className="h-4 w-4 mr-2" />
                    Passing: {assessment.passing_score_percentage}%
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="h-4 w-4 mr-2" />
                    Max attempts: {assessment.max_attempts}
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">
                    View Details
                  </button>
                  <button className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">
                    Take Assessment
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Question Performance Analytics</h2>
            <p className="text-gray-600">
              Detailed analytics and performance metrics for questions and assessments will be displayed here.
            </p>
            {/* Add charts and detailed analytics here */}
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {showCategoryModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreateCategory}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Category</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      rows={3}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Parent Category</label>
                    <select
                      value={categoryForm.parent_id || ''}
                      onChange={(e) => setCategoryForm({ ...categoryForm, parent_id: e.target.value || null })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="">None (Top Level)</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(false)}
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

      {/* Create Question Modal */}
      {showQuestionModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleCreateQuestion}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[80vh] overflow-y-auto">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Question</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <select
                        value={questionForm.category_id}
                        onChange={(e) => setQuestionForm({ ...questionForm, category_id: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Question Type</label>
                      <select
                        value={questionForm.question_type}
                        onChange={(e) => setQuestionForm({ ...questionForm, question_type: e.target.value as any })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="single_choice">Single Choice</option>
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="true_false">True/False</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Question Text</label>
                    <textarea
                      value={questionForm.question_text}
                      onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Difficulty</label>
                      <select
                        value={questionForm.difficulty}
                        onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value as any })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Points</label>
                      <input
                        type="number"
                        value={questionForm.points}
                        onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        min="1"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Time Limit (seconds)</label>
                      <input
                        type="number"
                        value={questionForm.time_limit_seconds || ''}
                        onChange={(e) => setQuestionForm({ ...questionForm, time_limit_seconds: e.target.value ? parseInt(e.target.value) : null })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Options
                      <button
                        type="button"
                        onClick={addOption}
                        className="ml-2 text-indigo-600 hover:text-indigo-900 text-sm"
                      >
                        + Add Option
                      </button>
                    </label>
                    {questionForm.options.map((option, index) => (
                      <div key={index} className="mb-2 p-3 border border-gray-200 rounded-md">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type={questionForm.question_type === 'single_choice' ? 'radio' : 'checkbox'}
                            checked={option.is_correct}
                            onChange={(e) => {
                              if (questionForm.question_type === 'single_choice') {
                                const newOptions = questionForm.options.map((opt, i) => ({
                                  ...opt,
                                  is_correct: i === index
                                }));
                                setQuestionForm({ ...questionForm, options: newOptions });
                              } else {
                                updateOption(index, 'is_correct', e.target.checked);
                              }
                            }}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                          />
                          <input
                            type="text"
                            value={option.option_text}
                            onChange={(e) => updateOption(index, 'option_text', e.target.value)}
                            className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Option text"
                            required
                          />
                          {questionForm.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(index)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={option.explanation}
                          onChange={(e) => updateOption(index, 'explanation', e.target.value)}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-sm"
                          placeholder="Explanation (optional)"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Explanation</label>
                    <textarea
                      value={questionForm.explanation}
                      onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      rows={2}
                      placeholder="Explanation shown after answer (optional)"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Tags</label>
                    <input
                      type="text"
                      value={questionForm.tags.join(', ')}
                      onChange={(e) => setQuestionForm({ 
                        ...questionForm, 
                        tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) 
                      })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Comma-separated tags (optional)"
                    />
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
                    onClick={() => setShowQuestionModal(false)}
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

      {/* Create Assessment Modal */}
      {showAssessmentModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreateAssessment}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Assessment</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                      type="text"
                      value={assessmentForm.title}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={assessmentForm.description}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, description: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      rows={3}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                      value={assessmentForm.category_id}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, category_id: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Time Limit (minutes)</label>
                      <input
                        type="number"
                        value={assessmentForm.time_limit_minutes}
                        onChange={(e) => setAssessmentForm({ ...assessmentForm, time_limit_minutes: parseInt(e.target.value) })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        min="1"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Passing Score (%)</label>
                      <input
                        type="number"
                        value={assessmentForm.passing_score_percentage}
                        onChange={(e) => setAssessmentForm({ ...assessmentForm, passing_score_percentage: parseInt(e.target.value) })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        min="0"
                        max="100"
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Distribution</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-gray-600">Easy (%)</label>
                        <input
                          type="number"
                          value={assessmentForm.difficulty_distribution.easy}
                          onChange={(e) => setAssessmentForm({ 
                            ...assessmentForm, 
                            difficulty_distribution: { 
                              ...assessmentForm.difficulty_distribution, 
                              easy: parseInt(e.target.value) 
                            } 
                          })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          min="0"
                          max="100"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Medium (%)</label>
                        <input
                          type="number"
                          value={assessmentForm.difficulty_distribution.medium}
                          onChange={(e) => setAssessmentForm({ 
                            ...assessmentForm, 
                            difficulty_distribution: { 
                              ...assessmentForm.difficulty_distribution, 
                              medium: parseInt(e.target.value) 
                            } 
                          })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          min="0"
                          max="100"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Hard (%)</label>
                        <input
                          type="number"
                          value={assessmentForm.difficulty_distribution.hard}
                          onChange={(e) => setAssessmentForm({ 
                            ...assessmentForm, 
                            difficulty_distribution: { 
                              ...assessmentForm.difficulty_distribution, 
                              hard: parseInt(e.target.value) 
                            } 
                          })}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={assessmentForm.randomize_questions}
                        onChange={(e) => setAssessmentForm({ ...assessmentForm, randomize_questions: e.target.checked })}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Randomize questions</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={assessmentForm.randomize_options}
                        onChange={(e) => setAssessmentForm({ ...assessmentForm, randomize_options: e.target.checked })}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Randomize options</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={assessmentForm.show_correct_answers}
                        onChange={(e) => setAssessmentForm({ ...assessmentForm, show_correct_answers: e.target.checked })}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Show correct answers after submission</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={assessmentForm.allow_review}
                        onChange={(e) => setAssessmentForm({ ...assessmentForm, allow_review: e.target.checked })}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Allow review after submission</span>
                    </label>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Create Assessment
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAssessmentModal(false)}
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

      {/* Assessment Type Selector Modal */}
      {showTypeSelector && (
        <AssessmentTypeSelector onClose={() => setShowTypeSelector(false)} />
      )}
    </div>
  );
}
