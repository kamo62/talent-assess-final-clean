import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  Calendar, 
  MessageSquare, 
  Star, 
  UserPlus, 
  ChevronDown, 
  ChevronUp,
  X,
  Loader,
  AlertCircle,
  Upload
} from 'lucide-react';

interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  current_stage: string;
  position_applied: string;
  created_at: string;
  resume_url?: string;
  current_salary?: number;
  expected_salary?: number;
}

interface AddCandidateFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position_applied: string;
  source: string;
  notes: string;
  cv_file?: File;
  current_salary?: number;
  expected_salary?: number;
}

interface SortableItemProps {
  candidate: Candidate;
  onViewDetails: (candidate: Candidate) => void;
}

function SortableItem({ candidate, onViewDetails }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: candidate.id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-3 cursor-move hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {candidate.first_name} {candidate.last_name}
          </h3>
          <p className="text-sm text-gray-500">{candidate.position_applied}</p>
          <p className="text-sm text-gray-500">{candidate.email}</p>
          {candidate.current_salary && (
            <p className="text-sm text-gray-500">Current: ${candidate.current_salary}</p>
          )}
          {candidate.expected_salary && (
            <p className="text-sm text-gray-500">Expected: ${candidate.expected_salary}</p>
          )}
        </div>
        <button
          onClick={() => onViewDetails(candidate)}
          className="text-indigo-600 hover:text-indigo-800"
        >
          View Details
        </button>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {candidate.current_stage}
        </span>
        <span className="text-xs text-gray-500">
          Added {format(new Date(candidate.created_at), 'MMM d, yyyy')}
        </span>
      </div>
    </div>
  );
}

export function Recruitment() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [formData, setFormData] = useState<AddCandidateFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position_applied: '',
    source: '',
    notes: '',
    current_salary: undefined,
    expected_salary: undefined
  });

  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string>('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCandidates();
  }, []);

  async function fetchCandidates() {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCandidates(data || []);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      setError('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  }

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    
    if (!active || !over) return;

    const draggedCandidate = candidates.find(c => c.id === active.id);
    const dropZoneStage = over.id;

    if (draggedCandidate && dropZoneStage && draggedCandidate.current_stage !== dropZoneStage) {
      try {
        setUpdateError('');
        
        const { error } = await supabase
          .from('candidates')
          .update({ current_stage: dropZoneStage })
          .eq('id', draggedCandidate.id);

        if (error) throw error;

        setCandidates(prevCandidates => 
          prevCandidates.map(candidate => 
            candidate.id === draggedCandidate.id
              ? { ...candidate, current_stage: dropZoneStage }
              : candidate
          )
        );
      } catch (error) {
        console.error('Error updating candidate stage:', error);
        setUpdateError('Failed to update candidate stage');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes('pdf')) {
        setUploadError('Please upload a PDF file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('File size should be less than 5MB');
        return;
      }
      setFormData({ ...formData, cv_file: file });
      setUploadError('');
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setUploadError('');

    try {
      let resume_url = '';

      if (formData.cv_file) {
        const fileName = `${Date.now()}-${formData.cv_file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('cvs')
          .upload(fileName, formData.cv_file, {
            onUploadProgress: (progress) => {
              setUploadProgress((progress.loaded / progress.total) * 100);
            }
          });

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('cvs')
          .getPublicUrl(fileName);

        resume_url = publicUrl;
      }

      const { data, error } = await supabase
        .from('candidates')
        .insert([{
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          position_applied: formData.position_applied,
          source: formData.source,
          notes: formData.notes,
          resume_url,
          current_salary: formData.current_salary,
          expected_salary: formData.expected_salary,
          current_stage: 'applied'
        }])
        .select()
        .single();

      if (error) throw error;

      setCandidates([data, ...candidates]);
      setShowAddForm(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        position_applied: '',
        source: '',
        notes: '',
        current_salary: undefined,
        expected_salary: undefined
      });
      setUploadProgress(0);
    } catch (error) {
      console.error('Error adding candidate:', error);
      setError('Failed to add candidate. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const stages = ['applied', 'screening', 'assessment', 'interview', 'offer', 'hired', 'rejected'];

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recruitment Pipeline</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Add Candidate
        </button>
      </div>

      {updateError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{updateError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Users className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-500">Total Candidates</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{candidates.length}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-500">Interviews Today</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-gray-900">0</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <MessageSquare className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-500">Pending Feedback</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-gray-900">0</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Star className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-500">Top Candidates</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-gray-900">0</p>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-6">
          {stages.map((stage) => (
            <div key={stage} className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 capitalize">{stage}</h3>
              </div>
              <div 
                className="p-4"
                id={stage}
              >
                <SortableContext
                  items={candidates.filter(c => c.current_stage === stage).map(c => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {candidates
                    .filter(candidate => candidate.current_stage === stage)
                    .map((candidate) => (
                      <SortableItem
                        key={candidate.id}
                        candidate={candidate}
                        onViewDetails={setSelectedCandidate}
                      />
                    ))}
                </SortableContext>
              </div>
            </div>
          ))}
        </div>
      </DndContext>

      {showAddForm && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleAddCandidate}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                          Add New Candidate
                        </h3>
                        <button
                          onClick={() => setShowAddForm(false)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            First Name
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.first_name}
                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Last Name
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.last_name}
                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Email
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Position Applied
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.position_applied}
                          onChange={(e) => setFormData({ ...formData, position_applied: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Current Salary
                          </label>
                          <input
                            type="number"
                            value={formData.current_salary || ''}
                            onChange={(e) => setFormData({ ...formData, current_salary: e.target.value ? parseInt(e.target.value) : undefined })}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Enter amount"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Expected Salary
                          </label>
                          <input
                            type="number"
                            value={formData.expected_salary || ''}
                            onChange={(e) => setFormData({ ...formData, expected_salary: e.target.value ? parseInt(e.target.value) : undefined })}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Enter amount"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">
                          CV Upload (PDF only, max 5MB)
                        </label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                          <div className="space-y-1 text-center">
                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600">
                              <label
                                htmlFor="cv-upload"
                                className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                              >
                                <span>Upload a file</span>
                                <input
                                  id="cv-upload"
                                  name="cv-upload"
                                  type="file"
                                  accept=".pdf"
                                  className="sr-only"
                                  onChange={handleFileChange}
                                />
                              </label>
                              <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500">
                              PDF up to 5MB
                            </p>
                          </div>
                        </div>
                        {formData.cv_file && (
                          <p className="mt-2 text-sm text-gray-600">
                            Selected file: {formData.cv_file.name}
                          </p>
                        )}
                        {uploadProgress > 0 && uploadProgress < 100 && (
                          <div className="mt-2">
                            <div className="bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{ width: `${uploadProgress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                        {uploadError && (
                          <p className="mt-2 text-sm text-red-600">{uploadError}</p>
                        )}
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Source
                        </label>
                        <input
                          type="text"
                          value={formData.source}
                          onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="e.g., LinkedIn, Referral, Job Board"
                        />
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Notes
                        </label>
                        <textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          rows={3}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>

                      {error && (
                        <div className="mt-4 text-sm text-red-600">
                          {error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin mr-2" />
                        Adding...
                      </>
                    ) : (
                      'Add Candidate'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
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