import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Code, 
  ListChecks, 
  Plus, 
  Search,
  Filter,
  Trash2,
  Copy,
  Tag,
  MoreVertical,
  CheckSquare,
  Square,
  Send,
  BookOpen
} from 'lucide-react';
import { 
  getAllAssessments, 
  deleteAssessment, 
  duplicateAssessment,
  bulkDeleteAssessments,
  bulkDuplicateAssessments,
  bulkTagAssessments,
  convertToTemplate,
  getAllTags,
  type UnifiedAssessment,
  type AssessmentFilters
} from '../lib/assessmentManagement';
import { SendToCandidateModal } from '../components/SendToCandidateModal';

export function AssessmentManagement() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<UnifiedAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssessments, setSelectedAssessments] = useState<Set<string>>(new Set());
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [filters, setFilters] = useState<AssessmentFilters>({ type: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedForTemplate, setSelectedForTemplate] = useState<UnifiedAssessment | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedForSend, setSelectedForSend] = useState<UnifiedAssessment | null>(null);

  useEffect(() => {
    fetchAssessments();
    fetchTags();
  }, [filters]);

  async function fetchAssessments() {
    setLoading(true);
    try {
      const data = await getAllAssessments({
        ...filters,
        search: searchQuery || undefined
      });
      setAssessments(data);
    } catch (error) {
      console.error('Error fetching assessments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTags() {
    try {
      const tags = await getAllTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  }

  function handleSelectAll() {
    if (selectedAssessments.size === assessments.length) {
      setSelectedAssessments(new Set());
    } else {
      setSelectedAssessments(new Set(assessments.map(a => a.id)));
    }
  }

  function handleSelectAssessment(id: string) {
    const newSelection = new Set(selectedAssessments);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedAssessments(newSelection);
  }

  async function handleDelete(assessment: UnifiedAssessment) {
    if (confirm(`Are you sure you want to delete "${assessment.title}"?`)) {
      try {
        await deleteAssessment(assessment.id, assessment.type);
        fetchAssessments();
      } catch (error) {
        console.error('Error deleting assessment:', error);
      }
    }
  }

  async function handleDuplicate(assessment: UnifiedAssessment) {
    try {
      await duplicateAssessment(assessment.id, assessment.type);
      fetchAssessments();
    } catch (error) {
      console.error('Error duplicating assessment:', error);
    }
  }

  async function handleBulkDelete() {
    if (selectedAssessments.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedAssessments.size} assessments?`)) {
      try {
        // Group by type for bulk operations
        const groupedByType = new Map<string, string[]>();
        assessments.forEach(a => {
          if (selectedAssessments.has(a.id)) {
            const ids = groupedByType.get(a.type) || [];
            ids.push(a.id);
            groupedByType.set(a.type, ids);
          }
        });

        // Execute bulk delete for each type
        for (const [type, ids] of groupedByType) {
          await bulkDeleteAssessments(ids, type);
        }

        setSelectedAssessments(new Set());
        fetchAssessments();
      } catch (error) {
        console.error('Error bulk deleting assessments:', error);
      }
    }
  }

  async function handleBulkDuplicate() {
    if (selectedAssessments.size === 0) return;
    
    try {
      // Group by type for bulk operations
      const groupedByType = new Map<string, string[]>();
      assessments.forEach(a => {
        if (selectedAssessments.has(a.id)) {
          const ids = groupedByType.get(a.type) || [];
          ids.push(a.id);
          groupedByType.set(a.type, ids);
        }
      });

      // Execute bulk duplicate for each type
      for (const [type, ids] of groupedByType) {
        await bulkDuplicateAssessments(ids, type);
      }

      setSelectedAssessments(new Set());
      fetchAssessments();
    } catch (error) {
      console.error('Error bulk duplicating assessments:', error);
    }
  }

  function getAssessmentIcon(type: string) {
    switch (type) {
      case 'code':
        return <Code className="h-5 w-5" />;
      case 'case_study':
        return <FileText className="h-5 w-5" />;
      case 'mcq':
        return <ListChecks className="h-5 w-5" />;
      default:
        return null;
    }
  }

  function getAssessmentTypeName(type: string) {
    switch (type) {
      case 'code':
        return 'Code';
      case 'case_study':
        return 'Case Study';
      case 'mcq':
        return 'MCQ';
      default:
        return type;
    }
  }

  function navigateToCreate(type: string) {
    switch (type) {
      case 'code':
        navigate('/code-assessment');
        break;
      case 'case_study':
        navigate('/case-studies');
        break;
      case 'mcq':
        navigate('/mcq-management');
        break;
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Assessment Management</h1>
        <p className="mt-2 text-gray-600">Manage all your assessments in one place</p>
      </div>

      {/* Action Bar */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search assessments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAssessments()}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={filters.type || 'all'}
                onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Types</option>
                <option value="code">Code</option>
                <option value="case_study">Case Study</option>
                <option value="mcq">MCQ</option>
              </select>

              <select
                value={filters.difficulty || ''}
                onChange={(e) => setFilters({ ...filters, difficulty: e.target.value || undefined })}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              <button
                onClick={() => setBulkActionMode(!bulkActionMode)}
                className={`px-4 py-2 rounded-md ${
                  bulkActionMode 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <CheckSquare className="h-5 w-5" />
              </button>
            </div>

            {/* Create New Dropdown */}
            <div className="relative group">
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <button
                  onClick={() => navigateToCreate('code')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Code className="inline h-4 w-4 mr-2" />
                  Code Assessment
                </button>
                <button
                  onClick={() => navigateToCreate('case_study')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <FileText className="inline h-4 w-4 mr-2" />
                  Case Study
                </button>
                <button
                  onClick={() => navigateToCreate('mcq')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <ListChecks className="inline h-4 w-4 mr-2" />
                  MCQ Assessment
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {bulkActionMode && selectedAssessments.size > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {selectedAssessments.size} selected
            </span>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              <Trash2 className="inline h-4 w-4 mr-1" />
              Delete
            </button>
            <button
              onClick={handleBulkDuplicate}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              <Copy className="inline h-4 w-4 mr-1" />
              Duplicate
            </button>
            <button
              onClick={() => setShowTagModal(true)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Tag className="inline h-4 w-4 mr-1" />
              Tag
            </button>
          </div>
        )}
      </div>

      {/* Assessments Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {bulkActionMode && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedAssessments.size === assessments.length && assessments.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Difficulty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {assessments.map((assessment) => (
              <tr key={assessment.id} className="hover:bg-gray-50">
                {bulkActionMode && (
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedAssessments.has(assessment.id)}
                      onChange={() => handleSelectAssessment(assessment.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getAssessmentIcon(assessment.type)}
                    <span className="ml-2 text-sm text-gray-900">
                      {getAssessmentTypeName(assessment.type)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {assessment.title}
                    {assessment.is_template && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        Template
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    assessment.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                    assessment.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {assessment.difficulty}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {assessment.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                    {assessment.tags.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{assessment.tags.length - 3} more
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {assessment.usage_count || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(assessment.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="relative group">
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                      <button
                        onClick={() => {
                          setSelectedForSend(assessment);
                          setShowSendModal(true);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Send className="inline h-4 w-4 mr-2" />
                        Send to Candidate
                      </button>
                      <button
                        onClick={() => handleDuplicate(assessment)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Copy className="inline h-4 w-4 mr-2" />
                        Duplicate
                      </button>
                      <button
                        onClick={() => {
                          setSelectedForTemplate(assessment);
                          setShowTemplateModal(true);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <BookOpen className="inline h-4 w-4 mr-2" />
                        Save as Template
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={() => handleDelete(assessment)}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="inline h-4 w-4 mr-2" />
                        Delete
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {assessments.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">No assessments found</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-gray-600">Loading assessments...</span>
            </div>
          </div>
        )}
      </div>

      {/* Send to Candidate Modal */}
      {showSendModal && selectedForSend && (
        <SendToCandidateModal
          assessment={{
            id: selectedForSend.id,
            type: selectedForSend.type,
            title: selectedForSend.title
          }}
          organizationId={selectedForSend.organization_id}
          onClose={() => {
            setShowSendModal(false);
            setSelectedForSend(null);
          }}
          onSend={() => {
            console.log('Assessment sent successfully');
            // You can show a success message here
          }}
        />
      )}

      {/* Template Modal */}
      {showTemplateModal && selectedForTemplate && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Save as Template
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                try {
                  await convertToTemplate(
                    selectedForTemplate.id,
                    selectedForTemplate.type,
                    formData.get('name') as string,
                    formData.get('description') as string,
                    formData.get('category') as string,
                    (formData.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean),
                    formData.get('public') === 'on'
                  );
                  setShowTemplateModal(false);
                  setSelectedForTemplate(null);
                  fetchAssessments();
                } catch (error) {
                  console.error('Error creating template:', error);
                }
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Template Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={`${selectedForTemplate.title} Template`}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <input
                    type="text"
                    name="category"
                    placeholder="e.g., Frontend, Backend, DevOps"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    name="tags"
                    defaultValue={selectedForTemplate.tags.join(', ')}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="public"
                    id="public"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="public" className="ml-2 block text-sm text-gray-900">
                    Make this template public
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplateModal(false);
                    setSelectedForTemplate(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
