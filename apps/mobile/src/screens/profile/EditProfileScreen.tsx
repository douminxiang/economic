import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { Input, Button } from '../../components';
import { colors, spacing, fontSize, borderRadius } from '../../theme/tokens';

const editProfileSchema = z.object({
  nickname: z.string().min(2, '昵称至少2个字符').max(20, '昵称不超过20个字符'),
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;

export default function EditProfileScreen({ navigation }: any) {
  const { user, updateUser } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      nickname: user?.nickname || '',
    },
  });

  const onSubmit = async (data: EditProfileFormData) => {
    try {
      await updateUser({ nickname: data.nickname });
      Alert.alert('成功', '资料已更新', [
        { text: '确定', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('错误', '更新失败，请重试');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>编辑资料</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.content}>
        {/* Avatar Preview */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.nickname ? user.nickname.charAt(0) : '?'}
            </Text>
          </View>
          <Text style={styles.avatarHint}>当前头像</Text>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <Controller
            control={control}
            name="nickname"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="昵称"
                placeholder="请输入昵称"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.nickname?.message}
              />
            )}
          />

          <Text style={styles.label}>手机号</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>{user?.phone || '-'}</Text>
          </View>
        </View>

        {/* Save Button */}
        <Button
          title={isSubmitting ? '保存中...' : '保存'}
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          disabled={isSubmitting}
          style={styles.saveButton}
        />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 60,
  },
  backText: {
    fontSize: fontSize.md,
    color: colors.primary,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: '#FFF',
  },
  avatarHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  formSection: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  readOnlyField: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    backgroundColor: colors.background,
    minHeight: 48,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  readOnlyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  saveButton: {
    marginTop: spacing.md,
  },
});
