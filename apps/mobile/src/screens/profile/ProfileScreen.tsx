import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components';
import { spacing, fontSize, borderRadius, shadows } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

export default function ProfileScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const menuItems = [
    { key: 'address', label: t('profile.myAddresses'), icon: '📍' },
    { key: 'favorites', label: t('profile.myFavorites'), icon: '⭐' },
    { key: 'history', label: t('profile.browseHistory'), icon: '🕐' },
    { key: 'settings', label: t('profile.settings'), icon: '⚙️' },
  ] as const;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.background },
        container: { flex: 1 },
        content: { padding: spacing.md },
        title: { fontSize: fontSize.xl, fontWeight: 'bold', color: colors.text, marginBottom: spacing.lg },
        userCard: { marginBottom: spacing.md },
        userInfo: { flexDirection: 'row', alignItems: 'center' },
        avatar: {
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
        },
        avatarText: { fontSize: fontSize.xl, fontWeight: 'bold', color: colors.white },
        userDetails: { flex: 1, marginLeft: spacing.md },
        nickname: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
        phone: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
        editButton: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.md,
          borderWidth: 1,
          borderColor: colors.primary,
        },
        editButtonText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '500' },
        menuCard: { marginBottom: spacing.md, padding: 0 },
        menuItem: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
        },
        menuItemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
        menuLeft: { flexDirection: 'row', alignItems: 'center' },
        menuIcon: { fontSize: fontSize.lg, width: 32 },
        menuLabel: { fontSize: fontSize.md, color: colors.text },
        menuArrow: { fontSize: fontSize.xl, color: colors.textLight },
        logoutButton: {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.md,
          paddingVertical: spacing.md,
          alignItems: 'center',
          ...shadows.sm,
        },
        logoutText: { fontSize: fontSize.md, color: colors.error, fontWeight: '500' },
      }),
    [colors],
  );

  const handleLogout = () => {
    Alert.alert(t('common.tip'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.exit'), style: 'destructive', onPress: logout },
    ]);
  };

  const handleMenuPress = (key: string) => {
    switch (key) {
      case 'address':
        navigation.navigate('Address');
        break;
      case 'favorites':
        navigation.navigate('Favorite');
        break;
      case 'history':
        navigation.navigate('History');
        break;
      case 'settings':
        navigation.navigate('Settings');
        break;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('tabs.profile')}</Text>

        <Card style={styles.userCard}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.nickname ? user.nickname.charAt(0) : '?'}</Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.nickname}>{user?.nickname || t('profile.title')}</Text>
              <Text style={styles.phone}>{user?.phone || ''}</Text>
            </View>
            <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('EditProfile')}>
              <Text style={styles.editButtonText}>{t('common.edit')}</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <Card style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuItem, index < menuItems.length - 1 && styles.menuItemBorder]}
              onPress={() => handleMenuPress(item.key)}
            >
              <View style={styles.menuLeft}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </Card>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
