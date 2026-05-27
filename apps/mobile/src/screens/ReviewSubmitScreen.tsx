import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useSubmitReview } from '../hooks';
import { colors, spacing, fontSize, borderRadius, shadows } from '../theme/tokens';

const QUICK_TAGS = ['味道好', '分量足', '配送快', '包装好', '性价比高'];

export default function ReviewSubmitScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [rating, setRating] = useState(5);
  const [tasteRating, setTasteRating] = useState(4);
  const [packRating, setPackRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(4);
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['味道好']);
  const submitMut = useSubmitReview();

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
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
          Alert.alert('提示', '评价成功');
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
        <Text style={styles.headerTitle}>评价订单</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Overall Rating */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>请为本次服务打分</Text>
          <StarRow value={rating} onChange={setRating} />
          <Text style={styles.ratingText}>{rating >= 4 ? '满意' : rating >= 3 ? '一般' : '不满意'}</Text>
        </View>

        {/* Dimension Ratings */}
        <View style={styles.section}>
          <View style={styles.dimRow}>
            <Text style={styles.dimLabel}>口味</Text>
            <StarRow value={tasteRating} onChange={setTasteRating} />
          </View>
          <View style={styles.dimRow}>
            <Text style={styles.dimLabel}>包装</Text>
            <StarRow value={packRating} onChange={setPackRating} />
          </View>
          <View style={styles.dimRow}>
            <Text style={styles.dimLabel}>配送</Text>
            <StarRow value={deliveryRating} onChange={setDeliveryRating} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>评价内容</Text>
          <TextInput
            style={styles.textInput}
            placeholder="分享你的用餐体验..."
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={500}
          />
        </View>

        {/* Quick Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>快速标签</Text>
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
          <Text style={styles.submitText}>提交评价</Text>
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
