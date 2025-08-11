import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { Ionicons } from '@expo/vector-icons';

interface TermsPrivacyScreenProps {
  navigation: any;
}

export const TermsPrivacyScreen: React.FC<TermsPrivacyScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      paddingTop: 10,
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
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 16,
    },
    sectionText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 22,
      marginBottom: 16,
    },
    subsectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: 20,
      marginBottom: 12,
    },
    listItem: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 22,
      marginBottom: 8,
      paddingLeft: 16,
    },
    lastUpdated: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
  });

  const currentDate = new Date().toLocaleDateString();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('termsAndPrivacy')}</Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('termsOfService')}</Text>
          
          <Text style={styles.sectionText}>
            Welcome to our Financial Management App. By using our service, you agree to these terms.
          </Text>

          <Text style={styles.subsectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.sectionText}>
            By accessing and using this financial management application, you accept and agree to be bound by the terms and provision of this agreement.
          </Text>

          <Text style={styles.subsectionTitle}>2. Use of the Service</Text>
          <Text style={styles.sectionText}>
            Our app helps you track your personal finances including assets, loans, and financial calculations. You are responsible for:
          </Text>
          <Text style={styles.listItem}>• Providing accurate financial information</Text>
          <Text style={styles.listItem}>• Keeping your login credentials secure</Text>
          <Text style={styles.listItem}>• Using the app for personal, non-commercial purposes</Text>
          <Text style={styles.listItem}>• Complying with applicable laws and regulations</Text>

          <Text style={styles.subsectionTitle}>3. Data Security</Text>
          <Text style={styles.sectionText}>
            We use industry-standard security measures to protect your financial data. However, no system is 100% secure, and you use the service at your own risk.
          </Text>

          <Text style={styles.subsectionTitle}>4. Limitation of Liability</Text>
          <Text style={styles.sectionText}>
            This app is for informational purposes only and does not constitute financial advice. We are not responsible for financial decisions made based on app calculations or data.
          </Text>

          <Text style={styles.subsectionTitle}>5. Account Termination</Text>
          <Text style={styles.sectionText}>
            You may terminate your account at any time. We reserve the right to suspend or terminate accounts that violate these terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('privacyPolicy')}</Text>
          
          <Text style={styles.sectionText}>
            Your privacy is important to us. This policy explains how we collect, use, and protect your information.
          </Text>

          <Text style={styles.subsectionTitle}>Information We Collect</Text>
          <Text style={styles.sectionText}>
            We collect information you provide when you:
          </Text>
          <Text style={styles.listItem}>• Create an account (email, username)</Text>
          <Text style={styles.listItem}>• Add financial data (assets, loans, budget information)</Text>
          <Text style={styles.listItem}>• Use app features and settings</Text>
          <Text style={styles.listItem}>• Contact our support team</Text>

          <Text style={styles.subsectionTitle}>How We Use Your Information</Text>
          <Text style={styles.sectionText}>
            Your information is used to:
          </Text>
          <Text style={styles.listItem}>• Provide and maintain the service</Text>
          <Text style={styles.listItem}>• Calculate financial metrics and projections</Text>
          <Text style={styles.listItem}>• Send notifications and reminders</Text>
          <Text style={styles.listItem}>• Improve our service and user experience</Text>
          <Text style={styles.listItem}>• Respond to support requests</Text>

          <Text style={styles.subsectionTitle}>Data Protection</Text>
          <Text style={styles.sectionText}>
            We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
          </Text>

          <Text style={styles.subsectionTitle}>Data Sharing</Text>
          <Text style={styles.sectionText}>
            We do not sell, trade, or share your personal financial information with third parties except as required by law or to provide the service (e.g., cloud hosting).
          </Text>

          <Text style={styles.subsectionTitle}>Your Rights</Text>
          <Text style={styles.sectionText}>
            You have the right to:
          </Text>
          <Text style={styles.listItem}>• Access and download your data</Text>
          <Text style={styles.listItem}>• Correct inaccurate information</Text>
          <Text style={styles.listItem}>• Delete your account and data</Text>
          <Text style={styles.listItem}>• Contact us about privacy concerns</Text>

          <Text style={styles.subsectionTitle}>Contact Information</Text>
          <Text style={styles.sectionText}>
            For questions about these terms or privacy policy, contact us at: support@yourfinancialapp.com
          </Text>
        </View>

        <Text style={styles.lastUpdated}>
          {t('lastUpdated')}: {currentDate}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};