import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useSubscription } from '../lib/subscription';
import { PaystackButton } from 'react-paystack';
import { supabase } from '../lib/supabase';

interface Props {
  organizationId: string;
}

interface PaystackConfig {
  reference: string;
  email: string;
  amount: number;
  publicKey: string;
}

export function SubscriptionBanner({ organizationId }: Props) {
  const subscription = useSubscription(organizationId);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    async function getUserEmail() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    }
    getUserEmail();
  }, []);

  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

  const config: PaystackConfig = {
    reference: (new Date()).getTime().toString(),
    email: userEmail,
    amount: 50000, // Amount is in the country's lowest currency. E.g Kobo, so 50000 kobo = N500
    publicKey,
  };

  const handlePaystackSuccessAction = () => {
    alert('Payment successful!');
  };

  const handlePaystackCloseAction = () => {
    console.log('closed')
    alert('Payment closed!');
  }

  const componentProps = {
    ...config,
    text: 'Update payment method',
    onSuccess: handlePaystackSuccessAction,
    onClose: handlePaystackCloseAction,
  };

  if (!subscription || subscription.status === 'active' || !userEmail) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            {subscription.status === 'past_due' ? (
              <>
                Your subscription payment is past due. Please update your payment information to continue using all features.
                <PaystackButton {...componentProps} disabled={!publicKey} className="font-medium underline hover:text-yellow-600" />
              </>
            ) : subscription.status === 'canceled' ? (
              <>
                Your subscription has been canceled. Some features may be limited.
                <a href="/settings/billing" className="font-medium underline hover:text-yellow-600">
                  Reactivate subscription
                </a>
              </>
            ) : (
              'There is an issue with your subscription. Please contact support.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
