import React, { useState, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { supabase, isAdmin, reorderAssessment } from '../lib/supabase';
import { Plus, Save, Trash, Edit, Search, AlertCircle, GripVertical, UserPlus } from 'lucide-react';
import { AssessmentGenerator } from '../components/AssessmentGenerator';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type AssessmentType = 'case_study' | 'code_assessment';
type Difficulty = 'easy' | 'medium' | 'hard';
type CaseStudyType = 'programming' | 'system_design';

interface Assessment {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  type?: CaseStudyType;
  created_at: string;
  updated_at: string;
  position?: number;
}

interface FormData {
  id?: string;
  title: string;
  description: string;
  type: AssessmentType;
  difficulty: Difficulty;
  caseStudyType?: CaseStudyType;
}

interface SortableItemProps {
  assessment: Assessment;
  onEdit: (assessment: Assessment) => void;
  onDelete: (id: string) => void;
}

interface AssignmentModalProps {
  assessment: Assessment;
  onClose: () => void;
}

function AssignmentModal({ assessment, onClose }: AssignmentModalProps) {
  const [email, setEmail] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: assignError } = await supabase
        .from('assessment_assignments')
        .insert({
          assessment_id: assessment.id,
          assessment_type: assessment.type ? 'case_study' : 'code_assessment',
          user_email: email,
          due_date: dueDate || null,
        });

      if (assignError) throw assignError;
      onClose();
    } catch (err) {
      console.error('Error assigning assessment:', err);
      setError('Failed to assign assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Assign Assessment
        </h3>
        <form onSubmit={handleAssign} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date (Optional)
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
            >
              {loading ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SortableItem({ assessment, onEdit, onDelete }: SortableItemProps) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: assessment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <>
      <li ref={setNodeRef} style={style} {...attributes}>
        <div className="px-4 py-4 flex items-center justify-between sm:px-6">
          <div className="flex items-center flex-1 min-w-0">
            <div
              className="cursor-move px-2 py-2 hover:bg-gray-100 rounded"
              {...listeners}
            >
              <GripVertical className="h-5 w-5 text-gray-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {assessment.title}
              </h3>
              <div className="mt-2 flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  assessment.difficulty === 'easy'
                    ? 'bg-green-100 text-green-800'
                    : assessment.difficulty === 'medium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {assessment.difficulty}
                </span>
                {assessment.type && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {assessment.type}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Assign
            </button>
            <button
              onClick={() => onEdit(assessment)}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </button>
            <button
              onClick={() => onDelete(assessment.id)}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
            >
              <Trash className="h-4 w-4 mr-1" />
              Delete
            </button>
          </div>
        </div>
      </li>
      {showAssignModal && (
        <AssignmentModal
          assessment={assessment}
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </>
  );
}

const initialFormData: FormData = {
  title: '',
  description: '',
  type: 'case_study',
  difficulty: 'medium',
  caseStudyType: 'system_design',
};

export function Admin() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [page, setPage] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const itemsPerPage = 10;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    checkAdminStatus();
    fetchAssessments();
  }, [page]);

  async function checkAdminStatus() {
    const adminStatus = await isAdmin();
    setIsAdminUser(adminStatus);
  }

  async function fetchAssessments() {
    try {
      const startIndex = (page - 1) * itemsPerPage;
      
      const [{ data: caseStudies }, { data: codeAssessments }] = await Promise.all([
        supabase
          .from('case_studies')
          .select(`
            *,
            assessment_order (
              position
            )
          `)
          .order('created_at', { ascending: false })
          .range(startIndex, startIndex + itemsPerPage - 1),
        supabase
          .from('code_assessments')
          .select(`
            *,
            assessment_order (
              position
            )
          `)
          .order('created_at', { ascending: false })
          .range(startIndex, startIndex + itemsPerPage - 1)
      ]);

      const combined = [
        ...(caseStudies?.map(cs => ({
          ...cs,
          position: cs.assessment_order?.[0]?.position
        })) || []),
        ...(codeAssessments?.map(ca => ({
          ...ca,
          position: ca.assessment_order?.[0]?.position
        })) || [])
      ].sort((a, b) => (a.position || 0) - (b.position || 0));

      setAssessments(combined);
    } catch (error) {
      console.error('Error fetching assessments:', error);
      setMessage('Error fetching assessments');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.description.length < 50) {
      setMessage('Description must be at least 50 characters long');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const table = formData.type === 'case_study' ? 'case_studies' : 'code_assessments';
      const dataToInsert = {
        title: formData.title,
        description: formData.description,
        difficulty: formData.difficulty,
        ...(formData.type === 'case_study' ? { type: formData.caseStudyType } : {}),
      };

      if (isEditing && formData.id) {
        const { error } = await supabase
          .from(table)
          .update(dataToInsert)
          .eq('id', formData.id);
        if (error) throw error;
        setMessage('Successfully updated assessment!');
      } else {
        const { error } = await supabase
          .from(table)
          .insert(dataToInsert);
        if (error) throw error;
        setMessage('Successfully created new assessment!');
      }

      setFormData(initialFormData);
      setIsEditing(false);
      fetchAssessments();
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error saving assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      const oldIndex = assessments.findIndex((item) => item.id === active.id);
      const newIndex = assessments.findIndex((item) => item.id === over.id);
      
      const assessment = assessments[oldIndex];
      const assessmentType = assessment.type ? 'case_studies' : 'code_assessments';
      
      try {
        await reorderAssessment(
          assessment.id,
          assessmentType,
          newIndex + 1
        );
        
        setAssessments(arrayMove(assessments, oldIndex, newIndex));
      } catch (error) {
        console.error('Error reordering assessment:', error);
        setMessage('Error reordering assessment');
      }
    }
  };

  const handleEdit = (assessment: Assessment) => {
    setFormData({
      id: assessment.id,
      title: assessment.title,
      description: assessment.description,
      type: assessment.type ? 'case_study' : 'code_assessment',
      difficulty: assessment.difficulty,
      caseStudyType: assessment.type,
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const assessment = assessments.find(a => a.id === id);
      if (!assessment) return;

      const table = assessment.type ? 'case_studies' : 'code_assessments';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setMessage('Assessment deleted successfully');
      setShowDeleteConfirm(null);
      fetchAssessments();
    } catch (error) {
      console.error('Error deleting assessment:', error);
      setMessage('Error deleting assessment');
    }
  };

  const filteredAssessments = assessments.filter(assessment =>
    assessment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assessment.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdminUser) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-red-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Access Denied
              </h3>
              <p className="mt-2 text-sm text-red-700">
                You do not have permission to access this page. Please contact an administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <AssessmentGenerator />
      
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Existing Assessments</h2>
          <div className="flex gap-4">
            <div className="relative">
              <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search assessments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredAssessments.map(a => a.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="divide-y divide-gray-200">
                {filteredAssessments.map((assessment) => (
                  <SortableItem
                    key={assessment.id}
                    assessment={assessment}
                    onEdit={handleEdit}
                    onDelete={(id) => setShowDeleteConfirm(id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">Page {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={assessments.length < itemsPerPage}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">
          {isEditing ? 'Edit Assessment' : 'Create New Assessment'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assessment Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as AssessmentType })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="case_study">Case Study</option>
              <option value="code_assessment">Code Assessment</option>
            </select>
          </div>

          {formData.type === 'case_study' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Case Study Type
              </label>
              <select
                value={formData.caseStudyType}
                onChange={(e) => setFormData({ ...formData, caseStudyType: e.target.value as CaseStudyType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="system_design">System Design</option>
                <option value="programming">Programming</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty
            </label>
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Description (Markdown)
              </label>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                {showPreview ? 'Show Editor' : 'Show Preview'}
              </button>
            </div>
            <div data-color-mode="light">
              {showPreview ? (
                <div className="prose prose-indigo max-w-none border rounded-md p-4">
                  <MDEditor.Markdown source={formData.description} />
                </div>
              ) : (
                <MDEditor
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value || '' })}
                  preview="edit"
                  height={400}
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => {
                setFormData(initialFormData);
                setIsEditing(false);
              }}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Trash className="h-4 w-4 mr-2" />
              Clear Form
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : isEditing ? 'Update Assessment' : 'Create Assessment'}
            </button>
          </div>

          {message && (
            <div
              className={`mt-4 p-4 rounded-md ${
                message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
              }`}
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}