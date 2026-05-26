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
import { Input, Button } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, fontSize } from '../../theme/tokens';

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
      Alert.alert('注册失败', error?.response?.data?.message || '请稍后再试');
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
        <View style={styles.header}>
          <Text style={styles.title}>创建账户</Text>
          <Text style={styles.subtitle}>注册新账户开始使用</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="手机号"
                placeholder="请输入手机号"
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
                label="密码"
                placeholder="请输入密码"
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
                label="昵称（选填）"
                placeholder="请输入昵称"
                maxLength={50}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value || ''}
                error={errors.nickname?.message}
              />
            )}
          />

          <Button
            title="注册"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
          />

          <TouchableOpacity
            style={styles.linkContainer}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.linkText}>
              已有账户？<Text style={styles.linkHighlight}>返回登录</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  form: {
    width: '100%',
  },
  linkContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  linkText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  linkHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
});
