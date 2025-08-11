import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';
import { dataService } from '../../services/dataService';

interface NotificationSettingsScreenProps {
  navigation: any;
}

interface NotificationSettings {
  paymentReminders: boolean;
  reminderDays: number;
  newsletterSubscribed: boolean;
}

export const NotificationSettingsScreen: React.FC<NotificationSettingsScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { user } = useAuth();
  
  const [settings, setSettings] = useState<NotificationSettings>({
    paymentReminders: true,
    reminderDays: 3,
    newsletterSubscribed: false,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await notificationService.getSettings();
      
      // Load newsletter subscription status
      let newsletterSubscribed = false;
      if (user?.id) {
        try {
          const newsletterStatus = await dataService.getNewsletterSubscriptionStatus(user.id);
          newsletterSubscribed = newsletterStatus?.subscribed || false;
        } catch (error) {
          console.error('Error loading newsletter status:', error);
        }
      }
      
      setSettings({
        ...currentSettings,
        newsletterSubscribed,
      });
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: any) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      
      if (key === 'newsletterSubscribed' && user?.id) {
        // Handle newsletter subscription/unsubscription
        if (value) {
          await dataService.subscribeToNewsletter(user.id, 'settings_toggle', {
            source: 'notification_settings',
            timestamp: new Date().toISOString()
          });
        } else {
          await dataService.unsubscribeFromNewsletter(user.id, 'settings_toggle');
        }
      } else {
        await notificationService.saveSettings({ [key]: value });
      }
    } catch (error) {
      console.error('Error updating notification setting:', error);
      Alert.alert('Error', 'Failed to update notification settings');
      // Revert the setting on error
      setSettings(settings);
    }
  };


  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      marginRight: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    section: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 16,
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    lastSettingItem: {
      borderBottomWidth: 0,
    },
    settingLabel: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: '500',
    },
    settingDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    settingValue: {
      marginLeft: 16,
    },
    pickerContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginLeft: 16,
      minWidth: 120,
      overflow: 'hidden',
    },
    picker: {
      color: theme.colors.text,
      height: 55,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    infoCard: {
      backgroundColor: theme.colors.primary + '15',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
    },
    infoText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Notification Settings</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.text }}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notification Settings</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Configure your payment reminder preferences to help you stay on track with your loan payments.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Reminders</Text>
          
          <View style={styles.settingItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Enable Payment Reminders</Text>
              <Text style={styles.settingDescription}>
                Get notified before your loan payments are due
              </Text>
            </View>
            <Switch
              value={settings.paymentReminders}
              onValueChange={(value) => updateSetting('paymentReminders', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            />
          </View>

          <View style={[styles.settingItem, styles.lastSettingItem]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Reminder Days Before</Text>
              <Text style={styles.settingDescription}>
                How many days before due date to remind you
              </Text>
            </View>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={settings.reminderDays}
                onValueChange={(value) => updateSetting('reminderDays', value)}
                style={styles.picker}
                enabled={settings.paymentReminders}
              >
                <Picker.Item label="1 day" value={1} />
                <Picker.Item label="2 days" value={2} />
                <Picker.Item label="3 days" value={3} />
                <Picker.Item label="5 days" value={5} />
                <Picker.Item label="7 days" value={7} />
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Communications</Text>
          
          <View style={[styles.settingItem, styles.lastSettingItem]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Newsletter Subscription</Text>
              <Text style={styles.settingDescription}>
                Receive financial tips and app updates
              </Text>
            </View>
            <Switch
              value={settings.newsletterSubscribed}
              onValueChange={(value) => updateSetting('newsletterSubscribed', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};