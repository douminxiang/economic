import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePayment } from '../hooks';
import PaymentWebView from '../components/PaymentWebView';
import { orderApi } from '../services/api';
import { fontSize, spacing, borderRadius, shadows } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

type PayPhase = 'idle' | 'opening' | 'webview' | 'verifying' | 'success';

export default function PaymentScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { orderId, amount } = route.params;
  const [selectedMethod, setSelectedMethod] = useState('alipay');
  const [phase, setPhase] = useState<PayPhase>('idle');
  const [payUrl, setPayUrl] = useState('');
  const [payFormHtml, setPayFormHtml] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [alipayOutTradeNo, setAlipayOutTradeNo] = useState('');
  const { preparePayment, confirmPayment, mockCompletePayment } = usePayment();

  const applyPayResult = useCallback((result: {
    orderNo: string;
    alipayOutTradeNo?: string;
    payUrl?: string;
    payFormHtml?: string;
  }) => {
    setOrderNo(result.orderNo);
    setAlipayOutTradeNo(result.alipayOutTradeNo || result.orderNo);
    setPayUrl(result.payUrl || '');
    setPayFormHtml(result.payFormHtml || '');
  }, []);

  const PAYMENT_METHODS = [
    { key: 'alipay', name: t('payment.alipay'), badge: '支', color: '#1677FF', recommended: true },
    { key: 'wechat', name: t('payment.wechat'), badge: '微', color: '#07C160' },
    { key: 'unionpay', name: t('payment.unionpay'), badge: '银', color: '#E21836' },
  ];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.md,
          height: 56,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        backText: { fontSize: 22, color: colors.text, width: 32 },
        headerTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
        amountSection: {
          backgroundColor: colors.surface,
          alignItems: 'center',
          paddingVertical: 24,
        },
        amountLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 8 },
        amountValue: { fontSize: 36, fontWeight: '700', color: colors.text },
        content: { flex: 1, padding: spacing.md, gap: 16 },
        sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
        methodCard: {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          ...shadows.sm,
        },
        methodRow: {
          flexDirection: 'row',
          alignItems: 'center',
          height: 56,
          paddingHorizontal: 14,
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        methodRowLast: { borderBottomWidth: 0 },
        methodIcon: {
          width: 32,
          height: 32,
          borderRadius: 8,
          justifyContent: 'center',
          alignItems: 'center',
        },
        methodIconText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
        methodInfo: { flex: 1 },
        methodName: { fontSize: 15, fontWeight: '500', color: colors.text },
        methodDesc: { fontSize: 11, color: colors.primary, marginTop: 2 },
        radio: {
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: colors.border,
          justifyContent: 'center',
          alignItems: 'center',
        },
        radioInner: { width: 12, height: 12, borderRadius: 6 },
        bottom: { padding: spacing.md, paddingBottom: 32 },
        payBtn: {
          backgroundColor: colors.primary,
          borderRadius: 25,
          height: 50,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
        },
        payBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
        mockBtn: {
          marginTop: spacing.sm,
          alignItems: 'center',
          paddingVertical: spacing.sm,
        },
        mockBtnText: { fontSize: fontSize.sm, color: colors.textSecondary },
        secureTip: { fontSize: 11, color: colors.textLight, textAlign: 'center', marginTop: 12 },
        overlay: {
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
        },
        overlayCard: {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          padding: spacing.xl,
          alignItems: 'center',
          minWidth: 260,
          ...shadows.md,
        },
        overlayTitle: { fontSize: fontSize.md, color: colors.text, marginTop: spacing.md, fontWeight: '500' },
        overlayHint: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.sm },
        successCard: {
          flex: 1,
          backgroundColor: colors.surface,
          margin: spacing.md,
          borderRadius: borderRadius.lg,
          alignItems: 'center',
          paddingTop: 60,
          marginTop: 40,
          ...shadows.md,
        },
        successIcon: {
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: colors.success,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 20,
        },
        successCheck: { color: '#FFF', fontSize: 40, fontWeight: '700' },
        successTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 },
        successAmount: { fontSize: 36, fontWeight: '700', color: colors.text, marginBottom: 40 },
        successActions: { flexDirection: 'row', gap: 16, paddingHorizontal: 24, width: '100%' },
        viewOrderBtn: {
          flex: 1,
          backgroundColor: colors.primary,
          borderRadius: 24,
          height: 48,
          justifyContent: 'center',
          alignItems: 'center',
        },
        viewOrderText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
        homeBtn: {
          flex: 1,
          backgroundColor: colors.background,
          borderRadius: 24,
          height: 48,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.border,
        },
        homeText: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
      }),
    [colors],
  );

  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (phase === 'opening' || phase === 'verifying') {
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }),
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [phase]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const finishSuccess = useCallback(() => {
    setPhase('success');
    Animated.spring(checkScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [checkScale]);

  const handlePay = async () => {
    setPhase('opening');
    try {
      const result = await preparePayment(orderId, selectedMethod);

      if (result.mockMode) {
        finishSuccess();
        return;
      }

      if (selectedMethod === 'alipay' && (result.payUrl || result.payFormHtml)) {
        applyPayResult(result);
        setPhase('webview');
        return;
      }

      throw new Error('暂不支持该支付方式');
    } catch (err: any) {
      setPhase('idle');
      Alert.alert('支付失败', err?.message || '请重试');
    }
  };

  const handleRefreshPay = useCallback(async () => {
    const result = await preparePayment(orderId, selectedMethod);
    if (result.mockMode) {
      throw new Error('已进入模拟支付模式');
    }
    if (!result.payUrl && !result.payFormHtml) {
      throw new Error('未获取到支付链接');
    }
    applyPayResult(result);
  }, [applyPayResult, orderId, preparePayment, selectedMethod]);

  const handleWebViewComplete = async () => {
    setPhase('verifying');
    try {
      await confirmPayment(orderNo, alipayOutTradeNo || undefined);
      setPayUrl('');
      setPayFormHtml('');
      setAlipayOutTradeNo('');
      finishSuccess();
    } catch (err: any) {
      setPhase('webview');
      Alert.alert(
        '尚未完成支付',
        err?.message || '请先在支付宝页面完成付款，再点击「我已完成付款」',
      );
    }
  };

  const handleMockPay = () => {
    Alert.alert('模拟支付', '沙箱环境异常时使用，将直接标记订单为已支付。', [
      { text: '取消', style: 'cancel' },
      {
        text: '确认',
        onPress: async () => {
          setPhase('verifying');
          try {
            let no = orderNo;
            if (!no) {
              const detail: any = await orderApi.detail(orderId);
              no = detail?.data?.orderNo ?? detail?.orderNo;
            }
            if (!no) throw new Error('无法获取订单号');
            await mockCompletePayment(no);
            setPayUrl('');
            setPayFormHtml('');
            setAlipayOutTradeNo('');
            finishSuccess();
          } catch (err: any) {
            setPhase('idle');
            Alert.alert('失败', err?.message || '模拟支付失败');
          }
        },
      },
    ]);
  };

  if (phase === 'success') {
    const methodInfo = PAYMENT_METHODS.find((m) => m.key === selectedMethod);
    return (
      <View style={styles.container}>
        <View style={styles.successCard}>
          <Animated.View style={[styles.successIcon, { transform: [{ scale: checkScale }] }]}>
            <Text style={styles.successCheck}>✓</Text>
          </Animated.View>
          <Text style={styles.successTitle}>{t('payment.success')}</Text>
          <Text style={styles.successAmount}>¥{Number(amount).toFixed(2)}</Text>
          <Text style={{ color: colors.textSecondary, marginBottom: 24 }}>{methodInfo?.name}</Text>
          <View style={styles.successActions}>
            <TouchableOpacity
              style={styles.viewOrderBtn}
              onPress={() => navigation.replace('OrderDetail', { id: orderId })}
            >
              <Text style={styles.viewOrderText}>{t('payment.viewOrder')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.popToTop()}>
              <Text style={styles.homeText}>{t('payment.backHome')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={phase !== 'idle'}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('payment.confirm')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <Animated.View style={[styles.amountSection, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.amountLabel}>{t('payment.amount')}</Text>
        <Text style={styles.amountValue}>¥{Number(amount).toFixed(2)}</Text>
      </Animated.View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>{t('payment.selectMethod')}</Text>
        <View style={styles.methodCard}>
          {PAYMENT_METHODS.map((method, index) => (
            <TouchableOpacity
              key={method.key}
              style={[styles.methodRow, index === PAYMENT_METHODS.length - 1 && styles.methodRowLast]}
              onPress={() => setSelectedMethod(method.key)}
              disabled={phase !== 'idle'}
            >
              <View style={[styles.methodIcon, { backgroundColor: method.color }]}>
                <Text style={styles.methodIconText}>{method.badge}</Text>
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>{method.name}</Text>
                {method.recommended ? <Text style={styles.methodDesc}>{t('payment.recommended')}</Text> : null}
              </View>
              <View style={[styles.radio, selectedMethod === method.key && { borderColor: colors.primary }]}>
                {selectedMethod === method.key ? (
                  <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity style={styles.payBtn} disabled={phase !== 'idle'} onPress={handlePay}>
          <Text style={styles.payBtnText}>🔒 {t('payment.payNow')} ¥{Number(amount).toFixed(2)}</Text>
        </TouchableOpacity>
        {selectedMethod === 'alipay' ? (
          <TouchableOpacity style={styles.mockBtn} disabled={phase !== 'idle'} onPress={handleMockPay}>
            <Text style={styles.mockBtnText}>{t('payment.mockFallback')}</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={styles.secureTip}>{t('payment.secureTip')}</Text>
      </View>

      <PaymentWebView
        visible={phase === 'webview'}
        payUrl={payUrl}
        payFormHtml={payFormHtml}
        onClose={() => {
          setPhase('idle');
          setPayUrl('');
          setPayFormHtml('');
          setAlipayOutTradeNo('');
        }}
        onCheckPayment={handleWebViewComplete}
        onRefreshPay={handleRefreshPay}
      />

      <Modal visible={phase === 'opening' || phase === 'verifying'} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </Animated.View>
            <Text style={styles.overlayTitle}>
              {phase === 'opening' ? t('payment.openingAlipay') : t('payment.verifying')}
            </Text>
            {phase === 'verifying' ? (
              <Text style={styles.overlayHint}>{t('payment.doNotClose')}</Text>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
