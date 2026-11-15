import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Code, 
  FileText, 
  ListChecks, 
  Clock, 
  Users, 
  TrendingUp,
  Filter,
  Search,
  Plus,
  Send,
  Brain,
  Briefcase,
  Database,
  Globe,
  Cpu,
  GitBranch
} from 'lucide-react';

interface Assessment {
  id: string;
  title: string;
  description: string;
  type: 'code' | 'case_study' | 'mcq';
  difficulty: 'easy' | 'medium' | 'hard';
  duration_minutes: number;
  skills: string[];
  category: string;
  usage_count?: number;
  created_at: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  'Programming': <Code className="h-6 w-6" />,
  'System Design': <Cpu className="h-6 w-6" />,
  'Data Structures': <GitBranch className="h-6 w-6" />,
  'Databases': <Database className="h-6 w-6" />,
  'Web Development': <Globe className="h-6 w-6" />,
  'Problem Solving': <Brain className="h-6 w-6" />,
  'Business Analysis': <Briefcase className="h-6 w-6" />,
  'General': <FileText className="h-6 w-6" />
};

const typeConfig = {
  code: {
    icon: <Code className="h-5 w-5" />,
    label: 'Coding',
    color: 'bg-blue-100 text-blue-800'
  },
  case_study: {
    icon: <FileText className="h-5 w-5" />,
    label: 'Case Study',
    color: 'bg-purple-100 text-purple-800'
  },
  mcq: {
    icon: <ListChecks className="h-5 w-5" />,
    label: 'Multiple Choice',
    color: 'bg-green-100 text-green-800'
  }
};

export default function AssessmentLibrary() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadAssessments();
  }, []);

  useEffect(() => {
    filterAssessments();
  }, [assessments, searchQuery, selectedType, selectedDifficulty, selectedCategory]);

  const loadAssessments = async () => {
    try {
      // Load code assessments
      const { data: codeAssessments } = await supabase
        .from('code_assessments')
        .select('*')
        .order('created_at', { ascending: false });

      // Load case studies
      const { data: caseStudies } = await supabase
        .from('case_studies')
        .select('*')
        .order('created_at', { ascending: false });

      // Load MCQ assessments
      const { data: mcqAssessments } = await supabase
        .from('mcq_assessments')
        .select('*')
        .order('created_at', { ascending: false });

      // Combine and format all assessments
      const allAssessments: Assessment[] = [
        ...(codeAssessments || []).map(a => ({
          ...a,
          type: 'code' as const,
          duration_minutes: a.time_limit ? Math.round(a.time_limit / 60) : 120,
          skills: a.required_skills || [],
          category: a.category || 'Programming'
        })),
        ...(caseStudies || []).map(a => ({
          ...a,
          type: 'case_study' as const,
          duration_minutes: 90,
          skills: a.skills || [],
          category: a.category || 'Business Analysis'
        })),
        ...(mcqAssessments || []).map(a => ({
          ...a,
          type: 'mcq' as const,
          duration_minutes: a.time_limit || 60,
          skills: a.skills || [],
          category: a.category || 'General'
        }))
      ];

      setAssessments(allAssessments);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(allAssessments.map(a => a.category))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error loading assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAssessments = () => {
    let filtered = [...assessments];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(a => a.type === selectedType);
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(a => a.difficulty === selectedDifficulty);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(a => a.category === selectedCategory);
    }

    setFilteredAssessments(filtered);
  };

  const handleSendAssessment = (assessmentId: string, type: string) => {
    // Navigate to the appropriate page to send the assessment
    navigate(`/${type === 'code' ? 'code-assessment' : type === 'case_study' ? 'case-studies' : 'mcq-management'}?send=${assessmentId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Assessment Library</h1>
            <p className="mt-2 text-gray-600">
              Browse and select assessments to evaluate your candidates
            </p>
          </div>
          <div className="flex space-x-4">
            <Link
              to="/code-assessment"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assessments..."
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="code">Coding</option>
              <option value="case_study">Case Study</option>
              <option value="mcq">Multiple Choice</option>
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty
            </label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">All Levels</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Assessment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssessments.map((assessment) => {
          const config = typeConfig[assessment.type];
          const icon = categoryIcons[assessment.category] || categoryIcons['General'];
          
          return (
            <div
              key={assessment.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200"
            >
              {/* Card Header */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {assessment.title}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                        {config.icon}
                        <span className="ml-1">{config.label}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {assessment.description}
                </p>

                {/* Skills */}
                {assessment.skills.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {assessment.skills.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                        >
                          {skill}
                        </span>
                      ))}
                      {assessment.skills.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{assessment.skills.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {assessment.duration_minutes} min
                    </div>
                    <div className={`font-medium ${
                      assessment.difficulty === 'easy' ? 'text-green-600' :
                      assessment.difficulty === 'medium' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {assessment.difficulty.charAt(0).toUpperCase() + assessment.difficulty.slice(1)}
                    </div>
                  </div>
                  {assessment.usage_count !== undefined && (
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {assessment.usage_count}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex space-x-3">
                  <button
                    onClick={() => navigate(`/${assessment.type === 'code' ? 'code-assessment' : assessment.type === 'case_study' ? 'case-studies' : 'mcq-management'}?view=${assessment.id}`)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleSendAssessment(assessment.id, assessment.type)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Send
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredAssessments.length === 0 && (
        <div className="text-center py-12">
          <Filter className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No assessments found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filters or create a new assessment.
          </p>
          <div className="mt-6">
            <Link
              to="/code-assessment"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Assessment
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
