import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { Ionicons } from '@expo/vector-icons';

interface HelpSupportScreenProps {
  navigation: any;
}

interface FAQItem {
  question: string;
  answer: string;
}

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const supportEmail = 'support@yourfinancialapp.com'; // Replace with your actual support email

  const faqItems: FAQItem[] = [
    {
      question: t('faqHowToAddAsset'),
      answer: t('faqHowToAddAssetAnswer'),
    },
    {
      question: t('faqHowToAddLoan'),
      answer: t('faqHowToAddLoanAnswer'),
    },
    {
      question: t('faqHowToChangeLanguage'),
      answer: t('faqHowToChangeLanguageAnswer'),
    },
    {
      question: t('faqHowToChangeCurrency'),
      answer: t('faqHowToChangeCurrencyAnswer'),
    },
    {
      question: t('faqWhatIsSurvivalBudget'),
      answer: t('faqWhatIsSurvivalBudgetAnswer'),
    },
    {
      question: t('faqHowToDeleteAsset'),
      answer: t('faqHowToDeleteAssetAnswer'),
    },
  ];

  const handleEmailSupport = async () => {
    const subject = encodeURIComponent(t('helpEmailSubject'));
    const body = encodeURIComponent(`

Please describe your issue or question:

---
App Version: 1.0.0
Device: ${require('react-native').Platform.OS}
---
    `);
    
    const emailUrl = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
    
    try {
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);
      } else {
        Alert.alert(
          'Email Not Available',
          `Please send an email to: ${supportEmail}`,
          [
            {
              text: 'Copy Email',
              onPress: () => {
                // Note: Copying to clipboard would require expo-clipboard
                Alert.alert('Email Address', supportEmail);
              }
            },
            { text: 'OK' }
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        `Unable to open email client. Please contact us at: ${supportEmail}`
      );
    }
  };

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

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
    },
    backButton: {
      marginRight: 16,
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
    description: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginBottom: 24,
      lineHeight: 24,
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
    contactCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 16,
    },
    contactHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    contactIcon: {
      marginRight: 12,
    },
    contactTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    contactDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 16,
      lineHeight: 20,
    },
    emailButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emailButtonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 8,
    },
    faqItem: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    faqQuestion: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    faqQuestionText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
      marginRight: 12,
    },
    faqAnswer: {
      padding: 16,
      paddingTop: 0,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    faqAnswerText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    emailAddress: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: '500',
      marginBottom: 8,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('helpSupport')}</Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Text style={styles.description}>{t('helpSupportDescription')}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('contactSupport')}</Text>
          
          <View style={styles.contactCard}>
            <View style={styles.contactHeader}>
              <Ionicons 
                name="mail" 
                size={24} 
                color={theme.colors.primary}
                style={styles.contactIcon}
              />
              <Text style={styles.contactTitle}>{t('emailSupport')}</Text>
            </View>
            
            <Text style={styles.emailAddress}>{supportEmail}</Text>
            <Text style={styles.contactDescription}>
              Get personalized help with your account, technical issues, or general questions about the app.
            </Text>
            
            <TouchableOpacity style={styles.emailButton} onPress={handleEmailSupport}>
              <Ionicons name="send" size={16} color="white" />
              <Text style={styles.emailButtonText}>{t('sendEmail')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('frequentlyAskedQuestions')}</Text>
          
          {faqItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.faqItem}
              onPress={() => toggleFAQ(index)}
              activeOpacity={0.7}
            >
              <View style={styles.faqQuestion}>
                <Text style={styles.faqQuestionText}>{item.question}</Text>
                <Ionicons 
                  name={expandedFAQ === index ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={theme.colors.textSecondary} 
                />
              </View>
              
              {expandedFAQ === index && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{item.answer}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};