import { supabase } from './supabase';

export const SUBSCRIPTION_LIMITS = {
  free: {
    assessments: 50,
    admins: 1,
    templates: 5,
    analytics: 'basic',
  },
  basic: {
    assessments: 200,
    admins: 3,
    templates: 20,
    analytics: 'advanced',
  },
  professional: {
    assessments: 1000,
    admins: 10,
    templates: 50,
    analytics: 'advanced',
  },
  enterprise: {
    assessments: -1, // unlimited
    admins: -1, // unlimited
    templates: -1, // unlimited
    analytics: 'advanced',
  },
};

export async function checkSubscriptionLimit(organizationId: string, limitType: keyof typeof SUBSCRIPTION_LIMITS['free']) {
  try {
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_tier, subscription_status')
      .eq('id', organizationId)
      .single();

    if (!org) return false;
    if (org.subscription_status !== 'active' && org.subscription_tier !== 'free') return false;

    const limit = SUBSCRIPTION_LIMITS[org.subscription_tier][limitType];
    if (limit === -1) return true;

    // Check current usage based on limit type
    switch (limitType) {
      case 'assessments': {
        const { count } = await supabase
          .from('code_assessments')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId);
        return (count || 0) < limit;
      }
      case 'admins': {
        const { count } = await supabase
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('role', 'admin');
        return (count || 0) < limit;
      }
      case 'templates': {
        const { count } = await supabase
          .from('assessment_templates')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId);
        return (count || 0) < limit;
      }
      default:
        return true;
    }
  } catch (error) {
    console.error('Error checking subscription limit:', error);
    return false;
  }
}

export async function getSubscriptionStatus(organizationId: string) {
  try {
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_tier, subscription_status')
      .eq('id', organizationId)
      .single();

    return org || { subscription_tier: 'free', subscription_status: 'active' };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return { subscription_tier: 'free', subscription_status: 'active' };
  }
}

export function useSubscription(organizationId: string | null) {
  const [status, setStatus] = React.useState<{
    tier: string;
    status: string;
  } | null>(null);

  React.useEffect(() => {
    if (!organizationId) return;

    const fetchStatus = async () => {
      const status = await getSubscriptionStatus(organizationId);
      setStatus(status);
    };

    fetchStatus();

    // Subscribe to changes
    const subscription = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'organizations',
          filter: `id=eq.${organizationId}`,
        },
        () => fetchStatus()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [organizationId]);

  return status;
}