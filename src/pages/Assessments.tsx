import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  getAssessmentBalance, 
  getAssessmentPackages, 
  getAssessmentTransactions,
  startFreeTrial,
  checkFreeTrial,
  purchaseAssessmentPackage,
  AssessmentBalance,
  AssessmentPackage,
  AssessmentTransaction
} from '../lib/assessments';
import { PaystackButton } from 'react-paystack';
import { 
  CreditCard, 
  Package, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Gift,
  ShoppingCart
} from 'lucide-react';

export default function Assessments() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<AssessmentBalance | null>(null);
  const [packages, setPackages] = useState<AssessmentPackage[]>([]);
  const [transactions, setTransactions] = useState<AssessmentTransaction[]>([]);
  const [trialStatus, setTrialStatus] = useState<{
    isActive: boolean;
    daysRemaining: number;
    startedAt: string | null;
  }>({ isActive: false, daysRemaining: 0, startedAt: null });
  const [loading, setLoading] = useState(true);
  const [activatingTrial, setActivatingTrial] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

  useEffect(() => {
    loadAssessmentData();
  }, []);

  const loadAssessmentData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUserEmail(user.email || '');

      // Get user's organization
      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!member) {
        navigate('/');
        return;
      }

      setOrganizationId(member.organization_id);

      // Load all data
      const [balanceData, packagesData, transactionsData, trialData] = await Promise.all([
        getAssessmentBalance(member.organization_id),
        getAssessmentPackages(),
        getAssessmentTransactions(member.organization_id),
        checkFreeTrial(member.organization_id)
      ]);

      setBalance(balanceData);
      setPackages(packagesData);
      setTransactions(transactionsData);
      setTrialStatus(trialData);
    } catch (error) {
      console.error('Error loading assessment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrial = async () => {
    if (!organizationId) return;

    setActivatingTrial(true);
    try {
      const result = await startFreeTrial(organizationId);
      if (result.success) {
        await loadAssessmentData();
      } else {
        alert(result.error || 'Failed to start free trial');
      }
    } catch (error) {
      console.error('Error starting trial:', error);
      alert('An error occurred while starting the trial');
    } finally {
      setActivatingTrial(false);
    }
  };

  const handlePaymentSuccess = async (reference: any, packageId: string) => {
    if (!organizationId) return;

    try {
      const result = await purchaseAssessmentPackage(
        organizationId,
        packageId,
        reference.reference
      );

      if (result.success) {
        await loadAssessmentData();
        alert('Assessments added successfully!');
      } else {
        alert(result.error || 'Failed to add assessments');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('An error occurred while processing your payment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Assessments</h1>
        <p className="mt-2 text-gray-600">
          Manage your assessment balance and purchase additional assessments
        </p>
      </div>

      {/* Free Trial Banner */}
      {!trialStatus.isActive && !trialStatus.startedAt && (
        <div className="mb-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Gift className="h-12 w-12" />
              <div>
                <h3 className="text-xl font-semibold">Start Your Free Trial</h3>
                <p className="mt-1">Get 25 free assessments for 14 days - no credit card required!</p>
              </div>
            </div>
            <button
              onClick={handleStartTrial}
              disabled={activatingTrial}
              className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition disabled:opacity-50"
            >
              {activatingTrial ? 'Activating...' : 'Start Free Trial'}
            </button>
          </div>
        </div>
      )}

      {/* Trial Status */}
      {trialStatus.isActive && (
        <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-800">
              Free trial active - {trialStatus.daysRemaining} days remaining
            </p>
          </div>
        </div>
      )}

      {/* Assessment Balance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Prepaid Balance</h3>
            <Package className="h-8 w-8 text-indigo-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {balance?.prepaid_balance || 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">assessments</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Monthly Allocation</h3>
            <Clock className="h-8 w-8 text-indigo-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {balance?.monthly_limit ? 
              `${balance.monthly_limit - balance.monthly_used} / ${balance.monthly_limit}` : 
              'N/A'
            }
          </p>
          <p className="text-sm text-gray-500 mt-1">remaining this month</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Total Available</h3>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">
            {balance?.available || 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">assessments ready to use</p>
        </div>
      </div>

      {/* Purchase Assessments */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Purchase Assessments</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {packages.map((pkg) => (
            <div key={pkg.id} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">{pkg.name}</h3>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                R{pkg.price.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {pkg.assessments} assessments
                <br />
                R{pkg.price_per_assessment.toFixed(2)} each
              </p>
              {pkg.description && (
                <p className="text-sm text-gray-600 mb-4">{pkg.description}</p>
              )}
              <PaystackButton
                text="Purchase"
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                onSuccess={(reference: any) => handlePaymentSuccess(reference, pkg.id)}
                onClose={() => console.log('Payment closed')}
                disabled={!publicKey}
                reference={`assess_${pkg.id}_${Date.now()}`}
                email={userEmail}
                amount={pkg.price * 100} // Paystack expects amount in cents
                publicKey={publicKey}
              />
            </div>
          ))}
        </div>
        {!publicKey && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <p className="text-yellow-800">
                Payment system not configured. Please contact support.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Transaction History</h2>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No transactions yet
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.type === 'purchase' || transaction.type === 'trial' ? 'bg-green-100 text-green-800' :
                        transaction.type === 'usage' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.balance_after}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
