import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Input, Button } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { spacing, fontSize } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

const passwordSchema = z.object({
  phone: z.string().min(11, '手机号至少11位'),
  password: z.string().min(6, '密码至少6位'),
});

const smsSchema = z.object({
  phone: z.string().regex(/^\d{11}$/, '请输入正确的11位手机号'),
  code: z.string().regex(/^\d{6}$/, '请输入6位验证码'),
});

type PasswordFormData = z.infer<typeof passwordSchema>;
type SmsFormData = z.infer<typeof smsSchema>;

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { login, smsLogin, sendCode, isLoading } = useAuth();
  const [mode, setMode] = useState<'password' | 'sms'>('password');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { phone: '', password: '' },
  });

  const smsForm = useForm<SmsFormData>({
    resolver: zodResolver(smsSchema),
    defaultValues: { phone: '', code: '' },
  });

  const startCountdown = useCallback(() => {
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleSendCode = async () => {
    const phone = smsForm.getValues('phone');
    const phoneResult = z.string().regex(/^\d{11}$/).safeParse(phone);
    if (!phoneResult.success) {
      smsForm.setError('phone', { message: t('auth.phoneFormat') });
      return;
    }
    try {
      await sendCode(phone);
      startCountdown();
      Alert.alert(t('common.tip'), t('auth.codeSent'));
    } catch (error: any) {
      Alert.alert(t('auth.sendFailed'), error?.message || t('auth.tryLater'));
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      await login(data.phone, data.password);
    } catch (error: any) {
      Alert.alert(t('auth.loginFailed'), error?.message || t('auth.checkPhonePassword'));
    }
  };

  const onSmsSubmit = async (data: SmsFormData) => {
    try {
      await smsLogin(data.phone, data.code);
    } catch (error: any) {
      Alert.alert(t('auth.loginFailed'), error?.message || t('auth.checkCode'));
    }
  };

  const switchMode = (newMode: 'password' | 'sms') => {
    setMode(newMode);
    passwordForm.reset();
    smsForm.reset();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('auth.welcomeBack')}</Text>
          <Text style={styles.subtitle}>{t('auth.loginSubtitle')}</Text>
        </View>

        {/* Mode Switch Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, mode === 'password' && styles.tabActive]}
            onPress={() => switchMode('password')}
          >
            <Text style={[styles.tabText, mode === 'password' && styles.tabTextActive]}>
              {t('auth.passwordLogin')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'sms' && styles.tabActive]}
            onPress={() => switchMode('sms')}
          >
            <Text style={[styles.tabText, mode === 'sms' && styles.tabTextActive]}>
              {t('auth.smsLogin')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Password Login Form */}
        {mode === 'password' && (
          <View style={styles.form}>
            <Controller
              control={passwordForm.control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('auth.phone')}
                  placeholder={t('auth.phonePlaceholder')}
                  keyboardType="phone-pad"
                  maxLength={11}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={passwordForm.formState.errors.phone?.message}
                />
              )}
            />
            <Controller
              control={passwordForm.control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('auth.password')}
                  placeholder={t('auth.passwordPlaceholder')}
                  secureTextEntry
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={passwordForm.formState.errors.password?.message}
                />
              )}
            />
            <Button
              title={t('auth.login')}
              onPress={passwordForm.handleSubmit(onPasswordSubmit)}
              loading={isLoading}
              disabled={isLoading}
            />
          </View>
        )}

        {/* SMS Login Form */}
        {mode === 'sms' && (
          <View style={styles.form}>
            <Controller
              control={smsForm.control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('auth.phone')}
                  placeholder={t('auth.phonePlaceholder')}
                  keyboardType="phone-pad"
                  maxLength={11}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={smsForm.formState.errors.phone?.message}
                />
              )}
            />
            <View style={styles.codeRow}>
              <View style={styles.codeInput}>
                <Controller
                  control={smsForm.control}
                  name="code"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label={t('auth.code')}
                      placeholder={t('auth.codePlaceholder')}
                      keyboardType="number-pad"
                      maxLength={6}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={smsForm.formState.errors.code?.message}
                    />
                  )}
                />
              </View>
              <TouchableOpacity
                style={[styles.codeButton, countdown > 0 && styles.codeButtonDisabled]}
                onPress={handleSendCode}
                disabled={countdown > 0}
              >
                <Text style={styles.codeButtonText}>
                  {countdown > 0 ? `${countdown}s` : t('auth.getCode')}
                </Text>
              </TouchableOpacity>
            </View>
            <Button
              title={t('auth.login')}
              onPress={smsForm.handleSubmit(onSmsSubmit)}
              loading={isLoading}
              disabled={isLoading}
            />
          </View>
        )}

        <TouchableOpacity
          style={styles.linkContainer}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.linkText}>
            {t('auth.noAccount')}<Text style={styles.linkHighlight}>{t('auth.signUp')}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl },
  header: { marginBottom: spacing.lg, alignItems: 'center' },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary },
  tabContainer: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 8, padding: 4, marginBottom: spacing.lg },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: colors.white, fontWeight: '600' },
  form: { width: '100%' },
  codeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  codeInput: { flex: 1 },
  codeButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: 8, marginBottom: spacing.md, minWidth: 100, alignItems: 'center' },
  codeButtonDisabled: { backgroundColor: colors.textLight },
  codeButtonText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '600' },
  linkContainer: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { fontSize: fontSize.sm, color: colors.textSecondary },
  linkHighlight: { color: colors.primary, fontWeight: '600' },
});
