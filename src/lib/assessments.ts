import { supabase } from './supabase';

export interface AssessmentBalance {
  prepaid_balance: number; // Assessments purchased/added to account
  monthly_limit: number | null; // Monthly allocation from subscription
  monthly_used: number; // Used from monthly allocation this month
  available: number; // Total available (prepaid + remaining monthly)
  overage_rate: number | null; // Cost per assessment over limit
}

export interface AssessmentPackage {
  id: string;
  name: string;
  assessments: number;
  price: number;
  description: string | null;
  price_per_assessment: number;
}

export interface AssessmentTransaction {
  id: string;
  organization_id: string;
  amount: number;
  balance_after: number;
  type: 'purchase' | 'monthly_allocation' | 'usage' | 'overage' | 'refund' | 'trial';
  description: string | null;
  metadata: any;
  created_at: string;
}

// Get assessment balance for an organization
export async function getAssessmentBalance(organizationId: string): Promise<AssessmentBalance | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select(`
      assessments_balance,
      monthly_assessment_limit,
      assessments_used_this_month,
      subscription:subscriptions(
        plan:subscription_plans(
          features
        )
      )
    `)
    .eq('id', organizationId)
    .single();

  if (error || !data) {
    console.error('Error fetching assessment balance:', error);
    return null;
  }

  const monthlyLimit = data.monthly_assessment_limit || 
    (data.subscription?.[0]?.plan?.[0]?.features?.monthly_assessments) || 
    null;
  
  const overageRate = data.subscription?.[0]?.plan?.[0]?.features?.overage_rate || null;
  
  const remainingMonthly = monthlyLimit 
    ? Math.max(0, monthlyLimit - (data.assessments_used_this_month || 0))
    : 0;

  return {
    prepaid_balance: data.assessments_balance || 0,
    monthly_limit: monthlyLimit,
    monthly_used: data.assessments_used_this_month || 0,
    available: (data.assessments_balance || 0) + remainingMonthly,
    overage_rate: overageRate
  };
}

// Check if organization has enough assessments
export async function checkAssessmentBalance(
  organizationId: string, 
  requiredAssessments: number = 1
): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('check_assessment_balance', {
      org_id: organizationId,
      required_assessments: requiredAssessments
    });

  if (error) {
    console.error('Error checking assessment balance:', error);
    return false;
  }

  return data || false;
}

// Deduct assessments from balance
export async function deductAssessments(
  organizationId: string,
  assessments: number,
  description: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase
    .rpc('deduct_assessments', {
      org_id: organizationId,
      assessments_to_deduct: assessments,
      description
    });

  if (error) {
    console.error('Error deducting assessments:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Add assessments to balance
export async function addAssessments(
  organizationId: string,
  assessments: number,
  type: 'purchase' | 'trial' | 'refund',
  description: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current balance
    const { data: org, error: fetchError } = await supabase
      .from('organizations')
      .select('assessments_balance')
      .eq('id', organizationId)
      .single();

    if (fetchError || !org) {
      return { success: false, error: 'Failed to fetch organization' };
    }

    const newBalance = (org.assessments_balance || 0) + assessments;

    // Update balance
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ assessments_balance: newBalance })
      .eq('id', organizationId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Record transaction
    const { error: transactionError } = await supabase
      .from('assessment_transactions')
      .insert({
        organization_id: organizationId,
        amount: assessments,
        balance_after: newBalance,
        type,
        description
      });

    if (transactionError) {
      console.error('Error recording transaction:', transactionError);
      // Don't fail the operation if just the transaction log fails
    }

    return { success: true };
  } catch (error) {
    console.error('Error adding assessments:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Get assessment packages
export async function getAssessmentPackages(): Promise<AssessmentPackage[]> {
  const { data, error } = await supabase
    .from('assessment_packages')
    .select('*')
    .order('assessments', { ascending: true });

  if (error) {
    console.error('Error fetching assessment packages:', error);
    return [];
  }

  return (data || []).map(pkg => ({
    ...pkg,
    price_per_assessment: pkg.price / pkg.assessments
  }));
}

// Get assessment transaction history
export async function getAssessmentTransactions(
  organizationId: string,
  limit: number = 50
): Promise<AssessmentTransaction[]> {
  const { data, error } = await supabase
    .from('assessment_transactions')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching assessment transactions:', error);
    return [];
  }

  return data || [];
}

// Start free trial with assessments
export async function startFreeTrial(organizationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if already on trial
    const { data: org, error: fetchError } = await supabase
      .from('organizations')
      .select('free_trial_started_at')
      .eq('id', organizationId)
      .single();

    if (fetchError || !org) {
      return { success: false, error: 'Failed to fetch organization' };
    }

    if (org.free_trial_started_at) {
      return { success: false, error: 'Free trial already activated' };
    }

    // Start trial and add assessments
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        free_trial_started_at: new Date().toISOString(),
        assessments_balance: 25 // 25 free assessments for trial
      })
      .eq('id', organizationId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Record transaction
    await supabase
      .from('assessment_transactions')
      .insert({
        organization_id: organizationId,
        amount: 25,
        balance_after: 25,
        type: 'trial',
        description: '14-day free trial - 25 assessments'
      });

    return { success: true };
  } catch (error) {
    console.error('Error starting free trial:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Check if free trial is active
export async function checkFreeTrial(organizationId: string): Promise<{
  isActive: boolean;
  daysRemaining: number;
  startedAt: string | null;
}> {
  const { data, error } = await supabase
    .from('organizations')
    .select('free_trial_started_at')
    .eq('id', organizationId)
    .single();

  if (error || !data || !data.free_trial_started_at) {
    return { isActive: false, daysRemaining: 0, startedAt: null };
  }

  const trialStart = new Date(data.free_trial_started_at);
  const now = new Date();
  const daysSinceStart = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, 14 - daysSinceStart);

  return {
    isActive: daysRemaining > 0,
    daysRemaining,
    startedAt: data.free_trial_started_at
  };
}

// Purchase assessment package
export async function purchaseAssessmentPackage(
  organizationId: string,
  packageId: string,
  paymentReference: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get package details
    const { data: pkg, error: pkgError } = await supabase
      .from('assessment_packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (pkgError || !pkg) {
      return { success: false, error: 'Invalid package' };
    }

    // Add assessments
    const result = await addAssessments(
      organizationId,
      pkg.assessments,
      'purchase',
      `Purchased ${pkg.name} - ${pkg.assessments} assessments`
    );

    if (result.success) {
      // Record payment metadata
      await supabase
        .from('assessment_transactions')
        .update({
          metadata: {
            package_id: packageId,
            package_name: pkg.name,
            payment_reference: paymentReference,
            price: pkg.price
          }
        })
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1);
    }

    return result;
  } catch (error) {
    console.error('Error purchasing assessment package:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Calculate overage cost
export async function calculateOverageCost(
  organizationId: string,
  additionalAssessments: number
): Promise<number | null> {
  const balance = await getAssessmentBalance(organizationId);
  
  if (!balance || !balance.overage_rate) {
    return null;
  }

  // Only charge overage if they'll exceed their limits
  const totalNeeded = additionalAssessments;
  const totalAvailable = balance.available;
  
  if (totalAvailable >= totalNeeded) {
    return 0; // No overage needed
  }

  const overageNeeded = totalNeeded - totalAvailable;
  return overageNeeded * balance.overage_rate;
}
