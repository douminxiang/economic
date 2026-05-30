import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSubmitReview } from '../hooks';
import { spacing, fontSize, borderRadius, shadows, colors } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export default function ReviewSubmitScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { orderId } = route.params;
  const [rating, setRating] = useState(5);
  const [tasteRating, setTasteRating] = useState(4);
  const [packRating, setPackRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(4);
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([t('review.tags.tasty')]);
  const submitMut = useSubmitReview();

  const QUICK_TAGS = [
    t('review.tags.tasty'),
    t('review.tags.generous'),
    t('review.tags.fastDelivery'),
    t('review.tags.goodPackaging'),
    t('review.tags.valueForMoney'),
  ];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((tg) => tg !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = () => {
    submitMut.mutate(
      {
        orderId,
        rating,
        tasteRating,
        packRating,
        deliveryRating,
        content,
        tags: selectedTags,
      },
      {
        onSuccess: () => {
          Alert.alert(t('common.tip'), t('review.submitSuccess'));
          navigation.goBack();
        },
      },
    );
  };

  const StarRow = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onChange(s)}>
          <Text style={[styles.star, s <= value ? styles.starActive : styles.starInactive]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('review.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Overall Rating */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('review.rateService')}</Text>
          <StarRow value={rating} onChange={setRating} />
          <Text style={styles.ratingText}>{rating >= 4 ? t('review.satisfied') : rating >= 3 ? t('review.neutral') : t('review.dissatisfied')}</Text>
        </View>

        {/* Dimension Ratings */}
        <View style={styles.section}>
          <View style={styles.dimRow}>
            <Text style={styles.dimLabel}>{t('review.taste')}</Text>
            <StarRow value={tasteRating} onChange={setTasteRating} />
          </View>
          <View style={styles.dimRow}>
            <Text style={styles.dimLabel}>{t('review.packaging')}</Text>
            <StarRow value={packRating} onChange={setPackRating} />
          </View>
          <View style={styles.dimRow}>
            <Text style={styles.dimLabel}>{t('review.delivery')}</Text>
            <StarRow value={deliveryRating} onChange={setDeliveryRating} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('review.content')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t('review.contentPlaceholder')}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={500}
          />
        </View>

        {/* Quick Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('review.quickTags')}</Text>
          <View style={styles.tagRow}>
            {QUICK_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.tag, selectedTags.includes(tag) && styles.tagActive]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextActive]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitText}>{t('review.submit')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, height: 56, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backText: { fontSize: 24, color: colors.text },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  content: { flex: 1, padding: spacing.md },
  section: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.md, ...shadows.sm,
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  starRow: { flexDirection: 'row', gap: spacing.sm },
  star: { fontSize: 32 },
  starActive: { color: '#FFC107' },
  starInactive: { color: '#E5E5E5' },
  ratingText: { fontSize: fontSize.sm, color: colors.primary, marginTop: spacing.xs },
  dimRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs },
  dimLabel: { fontSize: fontSize.md, color: colors.text },
  textInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm,
    padding: spacing.md, fontSize: fontSize.sm, minHeight: 100, textAlignVertical: 'top',
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, backgroundColor: '#F5F5F5',
  },
  tagActive: { backgroundColor: '#FFF3E0' },
  tagText: { fontSize: fontSize.sm, color: colors.textSecondary },
  tagTextActive: { color: colors.primary },
  bottomBar: {
    backgroundColor: colors.surface, paddingHorizontal: spacing.md,
    paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
  },
  submitBtn: {
    height: 48, borderRadius: 24, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  submitText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '600' },
});
