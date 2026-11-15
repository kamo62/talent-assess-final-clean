import { supabase } from './supabase';

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_kobo: number;
  description: string;
  is_active: boolean;
}

export interface CreditTransaction {
  id: string;
  organization_id: string;
  amount: number;
  type: 'purchase' | 'usage' | 'bonus' | 'refund';
  description: string;
  reference?: string;
  created_at: string;
}

export async function getCreditPackages() {
  const { data, error } = await supabase
    .from('credit_packages')
    .select('*')
    .eq('is_active', true)
    .order('credits', { ascending: true });

  if (error) throw error;
  return data as CreditPackage[];
}

export async function getCreditBalance(organizationId: string) {
  const { data, error } = await supabase
    .from('organizations')
    .select('credits_balance, credits_used')
    .eq('id', organizationId)
    .single();

  if (error) throw error;
  return data;
}

export async function getCreditTransactions(organizationId: string) {
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as CreditTransaction[];
}

export async function useCredits(organizationId: string, amount: number, description: string) {
  const { data, error } = await supabase
    .rpc('use_credits', {
      org_id: organizationId,
      amount,
      description
    });

  if (error) throw error;
  return data;
}

export async function addCredits(
  organizationId: string, 
  amount: number, 
  type: 'purchase' | 'bonus' | 'refund',
  description: string,
  reference?: string
) {
  const { error } = await supabase
    .rpc('add_credits', {
      org_id: organizationId,
      amount,
      transaction_type: type,
      description,
      reference
    });

  if (error) throw error;
}

export async function startFreeTrial(organizationId: string) {
  const { error } = await supabase
    .rpc('start_free_trial', {
      org_id: organizationId
    });

  if (error) throw error;
}

export async function checkTrialStatus(organizationId: string) {
  const { data, error } = await supabase
    .from('organizations')
    .select('trial_ends_at, trial_used, subscription_status')
    .eq('id', organizationId)
    .single();

  if (error) throw error;
  
  const now = new Date();
  const trialEndsAt = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
  
  return {
    isOnTrial: data.subscription_status === 'trialing',
    trialUsed: data.trial_used,
    trialEndsAt,
    trialDaysRemaining: trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0,
    trialExpired: trialEndsAt ? now > trialEndsAt : false
  };
}

// Format price from kobo to Rands
export function formatPrice(kobo: number): string {
  return `R${(kobo / 100).toFixed(2)}`;
}
