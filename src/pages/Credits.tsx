import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Package, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { PaystackButton } from 'react-paystack';
import { supabase } from '../lib/supabase';
import { 
  getCreditPackages, 
  getCreditBalance, 
  getCreditTransactions, 
  checkTrialStatus,
  startFreeTrial,
  addCredits,
  formatPrice,
  type CreditPackage,
  type CreditTransaction 
} from '../lib/credits';

export default function Credits() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [balance, setBalance] = useState({ credits_balance: 0, credits_used: 0 });
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [trialStatus, setTrialStatus] = useState<any>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);

  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
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
      const [packagesData, balanceData, transactionsData, trialData] = await Promise.all([
        getCreditPackages(),
        getCreditBalance(member.organization_id),
        getCreditTransactions(member.organization_id),
        checkTrialStatus(member.organization_id)
      ]);

      setPackages(packagesData);
      setBalance(balanceData);
      setTransactions(transactionsData);
      setTrialStatus(trialData);
    } catch (error) {
      console.error('Error loading credits data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartTrial() {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      await startFreeTrial(organizationId);
      await loadData();
      alert('Free trial started! You have received 50 free credits.');
    } catch (error) {
      console.error('Error starting trial:', error);
      alert('Failed to start free trial. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handlePaystackSuccess(reference: any) {
    if (!organizationId || !selectedPackage) return;

    // Add credits to the organization
    addCredits(
      organizationId,
      selectedPackage.credits,
      'purchase',
      `Purchased ${selectedPackage.name}`,
      reference.reference
    ).then(() => {
      alert(`Payment successful! ${selectedPackage.credits} credits have been added to your account.`);
      loadData();
      setSelectedPackage(null);
    }).catch(error => {
      console.error('Error adding credits:', error);
      alert('Payment was successful but credits could not be added. Please contact support.');
    });
  }

  function handlePaystackClose() {
    console.log('Payment dialog closed');
    setSelectedPackage(null);
  }

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
        <h1 className="text-3xl font-bold text-gray-900">Credits Management</h1>
        <p className="mt-2 text-gray-600">Manage your assessment credits and purchase more when needed</p>
      </div>

      {/* Trial Banner */}
      {trialStatus && !trialStatus.trialUsed && (
        <div className="mb-8 bg-indigo-50 border border-indigo-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertCircle className="h-6 w-6 text-indigo-600 mt-1" />
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-medium text-indigo-900">Start Your Free Trial</h3>
              <p className="mt-1 text-indigo-700">
                Get 14 days of free access and 50 credits to test our platform!
              </p>
              <button
                onClick={handleStartTrial}
                className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trial Status */}
      {trialStatus && trialStatus.isOnTrial && (
        <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <Clock className="h-6 w-6 text-yellow-600 mt-1" />
            <div className="ml-3">
              <h3 className="text-lg font-medium text-yellow-900">Free Trial Active</h3>
              <p className="mt-1 text-yellow-700">
                {trialStatus.trialDaysRemaining} days remaining in your trial
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Balance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CreditCard className="h-10 w-10 text-indigo-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Available Credits</p>
              <p className="text-2xl font-bold text-gray-900">{balance.credits_balance}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <TrendingUp className="h-10 w-10 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Credits Used</p>
              <p className="text-2xl font-bold text-gray-900">{balance.credits_used}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Package className="h-10 w-10 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Purchased</p>
              <p className="text-2xl font-bold text-gray-900">{balance.credits_balance + balance.credits_used}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Packages */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Purchase Credits</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {packages.map((pkg) => (
            <div key={pkg.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
              <p className="text-gray-600 mt-2">{pkg.description}</p>
              <div className="mt-4">
                <p className="text-3xl font-bold text-indigo-600">{pkg.credits}</p>
                <p className="text-sm text-gray-500">credits</p>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900">{formatPrice(pkg.price_kobo)}</p>
              </div>
              {selectedPackage?.id === pkg.id ? (
                <PaystackButton
                  className="mt-6 w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                  reference={new Date().getTime().toString()}
                  email={userEmail}
                  amount={pkg.price_kobo}
                  publicKey={publicKey}
                  text="Complete Purchase"
                  onSuccess={handlePaystackSuccess}
                  onClose={handlePaystackClose}
                />
              ) : (
                <button
                  onClick={() => setSelectedPackage(pkg)}
                  disabled={!publicKey || !userEmail}
                  className="mt-6 w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Buy Now
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Transaction History</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {transactions.length === 0 ? (
              <li className="px-6 py-4 text-center text-gray-500">
                No transactions yet
              </li>
            ) : (
              transactions.map((transaction) => (
                <li key={transaction.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">{transaction.type}</p>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
