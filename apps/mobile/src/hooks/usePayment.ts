import { useState, useCallback, useRef } from 'react';
import { paymentApi, orderApi } from '../services/api';

interface PaymentState {
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
}

export function usePayment() {
  const [state, setState] = useState<PaymentState>({
    isLoading: false,
    isSuccess: false,
    error: null,
  });
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => {
    setState({ isLoading: false, isSuccess: false, error: null });
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollPaymentStatus = useCallback((orderNo: string, maxAttempts = 30) => {
    let attempts = 0;

    pollingRef.current = setInterval(async () => {
      attempts++;
      try {
        const result: any = await paymentApi.status(orderNo);
        if (result.status !== 'WAIT_BUYER_PAY') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setState({ isLoading: false, isSuccess: true, error: null });
        } else if (attempts >= maxAttempts) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setState({ isLoading: false, isSuccess: false, error: '支付超时，请稍后查看订单状态' });
        }
      } catch {
        if (attempts >= maxAttempts) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setState({ isLoading: false, isSuccess: false, error: '查询支付状态失败' });
        }
      }
    }, 2000);
  }, []);

  const initiatePayment = useCallback(async (orderId: number, payMethod: string = 'alipay') => {
    setState({ isLoading: true, isSuccess: false, error: null });

    try {
      // Call the order pay endpoint
      const result: any = await orderApi.pay(orderId, payMethod);

      if (result.mockMode) {
        // In mock mode, payment is instant
        setState({ isLoading: false, isSuccess: true, error: null });
        return result;
      }

      // Real mode: would open Alipay SDK or browser
      // For now, poll status
      if (result.orderNo) {
        pollPaymentStatus(result.orderNo);
      }

      return result;
    } catch (err: any) {
      const message = err?.message || err?.message || '支付发起失败';
      setState({ isLoading: false, isSuccess: false, error: message });
      throw err;
    }
  }, [pollPaymentStatus]);

  return {
    ...state,
    initiatePayment,
    reset,
  };
}
