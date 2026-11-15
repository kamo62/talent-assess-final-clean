import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface Assessment {
  id: string;
  title: string;
  type: string;
  due_date: string;
  status: string;
}

export function CandidatePortal() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssessments();
  }, []);

  async function fetchAssessments() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('assessment_assignments')
        .select(`
          id,
          assessment_id,
          status,
          due_date,
          code_assessments (
            id,
            title,
            type: 'code'
          ),
          case_studies (
            id,
            title,
            type: 'case_study'
          )
        `)
        .eq('user_email', user.email);

      if (error) throw error;

      const formattedAssessments = data
        .map(assignment => ({
          id: assignment.assessment_id,
          title: assignment.code_assessments?.title || assignment.case_studies?.title,
          type: assignment.code_assessments ? 'code' : 'case_study',
          due_date: assignment.due_date,
          status: assignment.status,
        }))
        .filter(a => a.title); // Remove any null entries

      setAssessments(formattedAssessments);
    } catch (error) {
      console.error('Error fetching assessments:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Assessments</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {assessments.map((assessment) => (
          <div
            key={assessment.id}
            className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200"
          >
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {assessment.title}
                </h3>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    assessment.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : assessment.status === 'expired'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {assessment.status}
                </span>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 mr-2" />
                  {assessment.due_date
                    ? format(new Date(assessment.due_date), 'MMM d, yyyy')
                    : 'No due date'}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-2" />
                  {assessment.type === 'code' ? 'Coding Assessment' : 'Case Study'}
                </div>
              </div>
            </div>
            <div className="px-4 py-4 sm:px-6">
              <Link
                to={`/assessment/${assessment.id}`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                {assessment.status === 'completed' ? 'View Results' : 'Start Assessment'}
              </Link>
            </div>
          </div>
        ))}

        {assessments.length === 0 && !loading && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 bg-white rounded-lg">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No assessments found</h3>
            <p className="text-gray-500">You don't have any assessments assigned yet.</p>
          </div>
        )}
      </div>

      {/* Progress Overview */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Progress Overview</h2>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center">
              <div className="rounded-full bg-blue-100 p-3">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-500">Upcoming</h4>
                <p className="text-2xl font-semibold text-gray-900">
                  {assessments.filter(a => a.status === 'assigned').length}
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-500">Completed</h4>
                <p className="text-2xl font-semibold text-gray-900">
                  {assessments.filter(a => a.status === 'completed').length}
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <div className="rounded-full bg-yellow-100 p-3">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-500">In Progress</h4>
                <p className="text-2xl font-semibold text-gray-900">
                  {assessments.filter(a => a.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}