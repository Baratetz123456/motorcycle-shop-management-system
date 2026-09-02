import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { usePosStore } from '@/lib/store/pos-store';
import { useState } from 'react';

export const useCheckoutSaga = () => {
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const clearCart = usePosStore((state) => state.clearCart);
  
  // 1. Initial Mutation (POST /checkout)
  const checkoutMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await apiClient.post('/sales/checkout', payload);
      return response.data; // Should return 202 Accepted with PENDING status
    },
    onSuccess: (data) => {
      setTransactionId(data.id); // Save ID to start polling
    }
  });

  // 2. Polling Query (GET /sales/transactions/{id})
  const pollingQuery = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: async () => {
      const response = await apiClient.get(`/sales/transactions/${transactionId}`);
      return response.data;
    },
    enabled: !!transactionId,
    refetchInterval: (query) => {
      // Poll every 1 second until status is not PENDING
      const status = query.state.data?.status;
      if (status === 'COMPLETED' || status === 'VOIDED') {
        return false;
      }
      return 1000;
    },
  });

  return {
    initiateCheckout: checkoutMutation.mutateAsync,
    isCheckingOut: checkoutMutation.isPending,
    checkoutError: checkoutMutation.error,
    sagaStatus: pollingQuery.data?.status || 'IDLE',
    transactionData: pollingQuery.data,
    isSagaComplete: pollingQuery.data?.status === 'COMPLETED',
    isSagaFailed: pollingQuery.data?.status === 'VOIDED',
    resetSaga: () => setTransactionId(null)
  };
};
