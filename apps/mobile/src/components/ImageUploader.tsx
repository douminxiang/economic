import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { launchImageLibrary, MediaType } from 'react-native-image-picker';
import { uploadApi } from '../services/api';
import { spacing, fontSize, borderRadius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  size?: number;
}

export function ImageUploader({ value, onChange, label, size = 80 }: ImageUploaderProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        label: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs },
        container: {
          borderRadius: borderRadius.md,
          borderWidth: 1,
          borderColor: colors.border,
          borderStyle: 'dashed',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
          overflow: 'hidden',
        },
        image: { borderRadius: borderRadius.md, resizeMode: 'cover' },
        placeholder: { alignItems: 'center' },
        plus: { fontSize: 28, color: colors.textLight, lineHeight: 32 },
        hint: { fontSize: fontSize.xs, color: colors.textLight, marginTop: spacing.xs },
      }),
    [colors],
  );

  const handlePick = () => {
    launchImageLibrary(
      {
        mediaType: 'photo' as MediaType,
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.8,
      },
      async (response) => {
        if (response.didCancel || response.errorMessage) return;

        const asset = response.assets?.[0];
        if (!asset?.uri || !asset.type || !asset.fileName) return;

        setUploading(true);
        try {
          const res: any = await uploadApi.uploadImage({
            uri: asset.uri,
            type: asset.type,
            name: asset.fileName,
          });
          onChange(res.data.url);
        } catch (error: any) {
          Alert.alert(t('upload.failed'), error?.message || t('upload.retry'));
        } finally {
          setUploading(false);
        }
      },
    );
  };

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.container, { width: size, height: size }]}
        onPress={handlePick}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color={colors.primary} />
        ) : value ? (
          <Image source={{ uri: value }} style={[styles.image, { width: size, height: size }]} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.plus}>+</Text>
            <Text style={styles.hint}>{t('upload.uploadImage')}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}
