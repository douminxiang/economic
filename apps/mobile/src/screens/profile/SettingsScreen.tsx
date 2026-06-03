import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components';
import { spacing, fontSize, borderRadius } from '../../theme/tokens';
import { useTheme, ThemeMode } from '../../theme/ThemeContext';
import { changeLanguage, getCurrentLanguage } from '../../i18n';
import { isAnalyticsEnabled, setAnalyticsEnabled } from '../../utils/tracker';

export default function SettingsScreen({ navigation }: any) {
  const { colors, themeMode, setThemeMode } = useTheme();
  const { t, i18n } = useTranslation();
  const [analyticsOn, setAnalyticsOn] = React.useState(isAnalyticsEnabled());

  const themeLabels: Record<ThemeMode, string> = {
    system: t('settings.themeSystem'),
    light: t('settings.themeLight'),
    dark: t('settings.themeDark'),
  };

  const languageLabel = getCurrentLanguage() === 'en-US' ? 'English' : '中文';

  const pickTheme = () => {
    Alert.alert(t('settings.darkMode'), undefined, [
      { text: themeLabels.system, onPress: () => setThemeMode('system') },
      { text: themeLabels.light, onPress: () => setThemeMode('light') },
      { text: themeLabels.dark, onPress: () => setThemeMode('dark') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const pickLanguage = () => {
    Alert.alert(t('settings.language'), undefined, [
      { text: '中文', onPress: () => changeLanguage('zh-CN') },
      { text: 'English', onPress: () => changeLanguage('en-US') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      height: 56,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    back: { fontSize: 22, color: colors.text, width: 32 },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
    content: { padding: spacing.md },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    rowLeft: { flex: 1, marginRight: spacing.sm },
    rowTitle: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
    rowDesc: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 4 },
    rowValue: { fontSize: fontSize.sm, color: colors.textSecondary },
    arrow: { fontSize: fontSize.xl, color: colors.textLight },
  });

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.settings')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={{ padding: 0 }}>
          <View style={[styles.row, styles.rowBorder]}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>{t('settings.analytics')}</Text>
              <Text style={styles.rowDesc}>{t('settings.analyticsDesc')}</Text>
            </View>
            <Switch
              value={analyticsOn}
              onValueChange={(v) => {
                setAnalyticsOn(v);
                setAnalyticsEnabled(v);
              }}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={analyticsOn ? colors.primary : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={pickTheme}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>{t('settings.darkMode')}</Text>
              <Text style={styles.rowDesc}>{t('settings.darkModeDesc')}</Text>
            </View>
            <Text style={styles.rowValue}>{themeLabels[themeMode]} ›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={pickLanguage}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>{t('settings.language')}</Text>
              <Text style={styles.rowDesc}>
                {i18n.language === 'zh-CN' ? '中文 / English' : '中文 / English'}
              </Text>
            </View>
            <Text style={styles.rowValue}>{languageLabel} ›</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </View>
  );
}
