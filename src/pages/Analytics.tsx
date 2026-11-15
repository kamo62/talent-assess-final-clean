import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Clock, Users, CheckCircle, Download, Filter, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface AnalyticsData {
  total_assessments: number;
  total_users: number;
  completion_rate: number;
  avg_completion_time: string;
  assessment_stats: {
    id: string;
    title: string;
    total_attempts: number;
    success_rate: number;
    avg_completion_time: string;
  }[];
  department_stats: {
    department: string;
    avg_score: number;
    total_candidates: number;
  }[];
  time_distribution: {
    range: string;
    count: number;
  }[];
}

export function Analytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30');
  const [reportType, setReportType] = useState('overview');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, reportType]);

  async function fetchAnalytics() {
    try {
      setError(null);
      
      // Get total assessments (both code and case studies)
      const [{ count: codeCount }, { count: caseCount }] = await Promise.all([
        supabase
          .from('code_assessments')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('case_studies')
          .select('*', { count: 'exact', head: true })
      ]);

      const totalAssessments = (codeCount || 0) + (caseCount || 0);

      // Get total users with assignments
      const { count: totalUsers } = await supabase
        .from('assessment_assignments')
        .select('user_email', { count: 'exact', head: true })
        .gt('created_at', new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000).toISOString());

      // Get assessment progress data
      const { data: progressData, error: progressError } = await supabase
        .from('assessment_progress')
        .select('*')
        .gt('created_at', new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000).toISOString());

      if (progressError) throw progressError;

      // Get department stats from user profiles
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('department')
        .not('department', 'is', null);

      if (profileError) throw profileError;

      // Process department stats
      const departmentStats = profileData.reduce((acc, curr) => {
        const dept = curr.department || 'Unassigned';
        if (!acc[dept]) {
          acc[dept] = { total: 0, completed: 0 };
        }
        acc[dept].total++;
        return acc;
      }, {} as Record<string, { total: number; completed: number }>);

      // Calculate completion rate from progress data
      const completionRate = progressData 
        ? progressData.filter(p => p.status === 'completed').length / progressData.length
        : 0;

      // Calculate average completion time
      const avgTime = progressData && progressData.length > 0
        ? progressData.reduce((acc, curr) => acc + parseInterval(curr.time_spent || '0'), 0) / progressData.length
        : 0;

      // Create time distribution data
      const timeRanges = ['0-30 min', '30-60 min', '60-90 min', '90+ min'];
      const timeDistribution = progressData 
        ? timeRanges.map(range => {
            const [min, max] = range.split('-').map(t => parseInt(t));
            const count = progressData.filter(p => {
              const minutes = parseInterval(p.time_spent || '0');
              return max ? (minutes >= min && minutes < max) : minutes >= min;
            }).length;
            return { range, count };
          })
        : timeRanges.map(range => ({ range, count: 0 }));

      const analyticsResult: AnalyticsData = {
        total_assessments: totalAssessments,
        total_users: totalUsers || 0,
        completion_rate: completionRate,
        avg_completion_time: formatInterval(avgTime),
        assessment_stats: progressData ? progressData.map(stat => ({
          id: stat.assessment_id,
          title: stat.assessment_type,
          total_attempts: 1,
          success_rate: stat.status === 'completed' ? 1 : 0,
          avg_completion_time: formatInterval(parseInterval(stat.time_spent || '0'))
        })) : [],
        department_stats: Object.entries(departmentStats).map(([department, stats]) => ({
          department,
          avg_score: (stats.completed / stats.total) * 100,
          total_candidates: stats.total
        })),
        time_distribution: timeDistribution
      };

      setAnalytics(analyticsResult);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  function parseInterval(interval: string): number {
    if (!interval) return 0;
    const matches = interval.match(/(\d+):(\d+):(\d+)/);
    if (!matches) return 0;
    const [, hours, minutes, seconds] = matches;
    return parseInt(hours) * 60 + parseInt(minutes) + parseInt(seconds) / 60;
  }

  function formatInterval(minutes: number): string {
    return `${Math.round(minutes)} minutes`;
  }

  async function downloadReport() {
    try {
      // Generate CSV data
      const csvData = [
        ['Metric', 'Value'],
        ['Total Assessments', analytics?.total_assessments],
        ['Total Users', analytics?.total_users],
        ['Completion Rate', `${(analytics?.completion_rate || 0) * 100}%`],
        ['Average Completion Time', analytics?.avg_completion_time],
        [''],
        ['Department Performance'],
        ['Department', 'Average Score', 'Total Candidates'],
        ...analytics?.department_stats.map(stat => [
          stat.department,
          `${stat.avg_score.toFixed(1)}%`,
          stat.total_candidates
        ]) || []
      ];

      // Convert to CSV string
      const csv = csvData.map(row => row.join(',')).join('\n');

      // Create and download file
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading report:', err);
      setError('Failed to download report');
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
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
              <button
                onClick={fetchAnalytics}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          <button
            onClick={downloadReport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <BarChart className="h-8 w-8 text-indigo-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Assessments</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.total_assessments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.total_users}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completion Rate</p>
              <p className="text-2xl font-semibold text-gray-900">
                {(analytics.completion_rate * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg. Completion Time</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.avg_completion_time}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Department Performance */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Department Performance</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {analytics.department_stats.map((stat) => (
              <div key={stat.department} className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">{stat.department}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Average Score</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {stat.avg_score.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Candidates</p>
                    <p className="text-xl font-semibold text-gray-900">{stat.total_candidates}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Time Distribution */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Completion Time Distribution</h2>
        </div>
        <div className="p-6">
          <div className="h-64">
            <div className="flex items-end justify-between h-full">
              {analytics.time_distribution.map((dist) => (
                <div
                  key={dist.range}
                  className="flex flex-col items-center"
                  style={{
                    height: `${(dist.count / Math.max(...analytics.time_distribution.map(d => d.count))) * 100}%`
                  }}
                >
                  <div
                    className="w-16 bg-indigo-200 rounded-t-lg"
                    style={{
                      height: `${(dist.count / Math.max(...analytics.time_distribution.map(d => d.count))) * 100}%`
                    }}
                  ></div>
                  <p className="mt-2 text-sm text-gray-500">{dist.range}</p>
                  <p className="text-sm font-medium text-gray-900">{dist.count}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}