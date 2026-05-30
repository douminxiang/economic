import { useState, useCallback, useRef } from 'react';
import { paymentApi, orderApi } from '../services/api';

interface PaymentState {
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
}

export interface PaymentPrepareResult {
  orderNo: string;
  alipayOutTradeNo?: string;
  payUrl?: string;
  payFormHtml?: string;
  sandboxReady?: boolean;
  mockMode?: boolean;
}

function unwrap<T>(result: any): T {
  return (result?.data ?? result) as T;
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

  const pollPaymentStatus = useCallback(
    (orderNo: string, alipayOutTradeNo?: string, maxAttempts = 30): Promise<void> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      pollingRef.current = setInterval(async () => {
        attempts++;
        try {
          const result = unwrap<{ status: string; paid?: boolean }>(
            await paymentApi.sync(orderNo, alipayOutTradeNo),
          );

          if (result.paid || result.status === 'TRADE_SUCCESS' || result.status === 'TRADE_FINISHED') {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            resolve();
          } else if (attempts >= maxAttempts) {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            reject(new Error('支付超时，请稍后查看订单状态'));
          }
        } catch {
          if (attempts >= maxAttempts) {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            reject(new Error('查询支付状态失败'));
          }
        }
      }, 2000);
    });
  }, []);

  const preparePayment = useCallback(async (orderId: number, payMethod: string) => {
    setState({ isLoading: true, isSuccess: false, error: null });
    try {
      const result = unwrap<PaymentPrepareResult>(await orderApi.pay(orderId, payMethod));
      setState((s) => ({ ...s, isLoading: false }));
      return result;
    } catch (err: any) {
      const message = err?.message || err?.data?.message || '支付发起失败';
      setState({ isLoading: false, isSuccess: false, error: message });
      throw new Error(message);
    }
  }, []);

  const confirmPayment = useCallback(
    async (orderNo: string, alipayOutTradeNo?: string) => {
      setState({ isLoading: true, isSuccess: false, error: null });
      try {
        const synced = unwrap<{ paid?: boolean; status?: string }>(
          await paymentApi.sync(orderNo, alipayOutTradeNo),
        );
        if (synced.paid || synced.status === 'TRADE_SUCCESS' || synced.status === 'TRADE_FINISHED') {
          setState({ isLoading: false, isSuccess: true, error: null });
          return;
        }
        await pollPaymentStatus(orderNo, alipayOutTradeNo, 15);
        setState({ isLoading: false, isSuccess: true, error: null });
      } catch (err: any) {
        const message = err?.message || '尚未检测到支付成功';
        setState({ isLoading: false, isSuccess: false, error: message });
        throw new Error(message);
      }
    },
    [pollPaymentStatus],
  );

  const mockCompletePayment = useCallback(async (orderNo: string) => {
    setState({ isLoading: true, isSuccess: false, error: null });
    try {
      await paymentApi.mockPay(orderNo);
      setState({ isLoading: false, isSuccess: true, error: null });
    } catch (err: any) {
      const message = err?.message || err?.data?.message || '模拟支付失败';
      setState({ isLoading: false, isSuccess: false, error: message });
      throw new Error(message);
    }
  }, []);

  return {
    ...state,
    preparePayment,
    confirmPayment,
    mockCompletePayment,
    reset,
  };
}
