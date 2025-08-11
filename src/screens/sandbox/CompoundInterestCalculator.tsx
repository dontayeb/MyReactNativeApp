import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { formatNumberWithCommas, parseFormattedNumber } from '../../utils/numberFormatting';

interface CompoundInterestCalculatorProps {
  navigation: any;
}

export const CompoundInterestCalculator: React.FC<CompoundInterestCalculatorProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();

  const [formData, setFormData] = useState({
    principal: '',
    interestRate: '',
    timePeriod: '',
    compoundFrequency: '12',
    monthlyContribution: '',
  });

  const [results, setResults] = useState<{
    finalAmount: number;
    totalContributions: number;
    totalInterest: number;
    yearlyBreakdown: Array<{
      year: number;
      principal: number;
      interest: number;
      total: number;
    }>;
  } | null>(null);

  const compoundFrequencies = [
    { value: '1', label: 'Annually' },
    { value: '2', label: 'Semi-annually' },
    { value: '4', label: 'Quarterly' },
    { value: '12', label: 'Monthly' },
    { value: '365', label: 'Daily' },
  ];

  const handleInputChange = (field: string, value: string) => {
    // Format money fields with commas
    const moneyFields = ['principal', 'monthlyContribution'];
    if (moneyFields.includes(field)) {
      const formattedValue = formatNumberWithCommas(value);
      setFormData(prev => ({ ...prev, [field]: formattedValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const calculateCompoundInterest = () => {
    const P = parseFormattedNumber(formData.principal);
    const r = parseFloat(formData.interestRate) / 100;
    const t = parseFloat(formData.timePeriod);
    const n = parseFloat(formData.compoundFrequency);
    const PMT = parseFormattedNumber(formData.monthlyContribution) || 0;

    if (!P || !r || !t || !n) return;

    let yearlyBreakdown = [];
    let currentPrincipal = P;
    let totalContributions = P;

    for (let year = 1; year <= t; year++) {
      // Add monthly contributions for the year
      const yearlyContributions = PMT * 12;
      totalContributions += yearlyContributions;

      // Calculate compound interest for the year
      // Using the formula for compound interest with regular contributions
      const ratePerPeriod = r / n;
      const periodsPerYear = n;
      
      // Interest on existing principal
      const principalGrowth = currentPrincipal * Math.pow(1 + ratePerPeriod, periodsPerYear);
      
      // Interest on contributions throughout the year
      let contributionGrowth = 0;
      if (PMT > 0) {
        const monthlyRate = r / 12;
        for (let month = 1; month <= 12; month++) {
          contributionGrowth += PMT * Math.pow(1 + monthlyRate, 12 - month + 1);
        }
      }

      const yearEndAmount = principalGrowth + contributionGrowth;
      const yearInterest = yearEndAmount - currentPrincipal - yearlyContributions;

      yearlyBreakdown.push({
        year,
        principal: currentPrincipal + yearlyContributions,
        interest: yearInterest,
        total: yearEndAmount,
      });

      currentPrincipal = yearEndAmount;
    }

    const finalAmount = currentPrincipal;
    const totalInterest = finalAmount - totalContributions;

    setResults({
      finalAmount,
      totalContributions,
      totalInterest,
      yearlyBreakdown,
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
    pickerContainer: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      overflow: 'hidden',
    },
    picker: {
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
    },
    resultValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
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
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: '600',
      color: 'white',
    },
    breakdownCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    yearRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    yearLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },
    yearValue: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      flex: 1,
      textAlign: 'right',
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
        <Text style={styles.title}>Compound Interest Calculator</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formGroup}>
          <Text style={styles.label}>Initial Investment</Text>
          <TextInput
            style={styles.input}
            value={formData.principal}
            onChangeText={(value) => handleInputChange('principal', value)}
            placeholder="Enter initial amount"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Annual Interest Rate (%)</Text>
          <TextInput
            style={styles.input}
            value={formData.interestRate}
            onChangeText={(value) => handleInputChange('interestRate', value)}
            placeholder="Enter annual interest rate"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Time Period (Years)</Text>
          <TextInput
            style={styles.input}
            value={formData.timePeriod}
            onChangeText={(value) => handleInputChange('timePeriod', value)}
            placeholder="Enter number of years"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Compound Frequency</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.compoundFrequency}
              onValueChange={(value) => handleInputChange('compoundFrequency', value)}
              style={styles.picker}
            >
              {compoundFrequencies.map((freq) => (
                <Picker.Item
                  key={freq.value}
                  label={freq.label}
                  value={freq.value}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Monthly Contribution (Optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.monthlyContribution}
            onChangeText={(value) => handleInputChange('monthlyContribution', value)}
            placeholder="Enter monthly contribution"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
          />
          <Text style={styles.helpText}>Additional amount invested each month</Text>
        </View>

        <TouchableOpacity style={styles.calculateButton} onPress={calculateCompoundInterest}>
          <Text style={styles.calculateButtonText}>Calculate Growth</Text>
        </TouchableOpacity>

        {results && (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Investment Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Final Amount:</Text>
                <Text style={styles.summaryValue}>{formatCurrency(results.finalAmount)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Contributions:</Text>
                <Text style={styles.summaryValue}>{formatCurrency(results.totalContributions)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Interest Earned:</Text>
                <Text style={styles.summaryValue}>{formatCurrency(results.totalInterest)}</Text>
              </View>
            </View>

            <View style={styles.breakdownCard}>
              <Text style={styles.resultsTitle}>Year-by-Year Breakdown</Text>
              <View style={styles.yearRow}>
                <Text style={styles.yearLabel}>Year</Text>
                <Text style={styles.yearValue}>Principal</Text>
                <Text style={styles.yearValue}>Interest</Text>
                <Text style={styles.yearValue}>Total</Text>
              </View>
              {results.yearlyBreakdown.slice(0, 10).map((year) => (
                <View key={year.year} style={styles.yearRow}>
                  <Text style={styles.yearLabel}>{year.year}</Text>
                  <Text style={styles.yearValue}>{formatCurrency(year.principal).replace('$', '$')}</Text>
                  <Text style={styles.yearValue}>{formatCurrency(year.interest).replace('$', '$')}</Text>
                  <Text style={styles.yearValue}>{formatCurrency(year.total).replace('$', '$')}</Text>
                </View>
              ))}
              {results.yearlyBreakdown.length > 10 && (
                <Text style={styles.helpText}>Showing first 10 years...</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};