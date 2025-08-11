import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface SettingsScreenProps {
  navigation: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { theme, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useLocalization();
  const { defaultCurrency } = useCurrency();
  const { signOut, user } = useAuth();

  const getLanguageDisplayName = (lang: string) => {
    switch (lang) {
      case 'en': return 'English';
      case 'es': return 'Español';
      case 'fr': return 'Français';
      default: return 'English';
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      padding: 20,
      paddingTop: 10,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 12,
      textTransform: 'uppercase',
    },
    settingItem: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingIcon: {
      marginRight: 12,
    },
    settingTextContainer: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: 2,
    },
    settingSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    userInfo: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    userInfoContent: {
      flex: 1,
    },
    userName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    signOutButton: {
      backgroundColor: theme.colors.error,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 20,
    },
    signOutText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    languagePickerContainer: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      marginBottom: 8,
      overflow: 'hidden',
    },
    languagePickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    languagePickerContent: {
      backgroundColor: theme.colors.card,
      borderRadius: 8,
      overflow: 'hidden',
      marginHorizontal: 16,
      marginBottom: 16,
    },
    picker: {
      color: theme.colors.text,
    },
    dangerZoneTitle: {
      color: '#DC2626',
      fontWeight: '700',
    },
    dangerItem: {
      borderWidth: 1,
      borderColor: theme.isDark ? '#7F1D1D' : '#FECACA',
      backgroundColor: theme.isDark ? '#4C1D1D' : '#FEF2F2',
    },
    dangerText: {
      color: '#DC2626',
      fontWeight: '600',
    },
    dangerSubtitle: {
      color: theme.isDark ? '#FCA5A5' : '#B91C1C',
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings')}</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity 
            style={styles.userInfo}
            onPress={() => navigation.navigate('ProfileEdit')}
          >
            <View style={styles.userInfoContent}>
              <Text style={styles.userName}>{user?.username || 'Set username'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons 
                name="moon" 
                size={20} 
                color={theme.colors.primary}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>{t('darkMode')}</Text>
                <Text style={styles.settingSubtitle}>
                  {theme.isDark ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={theme.isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.isDark ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.languagePickerContainer}>
            <View style={styles.languagePickerHeader}>
              <Ionicons 
                name="language" 
                size={20} 
                color={theme.colors.primary}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>{t('language')}</Text>
                <Text style={styles.settingSubtitle}>
                  Choose your preferred language
                </Text>
              </View>
            </View>
            <View style={styles.languagePickerContent}>
              <Picker
                selectedValue={language}
                onValueChange={(value) => setLanguage(value)}
                style={styles.picker}
              >
                <Picker.Item label="English" value="en" />
                <Picker.Item label="Español" value="es" />
                <Picker.Item label="Français" value="fr" />
              </Picker>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => navigation.navigate('CurrencySelection')}
          >
            <View style={styles.settingLeft}>
              <Ionicons 
                name="cash" 
                size={20} 
                color={theme.colors.primary}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>{t('defaultCurrency')}</Text>
                <Text style={styles.settingSubtitle}>{defaultCurrency}</Text>
              </View>
            </View>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => navigation.navigate('NotificationSettings')}
          >
            <View style={styles.settingLeft}>
              <Ionicons 
                name="notifications" 
                size={20} 
                color={theme.colors.primary}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>{t('notifications')}</Text>
                <Text style={styles.settingSubtitle}>Payment reminders & motivation</Text>
              </View>
            </View>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => navigation.navigate('DataExport')}
          >
            <View style={styles.settingLeft}>
              <Ionicons 
                name="download" 
                size={20} 
                color={theme.colors.primary}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Export My Data</Text>
                <Text style={styles.settingSubtitle}>Download all your personal data</Text>
              </View>
            </View>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => navigation.navigate('HelpSupport')}
          >
            <View style={styles.settingLeft}>
              <Ionicons 
                name="help-circle" 
                size={20} 
                color={theme.colors.primary}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>{t('helpSupport')}</Text>
                <Text style={styles.settingSubtitle}>{t('helpSupportDescription')}</Text>
              </View>
            </View>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons 
                name="information-circle" 
                size={20} 
                color={theme.colors.primary}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>About</Text>
                <Text style={styles.settingSubtitle}>Version 1.0.0</Text>
              </View>
            </View>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerZoneTitle]}>Danger Zone</Text>
          
          <TouchableOpacity 
            style={[styles.settingItem, styles.dangerItem]}
            onPress={() => navigation.navigate('DeleteAccount')}
          >
            <View style={styles.settingLeft}>
              <Ionicons 
                name="trash-outline" 
                size={20} 
                color="#DC2626"
                style={styles.settingIcon}
              />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, styles.dangerText]}>{t('deleteAccount')}</Text>
                <Text style={[styles.settingSubtitle, styles.dangerSubtitle]}>{t('deleteAccountDescription')}</Text>
              </View>
            </View>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color="#DC2626"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutText}>{t('signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};