import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { usePayOrder } from '../hooks';
import { colors, fontSize, spacing, borderRadius } from '../theme/tokens';

const PAYMENT_METHODS = [
  { key: 'alipay', name: '支付宝', icon: '💳', color: '#1677FF', bg: '#E6F0FF' },
  { key: 'wechat', name: '微信支付', icon: '💚', color: '#07C160', bg: '#E6F9ED' },
  { key: 'unionpay', name: '银联支付', icon: '🏦', color: '#E21E2D', bg: '#FDECEC' },
];

export default function PaymentScreen({ navigation, route }: any) {
  const { orderId, amount } = route.params;
  const [selectedMethod, setSelectedMethod] = useState('alipay');
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const payMut = usePayOrder();

  const scaleAnim = useRef(new Animated.Value(0.8)).current;
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
    if (paying) {
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }),
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [paying]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const handlePay = () => {
    setPaying(true);
    payMut.mutate(
      { id: orderId },
      {
        onSuccess: () => {
          setTimeout(() => {
            setPaying(false);
            setSuccess(true);
            Animated.spring(checkScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
          }, 1500);
        },
        onError: () => setPaying(false),
      },
    );
  };

  // Success page
  if (success) {
    const methodInfo = PAYMENT_METHODS.find((m) => m.key === selectedMethod);
    return (
      <View style={styles.container}>
        <View style={styles.successCard}>
          <Animated.View style={[styles.successIcon, { transform: [{ scale: checkScale }] }]}>
            <Text style={styles.successCheck}>✓</Text>
          </Animated.View>
          <Text style={styles.successTitle}>支付成功</Text>
          <Text style={styles.successAmount}>¥{Number(amount).toFixed(2)}</Text>
          <Text style={styles.successMethod}>{methodInfo?.name}</Text>
          <View style={styles.successActions}>
            <TouchableOpacity style={styles.viewOrderBtn} onPress={() => navigation.replace('OrderDetail', { id: orderId })}>
              <Text style={styles.viewOrderText}>查看订单</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.popToTop()}>
              <Text style={styles.homeText}>返回首页</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Payment page
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>确认支付</Text>
        <View style={{ width: 24 }} />
      </View>

      <Animated.View style={[styles.amountSection, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.amountLabel}>支付金额</Text>
        <View style={styles.amountRow}>
          <Text style={styles.amountSign}>¥</Text>
          <Text style={styles.amountValue}>{Number(amount).toFixed(2)}</Text>
        </View>
      </Animated.View>

      <View style={styles.methodsSection}>
        <Text style={styles.sectionTitle}>选择支付方式</Text>
        {PAYMENT_METHODS.map((method) => (
          <TouchableOpacity
            key={method.key}
            style={[styles.methodCard, selectedMethod === method.key && styles.methodCardActive]}
            onPress={() => setSelectedMethod(method.key)}
          >
            <View style={[styles.methodIcon, { backgroundColor: method.bg }]}>
              <Text style={styles.methodIconText}>{method.icon}</Text>
            </View>
            <Text style={styles.methodName}>{method.name}</Text>
            <View style={[styles.radio, selectedMethod === method.key && { borderColor: method.color }]}>
              {selectedMethod === method.key && <View style={[styles.radioInner, { backgroundColor: method.color }]} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.payBtn, paying && { opacity: 0.7 }]}
          disabled={paying}
          onPress={handlePay}
        >
          {paying ? (
            <View style={styles.payingRow}>
              <Animated.Text style={[styles.spinner, { transform: [{ rotate: spin }] }]}>↻</Animated.Text>
              <Text style={styles.payBtnText}>支付中...</Text>
            </View>
          ) : (
            <Text style={styles.payBtnText}>立即支付 ¥{Number(amount).toFixed(2)}</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.secureTip}>🔒 安全支付，资金由平台担保</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, height: 56, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 32, height: 32, justifyContent: 'center' },
  backText: { fontSize: 22, color: colors.text },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },

  amountSection: {
    backgroundColor: colors.surface, alignItems: 'center', paddingVertical: 32,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  amountLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'flex-start' },
  amountSign: { fontSize: fontSize.xl, fontWeight: '600', color: colors.text, marginTop: 4 },
  amountValue: { fontSize: 48, fontWeight: '700', color: colors.text, letterSpacing: -1 },

  methodsSection: { padding: spacing.md },
  sectionTitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 12, marginLeft: 4 },
  methodCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: borderRadius.md, padding: 16, marginBottom: 10,
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  methodCardActive: { borderColor: colors.primary },
  methodIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  methodIconText: { fontSize: 22 },
  methodName: { flex: 1, marginLeft: 14, fontSize: fontSize.md, fontWeight: '500', color: colors.text },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },

  bottomSection: { marginTop: 'auto', padding: spacing.md, paddingBottom: 32 },
  payBtn: {
    backgroundColor: colors.primary, borderRadius: 28, height: 54,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  payBtnText: { color: '#FFF', fontSize: fontSize.lg, fontWeight: '600' },
  payingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spinner: { fontSize: 22, color: '#FFF' },
  secureTip: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center', marginTop: 12 },

  successCard: {
    flex: 1, backgroundColor: colors.surface, margin: spacing.md, borderRadius: borderRadius.lg,
    alignItems: 'center', paddingTop: 60, marginTop: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5,
  },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#07C160', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successCheck: { color: '#FFF', fontSize: 40, fontWeight: '700' },
  successTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 },
  successAmount: { fontSize: 36, fontWeight: '700', color: colors.text, marginBottom: 4 },
  successMethod: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 40 },
  successActions: { flexDirection: 'row', gap: 16, paddingHorizontal: 24, width: '100%' },
  viewOrderBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 24, height: 48, justifyContent: 'center', alignItems: 'center' },
  viewOrderText: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
  homeBtn: { flex: 1, backgroundColor: '#F5F6FA', borderRadius: 24, height: 48, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  homeText: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
});
