import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { formatNumberWithCommas, parseFormattedNumber } from '../../utils/numberFormatting';
import { dataService } from '../../services/dataService';

interface EarlyLoanPayoffCalculatorProps {
  navigation: any;
}

export const EarlyLoanPayoffCalculator: React.FC<EarlyLoanPayoffCalculatorProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { user } = useAuth();

  const [inputMode, setInputMode] = useState<'manual' | 'select'>('select');
  const [availableLoans, setAvailableLoans] = useState<any[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');

  const [formData, setFormData] = useState({
    loanAmount: '',
    interestRate: '',
    loanTerm: '',
    extraPayment: '',
    extraYearlyPayment: '',
    lumpSumPayment: '',
  });

  const [results, setResults] = useState<{
    originalPayoff: { years: number; months: number; totalInterest: number };
    newPayoff: { years: number; months: number; totalInterest: number };
    savings: { time: number; interest: number };
  } | null>(null);

  useEffect(() => {
    loadAmortizedLoans();
  }, [user?.id]);

  const loadAmortizedLoans = async () => {
    if (!user?.id) return;
    
    try {
      const loans = await dataService.getLoans(user.id);
      const amortizedLoans = loans.filter(loan => loan.loan_type === 'amortized');
      setAvailableLoans(amortizedLoans);
    } catch (error) {
      console.error('Error loading loans:', error);
    }
  };

  const handleLoanSelection = (loanId: string) => {
    setSelectedLoanId(loanId);
    const selectedLoan = availableLoans.find(loan => loan.id === loanId);
    
    if (selectedLoan) {
      // Calculate remaining balance and term
      const startDate = new Date(selectedLoan.start_date);
      const currentDate = new Date();
      
      // Calculate months elapsed
      let monthsElapsed = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                          (currentDate.getMonth() - startDate.getMonth());
      
      if (currentDate.getDate() < startDate.getDate()) {
        monthsElapsed--;
      }
      
      monthsElapsed = Math.max(0, monthsElapsed);
      const remainingTermMonths = Math.max(0, selectedLoan.term_months - monthsElapsed);
      const remainingTermYears = remainingTermMonths / 12;
      
      // Calculate current balance
      const principal = selectedLoan.principal;
      const monthlyRate = (selectedLoan.interest_rate / 100) / 12;
      const monthlyPayment = selectedLoan.monthly_payment || 
        (principal * monthlyRate * Math.pow(1 + monthlyRate, selectedLoan.term_months)) /
        (Math.pow(1 + monthlyRate, selectedLoan.term_months) - 1);
      
      let currentBalance = principal;
      for (let i = 0; i < monthsElapsed && currentBalance > 0.01; i++) {
        const interestPayment = currentBalance * monthlyRate;
        const principalPayment = Math.min(monthlyPayment - interestPayment, currentBalance);
        currentBalance -= principalPayment;
      }
      
      setFormData({
        loanAmount: Math.max(0, currentBalance).toFixed(2),
        interestRate: selectedLoan.interest_rate.toString(),
        loanTerm: remainingTermYears.toFixed(1),
        extraPayment: '',
        extraYearlyPayment: '',
        lumpSumPayment: '',
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    // Format money fields with commas
    const moneyFields = ['loanAmount', 'extraPayment', 'extraYearlyPayment', 'lumpSumPayment'];
    if (moneyFields.includes(field)) {
      const formattedValue = formatNumberWithCommas(value);
      setFormData(prev => ({ ...prev, [field]: formattedValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const calculatePayoff = () => {
    const principal = parseFormattedNumber(formData.loanAmount);
    const annualRate = parseFloat(formData.interestRate) / 100;
    const termYears = parseFloat(formData.loanTerm);
    const extraMonthlyPayment = parseFormattedNumber(formData.extraPayment) || 0;
    const extraYearlyPayment = parseFormattedNumber(formData.extraYearlyPayment) || 0;
    const lumpSumPayment = parseFormattedNumber(formData.lumpSumPayment) || 0;

    if (!principal || !annualRate || !termYears) return;

    const monthlyRate = annualRate / 12;
    const totalPayments = termYears * 12;

    // Original loan calculation
    const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
                          (Math.pow(1 + monthlyRate, totalPayments) - 1);

    const originalTotalInterest = (monthlyPayment * totalPayments) - principal;

    // With extra payments calculation
    let balance = principal;
    let month = 0;
    let totalInterestPaid = 0;

    // Apply lump sum payment immediately
    balance -= lumpSumPayment;
    if (balance < 0) balance = 0;

    while (balance > 0.01 && month < totalPayments * 2) { // Safety limit
      month++;
      const interestPayment = balance * monthlyRate;
      
      // Start with regular monthly payment + extra monthly payment
      let totalPaymentThisMonth = monthlyPayment + extraMonthlyPayment;
      
      // Add yearly payment on January (month 1, 13, 25, etc.) or first month if starting mid-year
      if (month % 12 === 1) {
        totalPaymentThisMonth += extraYearlyPayment;
      }
      
      const principalPayment = totalPaymentThisMonth - interestPayment;
      
      totalInterestPaid += interestPayment;
      balance -= principalPayment;

      if (balance < 0) balance = 0;
    }

    const newYears = Math.floor(month / 12);
    const newMonths = month % 12;

    setResults({
      originalPayoff: {
        years: Math.floor(totalPayments / 12),
        months: totalPayments % 12,
        totalInterest: originalTotalInterest,
      },
      newPayoff: {
        years: newYears,
        months: newMonths,
        totalInterest: totalInterestPaid,
      },
      savings: {
        time: totalPayments - month,
        interest: originalTotalInterest - totalInterestPaid,
      },
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
    savingsCard: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      padding: 16,
    },
    savingsTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: 'white',
      marginBottom: 12,
    },
    savingsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    savingsLabel: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    savingsValue: {
      fontSize: 14,
      fontWeight: '600',
      color: 'white',
    },
    helpText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    modeSelector: {
      marginBottom: 24,
    },
    modeSelectorTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    modeButtons: {
      flexDirection: 'row',
      backgroundColor: theme.colors.border,
      borderRadius: 8,
      padding: 4,
    },
    modeButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      alignItems: 'center',
    },
    modeButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    modeButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    modeButtonTextActive: {
      color: 'white',
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
        <Text style={styles.title}>Early Loan Payoff Calculator</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.modeSelector}>
          <Text style={styles.modeSelectorTitle}>Choose Input Method</Text>
          <View style={styles.modeButtons}>
            <TouchableOpacity 
              style={[styles.modeButton, inputMode === 'select' && styles.modeButtonActive]}
              onPress={() => setInputMode('select')}
            >
              <Text style={[styles.modeButtonText, inputMode === 'select' && styles.modeButtonTextActive]}>
                Select Existing Loan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modeButton, inputMode === 'manual' && styles.modeButtonActive]}
              onPress={() => setInputMode('manual')}
            >
              <Text style={[styles.modeButtonText, inputMode === 'manual' && styles.modeButtonTextActive]}>
                Manual Entry
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {inputMode === 'select' && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Select Loan</Text>
            {availableLoans.length > 0 ? (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedLoanId}
                  onValueChange={handleLoanSelection}
                  style={styles.picker}
                >
                  <Picker.Item label="Choose a loan..." value="" />
                  {availableLoans.map((loan) => (
                    <Picker.Item
                      key={loan.id}
                      label={`${loan.name} - ${loan.interest_rate}% APR`}
                      value={loan.id}
                    />
                  ))}
                </Picker>
              </View>
            ) : (
              <View style={styles.input}>
                <Text style={{ color: theme.colors.textSecondary }}>
                  No amortized loans found. Add a loan or use manual entry.
                </Text>
              </View>
            )}
            <Text style={styles.helpText}>
              Select from your existing amortized loans to auto-fill the details
            </Text>
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Current Loan Balance</Text>
          <TextInput
            style={styles.input}
            value={formData.loanAmount}
            onChangeText={(value) => handleInputChange('loanAmount', value)}
            placeholder="Enter loan amount"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
            editable={inputMode === 'manual' || selectedLoanId !== ''}
          />
          {inputMode === 'select' && (
            <Text style={styles.helpText}>
              Auto-calculated based on selected loan's current balance
            </Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Interest Rate (%)</Text>
          <TextInput
            style={styles.input}
            value={formData.interestRate}
            onChangeText={(value) => handleInputChange('interestRate', value)}
            placeholder="Enter annual interest rate"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
            editable={inputMode === 'manual' || selectedLoanId !== ''}
          />
          {inputMode === 'select' && (
            <Text style={styles.helpText}>
              Auto-filled from selected loan
            </Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Remaining Loan Term (Years)</Text>
          <TextInput
            style={styles.input}
            value={formData.loanTerm}
            onChangeText={(value) => handleInputChange('loanTerm', value)}
            placeholder="Enter remaining years"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
            editable={inputMode === 'manual' || selectedLoanId !== ''}
          />
          {inputMode === 'select' && (
            <Text style={styles.helpText}>
              Auto-calculated based on selected loan's remaining term
            </Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Extra Monthly Payment</Text>
          <TextInput
            style={styles.input}
            value={formData.extraPayment}
            onChangeText={(value) => handleInputChange('extraPayment', value)}
            placeholder="Enter extra monthly payment"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
          />
          <Text style={styles.helpText}>Additional amount you plan to pay each month</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Extra Yearly Payment</Text>
          <TextInput
            style={styles.input}
            value={formData.extraYearlyPayment}
            onChangeText={(value) => handleInputChange('extraYearlyPayment', value)}
            placeholder="Enter yearly bonus payment"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
          />
          <Text style={styles.helpText}>Annual bonus or tax refund applied to loan (e.g., yearly bonus)</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Lump Sum Payment</Text>
          <TextInput
            style={styles.input}
            value={formData.lumpSumPayment}
            onChangeText={(value) => handleInputChange('lumpSumPayment', value)}
            placeholder="Enter one-time payment"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
          />
          <Text style={styles.helpText}>One-time payment applied immediately to principal</Text>
        </View>

        <TouchableOpacity style={styles.calculateButton} onPress={calculatePayoff}>
          <Text style={styles.calculateButtonText}>Calculate Payoff</Text>
        </TouchableOpacity>

        {results && (
          <>
            <View style={styles.resultsCard}>
              <Text style={styles.resultsTitle}>Original Loan Schedule</Text>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Payoff Time:</Text>
                <Text style={styles.resultValue}>
                  {results.originalPayoff.years} years {results.originalPayoff.months} months
                </Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Total Interest:</Text>
                <Text style={styles.resultValue}>{formatCurrency(results.originalPayoff.totalInterest)}</Text>
              </View>
            </View>

            <View style={styles.resultsCard}>
              <Text style={styles.resultsTitle}>With Extra Payments</Text>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Payoff Time:</Text>
                <Text style={styles.resultValue}>
                  {results.newPayoff.years} years {results.newPayoff.months} months
                </Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Total Interest:</Text>
                <Text style={styles.resultValue}>{formatCurrency(results.newPayoff.totalInterest)}</Text>
              </View>
            </View>

            <View style={styles.savingsCard}>
              <Text style={styles.savingsTitle}>Your Savings</Text>
              <View style={styles.savingsRow}>
                <Text style={styles.savingsLabel}>Time Saved:</Text>
                <Text style={styles.savingsValue}>
                  {Math.floor(results.savings.time / 12)} years {results.savings.time % 12} months
                </Text>
              </View>
              <View style={styles.savingsRow}>
                <Text style={styles.savingsLabel}>Interest Saved:</Text>
                <Text style={styles.savingsValue}>{formatCurrency(results.savings.interest)}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};