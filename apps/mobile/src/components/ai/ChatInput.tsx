import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { launchImageLibrary } from 'react-native-image-picker';
import { fontSize, spacing, borderRadius } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { uploadApi } from '../../services/api';

interface Props {
  onSend: (message: string, imageUrl?: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<Props> = ({ onSend, disabled }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handlePickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.8,
      });

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri) {
          setImageUri(asset.uri);
        }
      }
    } catch (error) {
      console.log('[ChatInput] Image picker error:', error);
    }
  };

  const handleSend = async () => {
    if ((!text.trim() && !imageUri) || disabled) return;

    let uploadedUrl: string | undefined;

    // Upload image first if present
    if (imageUri) {
      setUploading(true);
      try {
        const uploadResult = await uploadApi.uploadImage({
          uri: imageUri,
          type: 'image/jpeg',
          name: `chat_${Date.now()}.jpg`,
        });
        uploadedUrl = (uploadResult as any)?.data?.url || (uploadResult as any)?.url;
      } catch (error) {
        console.log('[ChatInput] Image upload error:', error);
      }
      setUploading(false);
    }

    const message = text.trim() || (imageUri ? '请看看这张图片' : '');
    onSend(message, uploadedUrl);
    setText('');
    setImageUri(null);
  };

  return (
    <View style={styles.container}>
      {imageUri && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          <TouchableOpacity
            style={styles.removeImageBtn}
            onPress={() => setImageUri(null)}
          >
            <Text style={styles.removeImageBtnText}>×</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.inputWrapper}>
        <TouchableOpacity
          style={styles.imageBtn}
          onPress={handlePickImage}
          disabled={disabled || uploading}
        >
          <Text style={styles.imageBtnIcon}>📷</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={t('ai.inputPlaceholder')}
          placeholderTextColor={colors.textLight}
          maxLength={500}
          editable={!disabled && !uploading}
        />
        <TouchableOpacity
          style={[styles.sendBtn, ((!text.trim() && !imageUri) || disabled || uploading) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={(!text.trim() && !imageUri) || disabled || uploading}
          activeOpacity={0.7}
        >
          <Text style={styles.sendIcon}>{uploading ? '...' : '↑'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  imagePreviewContainer: {
    marginBottom: spacing.sm,
    alignSelf: 'flex-end',
    position: 'relative',
  },
  imagePreview: {
    width: 120,
    height: 90,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F3F4F6',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  imageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageBtnIcon: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: fontSize.md,
    color: colors.text,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.textLight,
  },
  sendIcon: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: -1,
  },
});
