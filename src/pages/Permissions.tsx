import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Lock, Settings, AlertCircle, Check, X, Loader } from 'lucide-react';

interface PermissionType {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface RolePermissions {
  [role: string]: {
    [permissionId: string]: boolean;
  };
}

interface MemberPermissions {
  [memberId: string]: {
    [permissionId: string]: boolean;
  };
}

export function Permissions() {
  const [permissionTypes, setPermissionTypes] = useState<PermissionType[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>({});
  const [memberPermissions, setMemberPermissions] = useState<MemberPermissions>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    fetchPermissionsData();
  }, []);

  async function fetchPermissionsData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Get user's organization and role
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .single();

      if (!orgMember) throw new Error('No organization found');

      setOrganizationId(orgMember.organization_id);
      setUserRole(orgMember.role);

      // Fetch permission types
      const { data: types } = await supabase
        .from('permission_types')
        .select('*')
        .order('category', { ascending: true });

      if (types) setPermissionTypes(types);

      // Fetch default role permissions
      const { data: defaults } = await supabase
        .from('permission_defaults')
        .select('role, permission_type_id, is_granted')
        .eq('organization_id', orgMember.organization_id);

      if (defaults) {
        const rolePerms: RolePermissions = {};
        defaults.forEach(def => {
          if (!rolePerms[def.role]) rolePerms[def.role] = {};
          rolePerms[def.role][def.permission_type_id] = def.is_granted;
        });
        setRolePermissions(rolePerms);
      }

      // Fetch member-specific permissions
      const { data: memberPerms } = await supabase
        .from('organization_permissions')
        .select(`
          member_id,
          permission_type_id,
          is_granted
        `)
        .eq('organization_id', orgMember.organization_id);

      if (memberPerms) {
        const memPerms: MemberPermissions = {};
        memberPerms.forEach(perm => {
          if (!memPerms[perm.member_id]) memPerms[perm.member_id] = {};
          memPerms[perm.member_id][perm.permission_type_id] = perm.is_granted;
        });
        setMemberPermissions(memPerms);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setError('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }

  async function updateRolePermission(role: string, permissionId: string, granted: boolean) {
    if (!organizationId) return;

    try {
      setSaving(true);
      setError('');

      const { error } = await supabase
        .from('permission_defaults')
        .upsert({
          organization_id: organizationId,
          role,
          permission_type_id: permissionId,
          is_granted: granted
        });

      if (error) throw error;

      setRolePermissions(prev => ({
        ...prev,
        [role]: {
          ...prev[role],
          [permissionId]: granted
        }
      }));
    } catch (error) {
      console.error('Error updating role permission:', error);
      setError('Failed to update permission');
    } finally {
      setSaving(false);
    }
  }

  async function updateMemberPermission(memberId: string, permissionId: string, granted: boolean) {
    if (!organizationId) return;

    try {
      setSaving(true);
      setError('');

      const { error } = await supabase
        .from('organization_permissions')
        .upsert({
          organization_id: organizationId,
          member_id: memberId,
          permission_type_id: permissionId,
          is_granted: granted
        });

      if (error) throw error;

      setMemberPermissions(prev => ({
        ...prev,
        [memberId]: {
          ...prev[memberId],
          [permissionId]: granted
        }
      }));
    } catch (error) {
      console.error('Error updating member permission:', error);
      setError('Failed to update permission');
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

  if (!organizationId || (userRole !== 'owner' && userRole !== 'admin')) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Access Denied</h3>
              <p className="mt-2 text-sm text-red-700">
                You do not have permission to manage organization permissions.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const permissionsByCategory = permissionTypes.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, PermissionType[]>);

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Permissions Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure default role permissions and member-specific overrides
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-8 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Default Role Permissions */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Default Role Permissions
            </h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Set default permissions for each role
          </p>
        </div>

        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permission
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  {userRole === 'owner' && (
                    <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                  <React.Fragment key={category}>
                    <tr>
                      <td
                        colSpan={userRole === 'owner' ? 3 : 2}
                        className="px-6 py-3 bg-gray-50 text-sm font-medium text-gray-900"
                      >
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </td>
                    </tr>
                    {permissions.map((permission) => (
                      <tr key={permission.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="font-medium">{permission.name}</div>
                          <div className="text-gray-500">{permission.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => updateRolePermission(
                              'member',
                              permission.id,
                              !rolePermissions?.member?.[permission.id]
                            )}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                              rolePermissions?.member?.[permission.id]
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                            disabled={saving}
                          >
                            {rolePermissions?.member?.[permission.id] ? (
                              <Check className="h-4 w-4 mr-1" />
                            ) : (
                              <X className="h-4 w-4 mr-1" />
                            )}
                            {rolePermissions?.member?.[permission.id] ? 'Granted' : 'Not Granted'}
                          </button>
                        </td>
                        {userRole === 'owner' && (
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => updateRolePermission(
                                'admin',
                                permission.id,
                                !rolePermissions?.admin?.[permission.id]
                              )}
                              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                rolePermissions?.admin?.[permission.id]
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                              disabled={saving}
                            >
                              {rolePermissions?.admin?.[permission.id] ? (
                                <Check className="h-4 w-4 mr-1" />
                              ) : (
                                <X className="h-4 w-4 mr-1" />
                              )}
                              {rolePermissions?.admin?.[permission.id] ? 'Granted' : 'Not Granted'}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Member-Specific Overrides */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <div className="flex items-center">
            <Lock className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Member-Specific Permissions
            </h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Override default permissions for specific members
          </p>
        </div>

        <div className="px-4 py-5 sm:p-6">
          {/* Member permissions table will go here */}
          <p className="text-sm text-gray-500">
            Coming soon: Member-specific permission overrides
          </p>
        </div>
      </div>
    </div>
  );
}