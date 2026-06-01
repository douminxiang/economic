import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { Input, Button, ImageUploader } from '../../components';
import { spacing, fontSize, borderRadius, colors } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

export default function EditProfileScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [avatar, setAvatar] = useState(user?.avatar || '');

  const editProfileSchema = z.object({
    nickname: z.string().min(2, t('auth.nicknameMinLength')).max(20, t('auth.nicknameMaxLength')),
  });

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ nickname: string }>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      nickname: user?.nickname || '',
    },
  });

  const onSubmit = async (data: { nickname: string }) => {
    try {
      const payload: { nickname: string; avatar?: string } = { nickname: data.nickname };
      if (avatar && avatar !== user?.avatar) {
        payload.avatar = avatar;
      }
      await updateUser(payload);
      Alert.alert(t('common.success'), '资料已更新', [
        { text: t('common.confirm'), onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert(t('common.error'), '更新失败，请重试');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.editProfile')}</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.content}>
          <View style={styles.avatarSection}>
            <ImageUploader
              value={avatar || undefined}
              onChange={setAvatar}
              size={96}
            />
            <Text style={styles.avatarHint}>{t('profile.tapToChangeAvatar')}</Text>
          </View>

          <View style={styles.formSection}>
            <Controller
              control={control}
              name="nickname"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('profile.nickname')}
                  placeholder={t('profile.nicknamePlaceholder')}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.nickname?.message}
                />
              )}
            />

            <Text style={styles.label}>{t('profile.phone')}</Text>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyText}>{user?.phone || '-'}</Text>
            </View>
          </View>

          <Button
            title={isSubmitting ? t('common.saving') : t('common.save')}
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
  safe: { flex: 1, backgroundColor: colors.background },
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
  backButton: { width: 60 },
  backText: { fontSize: fontSize.md, color: colors.primary },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  container: { flex: 1 },
  scrollContent: { flex: 1 },
  content: { padding: spacing.md },
  avatarSection: { alignItems: 'center', paddingVertical: spacing.lg },
  avatarHint: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm },
  formSection: { marginBottom: spacing.lg },
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
  readOnlyText: { fontSize: fontSize.md, color: colors.textSecondary },
  saveButton: { marginTop: spacing.md },
});
