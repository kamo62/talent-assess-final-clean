import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Camera, Save, Loader, Building2 } from 'lucide-react';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  phone: string;
  job_title: string;
  department: string;
  bio: string;
  skills: string[];
}

interface Organization {
  id: string;
  name: string;
  settings: any;
}

export function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [organizationInvites, setOrganizationInvites] = useState<Array<{
    id: string;
    organization: { name: string; id: string };
    status: string;
  }>>([]);

  useEffect(() => {
    fetchProfile();
    fetchOrganizationData();
  }, []);

  async function fetchOrganizationData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is already in an organization
      const { data: memberData } = await supabase
        .from('organization_members')
        .select(`
          organization:organizations (
            id,
            name,
            settings
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (memberData?.organization) {
        setOrganization(memberData.organization);
      }

      // Check for pending invites
      const { data: invites } = await supabase
        .from('organization_invites')
        .select(`
          id,
          organization:organizations (
            id,
            name
          ),
          status
        `)
        .eq('email', user.email)
        .eq('status', 'pending');

      setOrganizationInvites(invites || []);
    } catch (error) {
      console.error('Error fetching organization data:', error);
    }
  }

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // First try to get existing profile
      let { data: existingProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (!existingProfile) {
        // Create new profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert([{ 
            id: user.id,
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            phone: user.user_metadata?.phone || '',
            job_title: user.user_metadata?.job_title || '',
          }])
          .select()
          .single();

        if (createError) throw createError;
        existingProfile = newProfile;
      }

      setProfile(existingProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function acceptInvite(inviteId: string) {
    try {
      const { error } = await supabase
        .from('organization_invites')
        .update({ status: 'accepted' })
        .eq('id', inviteId);

      if (error) throw error;

      // Refresh organization data
      await fetchOrganizationData();
    } catch (error) {
      console.error('Error accepting invite:', error);
      setError('Failed to accept invitation');
    }
  }

  async function updateProfile(updates: Partial<UserProfile>) {
    if (!profile?.id) return;

    try {
      setSaving(true);
      setError('');

      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) throw error;

      // Update user metadata in auth
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          first_name: updates.first_name,
          last_name: updates.last_name,
          phone: updates.phone,
          job_title: updates.job_title
        }
      });

      if (authError) throw authError;

      setProfile(prev => ({ ...prev!, ...updates }));
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* Organization Section */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Organization</h3>
              <p className="mt-1 text-sm text-gray-500">
                Your organization membership details.
              </p>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2">
              {organization ? (
                <div className="flex items-center space-x-4">
                  <Building2 className="h-8 w-8 text-gray-400" />
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{organization.name}</h4>
                    <p className="text-sm text-gray-500">Active Member</p>
                  </div>
                </div>
              ) : organizationInvites.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-700">You have pending organization invitations:</p>
                  {organizationInvites.map(invite => (
                    <div key={invite.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-md">
                      <div>
                        <p className="font-medium text-gray-900">{invite.organization.name}</p>
                        <p className="text-sm text-gray-500">Pending Invitation</p>
                      </div>
                      <button
                        onClick={() => acceptInvite(invite.id)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
                      >
                        Accept Invitation
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-700">
                  You are not currently a member of any organization. You will need an invitation to join one.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Profile</h3>
              <p className="mt-1 text-sm text-gray-500">
                Update your personal information and preferences.
              </p>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2">
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!profile) return;
                
                const updates: Partial<UserProfile> = {
                  first_name: profile.first_name,
                  last_name: profile.last_name,
                  phone: profile.phone,
                  job_title: profile.job_title,
                  department: profile.department,
                  bio: profile.bio,
                  skills: profile.skills
                };
                
                updateProfile(updates);
              }}>
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={profile?.first_name || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev!, first_name: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={profile?.last_name || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev!, last_name: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profile?.phone || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev!, phone: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={profile?.job_title || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev!, job_title: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Department
                    </label>
                    <input
                      type="text"
                      value={profile?.department || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev!, department: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div className="col-span-6">
                    <label className="block text-sm font-medium text-gray-700">
                      Bio
                    </label>
                    <textarea
                      rows={4}
                      value={profile?.bio || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev!, bio: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div className="col-span-6">
                    <label className="block text-sm font-medium text-gray-700">
                      Skills
                    </label>
                    <input
                      type="text"
                      value={profile?.skills?.join(', ') || ''}
                      onChange={(e) => setProfile(prev => ({ 
                        ...prev!, 
                        skills: e.target.value.split(',').map(s => s.trim()) 
                      }))}
                      placeholder="Enter skills separated by commas"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving || !profile}
                    className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}