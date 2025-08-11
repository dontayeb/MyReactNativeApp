import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { Ionicons } from '@expo/vector-icons';
import { formatNumberWithCommas, parseFormattedNumber } from '../../utils/numberFormatting';

interface RetirementPlanCalculatorProps {
  navigation: any;
}

export const RetirementPlanCalculator: React.FC<RetirementPlanCalculatorProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();

  const [formData, setFormData] = useState({
    currentAge: '',
    retirementAge: '',
    currentSavings: '',
    monthlyContribution: '',
    expectedReturn: '',
    retirementGoal: '',
    inflationRate: '2.5',
  });

  const [results, setResults] = useState<{
    yearsToRetirement: number;
    totalContributions: number;
    projectedSavings: number;
    monthlyIncomeAt4Percent: number;
    shortfall: number;
    recommendedMonthly: number;
    inflationAdjustedGoal: number;
  } | null>(null);

  const handleInputChange = (field: string, value: string) => {
    // Format money fields with commas
    const moneyFields = ['currentSavings', 'monthlyContribution', 'retirementGoal'];
    if (moneyFields.includes(field)) {
      const formattedValue = formatNumberWithCommas(value);
      setFormData(prev => ({ ...prev, [field]: formattedValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const calculateRetirement = () => {
    const currentAge = parseFloat(formData.currentAge);
    const retirementAge = parseFloat(formData.retirementAge);
    const currentSavings = parseFormattedNumber(formData.currentSavings) || 0;
    const monthlyContribution = parseFormattedNumber(formData.monthlyContribution) || 0;
    const annualReturn = parseFloat(formData.expectedReturn) / 100;
    const retirementGoal = parseFormattedNumber(formData.retirementGoal) || 0;
    const inflationRate = parseFloat(formData.inflationRate) / 100;

    if (!currentAge || !retirementAge || !annualReturn) return;

    const yearsToRetirement = retirementAge - currentAge;
    const monthlyReturn = annualReturn / 12;
    const totalMonths = yearsToRetirement * 12;

    // Future value of current savings
    const futureValueCurrent = currentSavings * Math.pow(1 + annualReturn, yearsToRetirement);

    // Future value of monthly contributions
    let futureValueContributions = 0;
    if (monthlyContribution > 0) {
      futureValueContributions = monthlyContribution * 
        ((Math.pow(1 + monthlyReturn, totalMonths) - 1) / monthlyReturn);
    }

    const projectedSavings = futureValueCurrent + futureValueContributions;
    const totalContributions = currentSavings + (monthlyContribution * totalMonths);

    // Adjust retirement goal for inflation
    const inflationAdjustedGoal = retirementGoal * Math.pow(1 + inflationRate, yearsToRetirement);

    // Calculate monthly income using 4% rule
    const monthlyIncomeAt4Percent = (projectedSavings * 0.04) / 12;

    // Calculate shortfall
    const shortfall = Math.max(0, inflationAdjustedGoal - projectedSavings);

    // Calculate recommended monthly contribution to reach goal
    let recommendedMonthly = 0;
    if (inflationAdjustedGoal > futureValueCurrent) {
      const neededFromContributions = inflationAdjustedGoal - futureValueCurrent;
      if (totalMonths > 0) {
        recommendedMonthly = neededFromContributions / 
          ((Math.pow(1 + monthlyReturn, totalMonths) - 1) / monthlyReturn);
      }
    }

    setResults({
      yearsToRetirement,
      totalContributions,
      projectedSavings,
      monthlyIncomeAt4Percent,
      shortfall,
      recommendedMonthly: Math.max(0, recommendedMonthly),
      inflationAdjustedGoal,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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
    formGroup: {
      marginBottom: 20,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    halfWidth: {
      width: '48%',
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme.colors.text,
    },
    calculateButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginBottom: 20,
    },
    calculateButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    resultsCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    resultsTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 12,
    },
    resultRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    resultLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    resultValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
      textAlign: 'right',
    },
    summaryCard: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    summaryTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: 'white',
      marginBottom: 12,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    summaryLabel: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
      flex: 1,
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: '600',
      color: 'white',
      flex: 1,
      textAlign: 'right',
    },
    warningCard: {
      backgroundColor: '#FEF3C7',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#F59E0B',
    },
    warningTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#92400E',
      marginBottom: 8,
    },
    warningText: {
      fontSize: 14,
      color: '#92400E',
    },
    successCard: {
      backgroundColor: '#D1FAE5',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#10B981',
    },
    successTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#065F46',
      marginBottom: 8,
    },
    successText: {
      fontSize: 14,
      color: '#065F46',
    },
    helpText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
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
        <Text style={styles.title}>Retirement Plan Calculator</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.row}>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>Current Age</Text>
            <TextInput
              style={styles.input}
              value={formData.currentAge}
              onChangeText={(value) => handleInputChange('currentAge', value)}
              placeholder="25"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>Retirement Age</Text>
            <TextInput
              style={styles.input}
              value={formData.retirementAge}
              onChangeText={(value) => handleInputChange('retirementAge', value)}
              placeholder="65"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Current Retirement Savings</Text>
          <TextInput
            style={styles.input}
            value={formData.currentSavings}
            onChangeText={(value) => handleInputChange('currentSavings', value)}
            placeholder="Enter current savings amount"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Monthly Contribution</Text>
          <TextInput
            style={styles.input}
            value={formData.monthlyContribution}
            onChangeText={(value) => handleInputChange('monthlyContribution', value)}
            placeholder="Enter monthly savings amount"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>Expected Return (%)</Text>
            <TextInput
              style={styles.input}
              value={formData.expectedReturn}
              onChangeText={(value) => handleInputChange('expectedReturn', value)}
              placeholder="7"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
            <Text style={styles.helpText}>Annual return rate</Text>
          </View>

          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>Inflation Rate (%)</Text>
            <TextInput
              style={styles.input}
              value={formData.inflationRate}
              onChangeText={(value) => handleInputChange('inflationRate', value)}
              placeholder="2.5"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
            <Text style={styles.helpText}>Expected inflation</Text>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Retirement Goal (Optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.retirementGoal}
            onChangeText={(value) => handleInputChange('retirementGoal', value)}
            placeholder="Enter target retirement amount"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
          />
          <Text style={styles.helpText}>How much you want to have saved at retirement</Text>
        </View>

        <TouchableOpacity style={styles.calculateButton} onPress={calculateRetirement}>
          <Text style={styles.calculateButtonText}>Calculate Retirement Plan</Text>
        </TouchableOpacity>

        {results && (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Retirement Projection</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Years to Retirement:</Text>
                <Text style={styles.summaryValue}>{results.yearsToRetirement} years</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Projected Savings:</Text>
                <Text style={styles.summaryValue}>{formatCurrency(results.projectedSavings)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Monthly Income (4% rule):</Text>
                <Text style={styles.summaryValue}>{formatCurrency(results.monthlyIncomeAt4Percent)}</Text>
              </View>
            </View>

            <View style={styles.resultsCard}>
              <Text style={styles.resultsTitle}>Contribution Summary</Text>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Total Contributions:</Text>
                <Text style={styles.resultValue}>{formatCurrency(results.totalContributions)}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Investment Growth:</Text>
                <Text style={styles.resultValue}>
                  {formatCurrency(results.projectedSavings - results.totalContributions)}
                </Text>
              </View>
            </View>

            {formData.retirementGoal && (
              <>
                {results.shortfall > 0 ? (
                  <View style={styles.warningCard}>
                    <Text style={styles.warningTitle}>Shortfall Alert</Text>
                    <Text style={styles.warningText}>
                      You're projected to fall short of your goal by {formatCurrency(results.shortfall)}. 
                      Consider increasing your monthly contribution to {formatCurrency(results.recommendedMonthly)} 
                      to reach your inflation-adjusted goal of {formatCurrency(results.inflationAdjustedGoal)}.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.successCard}>
                    <Text style={styles.successTitle}>On Track!</Text>
                    <Text style={styles.successText}>
                      You're projected to exceed your retirement goal. Your inflation-adjusted target is {formatCurrency(results.inflationAdjustedGoal)}, 
                      and you're on track to save {formatCurrency(results.projectedSavings)}.
                    </Text>
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};