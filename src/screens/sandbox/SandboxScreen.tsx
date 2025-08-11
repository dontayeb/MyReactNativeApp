import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { Ionicons } from '@expo/vector-icons';

interface SandboxScreenProps {
  navigation?: any;
}

export const SandboxScreen: React.FC<SandboxScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();

  const calculators = [
    {
      id: 'loanPayoff',
      title: 'Early Loan Payoff Calculator',
      subtitle: 'See how extra payments can save you money',
      icon: 'card',
      screen: 'EarlyLoanPayoff',
    },
    {
      id: 'compoundInterest',
      title: 'Compound Interest Calculator',
      subtitle: 'Watch your investments grow over time',
      icon: 'trending-up',
      screen: 'CompoundInterest',
    },
    {
      id: 'retirement',
      title: 'Retirement Plan Calculator',
      subtitle: 'Plan for your financial future',
      icon: 'time',
      screen: 'RetirementPlan',
    },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      padding: 24,
      paddingTop: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 10,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      fontWeight: '500',
      letterSpacing: 0.2,
      lineHeight: 22,
    },
    content: {
      flex: 1,
      padding: 24,
    },
    calculatorCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 18,
      borderWidth: 0,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 6,
    },
    calculatorHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    calculatorIcon: {
      marginRight: 16,
    },
    calculatorTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      flex: 1,
      letterSpacing: -0.5,
    },
    calculatorSubtitle: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      lineHeight: 22,
      fontWeight: '500',
      letterSpacing: 0.1,
    },
    arrowIcon: {
      marginLeft: 8,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Financial Calculators</Text>
        <Text style={styles.subtitle}>Powerful tools to help you make informed financial decisions</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {calculators.map((calculator) => (
          <TouchableOpacity
            key={calculator.id}
            style={styles.calculatorCard}
            onPress={() => navigation?.navigate(calculator.screen)}
          >
            <View style={styles.calculatorHeader}>
              <Ionicons
                name={calculator.icon as any}
                size={24}
                color={theme.colors.primary}
                style={styles.calculatorIcon}
              />
              <Text style={styles.calculatorTitle}>{calculator.title}</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.arrowIcon}
              />
            </View>
            <Text style={styles.calculatorSubtitle}>{calculator.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};