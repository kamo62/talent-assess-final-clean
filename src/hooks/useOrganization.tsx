import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Organization {
  id: string;
  name: string;
  created_at: string;
  owner_id: string;
  settings?: Record<string, any>;
}

export function useOrganization() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrganization() {
      try {
        // First get the current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }
        
        // Get the organization memberships for this user
        const { data: memberships, error: membershipError } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (membershipError) throw membershipError;
        
        if (memberships && memberships.length > 0) {
          // Get the organization details
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', memberships[0].organization_id)
            .single();
          
          if (orgError) throw orgError;
          
          setOrganization(org);
        }
      } catch (err) {
        console.error('Error fetching organization:', err);
        setError(err instanceof Error ? err.message : 'Failed to load organization');
      } finally {
        setLoading(false);
      }
    }
    
    fetchOrganization();
  }, []);

  return { organization, loading, error };
}
