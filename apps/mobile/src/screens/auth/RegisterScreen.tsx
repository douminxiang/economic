import React from 'react';
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

const registerSchema = z.object({
  phone: z.string().min(11, '手机号至少11位'),
  password: z.string().min(6, '密码至少6位'),
  nickname: z.string().max(50, '昵称不超过50个字符').optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterScreenProps {
  navigation: any;
}

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { register, isLoading } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      phone: '',
      password: '',
      nickname: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await register(data.phone, data.password, data.nickname);
    } catch (error: any) {
      Alert.alert(t('auth.registerFailed'), error?.response?.data?.message || t('auth.tryLater'));
    }
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
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>{t('auth.registerTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.registerSubtitle')}</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
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
                error={errors.phone?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('auth.password')}
                placeholder={t('auth.passwordPlaceholder')}
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="nickname"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('auth.nickname')}
                placeholder={t('auth.nicknamePlaceholder')}
                maxLength={50}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value || ''}
                error={errors.nickname?.message}
              />
            )}
          />

          <Button
            title={t('auth.register')}
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
          />

          <TouchableOpacity
            style={styles.linkContainer}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.linkText}>
              {t('auth.hasAccount')}<Text style={styles.linkHighlight}>{t('auth.backToLogin')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl },
  topBar: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backIcon: { fontSize: 20, color: colors.text },
  header: { marginBottom: spacing.xl, alignItems: 'center' },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary },
  form: { width: '100%' },
  linkContainer: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { fontSize: fontSize.sm, color: colors.textSecondary },
  linkHighlight: { color: colors.primary, fontWeight: '600' },
});
