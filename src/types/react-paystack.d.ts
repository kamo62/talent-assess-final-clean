declare module 'react-paystack' {
  export interface PaystackProps {
    reference: string;
    email: string;
    amount: number;
    publicKey: string;
    text?: string;
    onSuccess?: (reference: any) => void;
    onClose?: () => void;
    className?: string;
    currency?: string;
    channels?: string[];
    metadata?: any;
  }

  export const PaystackButton: React.FC<PaystackProps>;
  export const usePaystackPayment: (config: PaystackProps) => () => void;
} 