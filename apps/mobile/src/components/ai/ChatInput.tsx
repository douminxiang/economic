import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, fontSize, spacing } from '../../theme/tokens';

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<Props> = ({ onSend, disabled }) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="输入你的问题..."
          placeholderTextColor={colors.textLight}
          maxLength={500}
          editable={!disabled}
        />
        <TouchableOpacity onPress={handleSend} disabled={!text.trim() || disabled}>
          <Icon
            name="send"
            size={24}
            color={!text.trim() || disabled ? colors.textLight : '#3B82F6'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm + 4,  // 12
    paddingHorizontal: spacing.md,     // 16
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,  // 12
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: spacing.sm + 4,  // 12
    paddingVertical: spacing.sm,         // 8
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    fontSize: fontSize.sm,  // 14
    color: colors.text,
  },
});
