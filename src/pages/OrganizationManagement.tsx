import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, UserPlus, Settings, BarChart, Mail, Loader, Trash, Edit, Shield, AlertCircle } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: any;
  preferences: any;
}

interface OrganizationMember {
  id: string;
  user_id: string;
  role: string;
  user_type: string;
  user_profile: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface Invite {
  id: string;
  email: string;
  role: string;
  user_type: string;
  expires_at: string;
}

export function OrganizationManagement() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'member',
    user_type: 'org_member'
  });

  useEffect(() => {
    fetchOrganizationData();
  }, []);

  async function fetchOrganizationData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Get user's organization and role
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          organizations (*)
        `)
        .eq('user_id', user.id)
        .single();

      if (!orgMember) throw new Error('No organization found');

      setOrganization(orgMember.organizations);
      setUserRole(orgMember.role);

      // Get organization members
      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          role,
          user_type,
          user_profiles (
            first_name,
            last_name,
            email
          )
        `)
        .eq('organization_id', orgMember.organization_id);

      // Get pending invites
      const { data: pendingInvites } = await supabase
        .from('organization_invites')
        .select('*')
        .eq('organization_id', orgMember.organization_id)
        .gt('expires_at', new Date().toISOString());

      setMembers(orgMembers || []);
      setInvites(pendingInvites || []);
    } catch (error) {
      console.error('Error fetching organization data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendInvite() {
    try {
      if (!organization) return;
      
      const { error } = await supabase
        .from('organization_invites')
        .insert({
          organization_id: organization.id,
          email: inviteData.email,
          role: inviteData.role,
          user_type: inviteData.user_type
        });

      if (error) throw error;
      
      setShowInviteModal(false);
      fetchOrganizationData();
    } catch (error) {
      console.error('Error sending invite:', error);
      setError(error.message);
    }
  }

  async function updateMemberRole(memberId: string, newRole: string) {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
      
      setShowEditModal(false);
      setSelectedMember(null);
      fetchOrganizationData();
    } catch (error) {
      console.error('Error updating member role:', error);
      setError(error.message);
    }
  }

  async function removeMember(memberId: string) {
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      
      fetchOrganizationData();
    } catch (error) {
      console.error('Error removing member:', error);
      setError(error.message);
    }
  }

  const canManageMembers = userRole === 'owner' || userRole === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">No Organization Found</h3>
              <p className="mt-2 text-sm text-red-700">
                You are not currently a member of any organization.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* Organization Header */}
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            {organization.name}
          </h2>
          <div className="mt-1 flex items-center">
            <Shield className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm text-gray-500">Your Role: {userRole}</span>
          </div>
        </div>
        {canManageMembers && (
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => setShowInviteModal(true)}
              className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Members List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Organization Members
            </h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {members.map((member) => (
              <li key={member.id} className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.user_profile.first_name} {member.user_profile.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{member.user_profile.email}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      member.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                      member.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {member.role}
                    </span>
                    {canManageMembers && member.role !== 'owner' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setShowEditModal(true);
                          }}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeMember(member.id)}
                          className="text-red-400 hover:text-red-500"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Pending Invites */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Pending Invites
            </h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {invites.map((invite) => (
              <li key={invite.id} className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{invite.email}</p>
                    <p className="text-sm text-gray-500">
                      Role: {invite.role}
                    </p>
                    <p className="text-xs text-gray-400">
                      Expires: {new Date(invite.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  {canManageMembers && (
                    <button
                      onClick={async () => {
                        await supabase
                          .from('organization_invites')
                          .delete()
                          .eq('id', invite.id);
                        fetchOrganizationData();
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
            {invites.length === 0 && (
              <li className="px-4 py-4 text-sm text-gray-500">
                No pending invites
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Invite New Member
                    </h3>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={inviteData.email}
                        onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Role
                      </label>
                      <select
                        value={inviteData.role}
                        onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="member">Member</option>
                        {userRole === 'owner' && (
                          <option value="admin">Admin</option>
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={sendInvite}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Send Invite
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Edit Member Role
                    </h3>
                    <div className="mt-4">
                      <p className="text-sm text-gray-500">
                        {selectedMember.user_profile.email}
                      </p>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Role
                        </label>
                        <select
                          value={selectedMember.role}
                          onChange={(e) => setSelectedMember({
                            ...selectedMember,
                            role: e.target.value
                          })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                          <option value="member">Member</option>
                          {userRole === 'owner' && (
                            <option value="admin">Admin</option>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => updateMemberRole(selectedMember.id, selectedMember.role)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Update Role
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedMember(null);
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}