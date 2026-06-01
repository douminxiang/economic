import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontSize, spacing, borderRadius } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { uploadApi } from '../../services/api';
import { normalizeUploadFile, showImagePickMenu } from '../../utils/imagePick';

interface Props {
  onSend: (message: string, imageUrl?: string) => void;
  disabled?: boolean;
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    previewBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    previewThumb: {
      width: 64,
      height: 64,
      borderRadius: borderRadius.md,
      backgroundColor: colors.background,
    },
    previewInfo: { flex: 1, gap: 2 },
    previewName: { fontSize: 13, fontWeight: '500', color: colors.text },
    previewMeta: { fontSize: 11, color: colors.textLight },
    previewRemove: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.error,
      justifyContent: 'center',
      alignItems: 'center',
    },
    previewRemoveText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
    },
    camBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    camBtnActive: { backgroundColor: colors.primary },
    camIcon: { fontSize: 20 },
    inputField: {
      flex: 1,
      height: 40,
      backgroundColor: colors.background,
      borderRadius: 20,
      paddingHorizontal: 14,
      fontSize: fontSize.sm,
      color: colors.text,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendBtnDisabled: { backgroundColor: colors.textLight },
    sendIcon: { color: '#FFF', fontSize: 20, fontWeight: '700' },
    uploadOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.35)',
      borderRadius: borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}

export const ChatInput: React.FC<Props> = ({ onSend, disabled }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageName, setImageName] = useState('food_photo.jpg');
  const [imageMime, setImageMime] = useState('image/jpeg');
  const [imageSize, setImageSize] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);

  const handlePickImage = () => {
    showImagePickMenu(
      {
        title: t('ai.imagePickTitle'),
        library: t('ai.imagePickLibrary'),
        camera: t('ai.imagePickCamera'),
        cancel: t('common.cancel'),
      },
      (asset) => {
        const file = normalizeUploadFile(asset);
        setImageUri(file.uri);
        setImageMime(file.type);
        setImageName(file.name);
        const sizeMb = asset.fileSize ? (asset.fileSize / (1024 * 1024)).toFixed(1) : '1.2';
        setImageSize(`${sizeMb} MB`);
      },
      () => {
        Alert.alert(t('ai.imagePickEmptyTitle'), t('ai.imagePickEmptyMessage'));
      },
      (code) => {
        if (code === 'camera_permission_denied') {
          Alert.alert(t('ai.imagePickFailed'), t('ai.cameraPermissionDenied'));
        } else {
          Alert.alert(t('ai.imagePickFailed'), code);
        }
      },
    );
  };

  const clearImage = () => {
    setImageUri(null);
    setImageMime('image/jpeg');
    setUploadPercent(0);
  };

  const handleSend = async () => {
    if ((!text.trim() && !imageUri) || disabled) return;

    let uploadedUrl: string | undefined;

    if (imageUri) {
      setUploading(true);
      setUploadPercent(10);
      try {
        const progressTimer = setInterval(() => {
          setUploadPercent((p) => (p >= 90 ? 90 : p + 15));
        }, 200);
        const uploadResult = await uploadApi.uploadImage({
          uri: imageUri,
          type: imageMime,
          name: imageName,
        });
        clearInterval(progressTimer);
        setUploadPercent(100);
        uploadedUrl = uploadResult?.data?.url;
        if (!uploadedUrl) {
          throw new Error('missing url');
        }
      } catch (error: any) {
        console.log('[ChatInput] Image upload error:', error);
        Alert.alert(t('common.error'), error?.message || t('ai.imageUploadFailed'));
        setUploading(false);
        setUploadPercent(0);
        return;
      }
      setUploading(false);
      setUploadPercent(0);
    }

    const message = text.trim() || t('ai.imageDefaultMessage');
    onSend(message, uploadedUrl);
    setText('');
    clearImage();
  };

  const canSend = (text.trim() || imageUri) && !disabled && !uploading;

  return (
    <View style={styles.container}>
      {imageUri ? (
        <View style={styles.previewBar}>
          <View>
            <Image source={{ uri: imageUri }} style={styles.previewThumb} />
            {uploading ? (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator color="#FFF" />
              </View>
            ) : null}
          </View>
          <View style={styles.previewInfo}>
            <Text style={styles.previewName}>{imageName}</Text>
            <Text style={styles.previewMeta}>
              {uploading ? t('ai.uploadProgress', { percent: uploadPercent }) : imageSize}
            </Text>
          </View>
          <TouchableOpacity style={styles.previewRemove} onPress={clearImage} disabled={uploading}>
            <Text style={styles.previewRemoveText}>×</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <TouchableOpacity
          style={[styles.camBtn, imageUri && styles.camBtnActive]}
          onPress={handlePickImage}
          disabled={disabled || uploading}
        >
          <Text style={styles.camIcon}>📷</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.inputField}
          value={text}
          onChangeText={setText}
          placeholder={t('ai.inputPlaceholder')}
          placeholderTextColor={colors.textLight}
          maxLength={500}
          editable={!disabled && !uploading}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          <Text style={styles.sendIcon}>{uploading ? '…' : '↑'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
