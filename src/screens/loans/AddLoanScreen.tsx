import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatNumberWithCommas, parseFormattedNumber, isValidNumber } from '../../utils/numberFormatting';
import { CURRENCIES } from '../../constants/currencies';
import { dataService } from '../../services/dataService';
import { notificationService } from '../../services/notificationService';
import { formatCurrencyAmount } from '../../utils/currencyUtils';

interface AddLoanScreenProps {
  navigation: any;
  route?: any;
}

export const AddLoanScreen: React.FC<AddLoanScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { defaultCurrency } = useCurrency();
  const { user } = useAuth();
  
  // Check if we're editing an existing loan
  const editingLoan = route?.params?.loan;
  const isEditing = !!editingLoan;

  const [formData, setFormData] = useState({
    lender: '',
    type: 'amortized',
    // Amortized loan fields
    amount: '',
    loanTerm: '',
    startDate: '',
    // Credit card fields
    creditLimit: '',
    currentBalance: '',
    minimumPaymentPercentage: '',
    dueDate: '',
    statementDate: '',
    // Common fields
    interestRate: '',
    currency: defaultCurrency,
  });

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showStatementDatePicker, setShowStatementDatePicker] = useState(false);
  const [startDateValue, setStartDateValue] = useState(new Date());
  const [dueDateValue, setDueDateValue] = useState(new Date());
  const [statementDateValue, setStatementDateValue] = useState(new Date());

  const loanTypes = [
    { 
      value: 'amortized', 
      label: 'Amortized Loan',
      description: 'Fixed payments - mortgage, auto loan, personal loan, student loan'
    },
    { 
      value: 'credit_card', 
      label: 'Credit Cards',
      description: 'Revolving credit with minimum payment requirements'
    },
    { 
      value: 'line_of_credit', 
      label: 'Line of Credit',
      description: 'HELOC, PLOC - variable access to credit funds'
    },
  ];

  const currencies = CURRENCIES.map(curr => ({
    value: curr.code,
    label: `${curr.code} - ${curr.name}`
  }));

  // Populate form when editing an existing loan
  useEffect(() => {
    if (isEditing && editingLoan) {
      const loan = editingLoan;
      setFormData({
        lender: loan.lender || '',
        type: loan.type || 'amortized',
        amount: formatNumberWithCommas(loan.amount?.toString() || ''),
        loanTerm: loan.loanTerm?.toString() || '',
        startDate: loan.startDate || '',
        creditLimit: formatNumberWithCommas(loan.creditLimit?.toString() || ''),
        currentBalance: formatNumberWithCommas(loan.currentBalance?.toString() || ''),
        minimumPaymentPercentage: loan.minimumPaymentPercentage?.toString() || '',
        dueDate: loan.dueDate || '',
        statementDate: loan.statementDate || '',
        interestRate: loan.interestRate?.toString() || '',
        currency: loan.currency || defaultCurrency,
      });
      
      // Set date values for pickers
      if (loan.startDate) {
        setStartDateValue(new Date(loan.startDate));
      }
      if (loan.dueDate) {
        setDueDateValue(new Date(loan.dueDate));
      }
      if (loan.statementDate) {
        setStatementDateValue(new Date(loan.statementDate));
      }
    }
  }, [isEditing, editingLoan, defaultCurrency]);

  const handleInputChange = (field: string, value: string) => {
    // Format money fields with commas
    const moneyFields = ['amount', 'creditLimit', 'currentBalance'];
    if (moneyFields.includes(field)) {
      const formattedValue = formatNumberWithCommas(value);
      setFormData(prev => ({ ...prev, [field]: formattedValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  // Date picker handlers
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString(); // User-friendly format
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || startDateValue;
    setShowStartDatePicker(Platform.OS === 'ios');
    setStartDateValue(currentDate);
    setFormData(prev => ({ ...prev, startDate: formatDate(currentDate) }));
  };

  const onDueDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || dueDateValue;
    setShowDueDatePicker(Platform.OS === 'ios');
    setDueDateValue(currentDate);
    setFormData(prev => ({ ...prev, dueDate: formatDate(currentDate) }));
  };

  const onStatementDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || statementDateValue;
    setShowStatementDatePicker(Platform.OS === 'ios');
    setStatementDateValue(currentDate);
    setFormData(prev => ({ ...prev, statementDate: formatDate(currentDate) }));
  };

  const calculateMonthlyPayment = () => {
    const principal = parseFormattedNumber(formData.amount);
    const annualRate = parseFloat(formData.interestRate) / 100;
    const termMonths = parseFloat(formData.loanTerm);

    if (!principal || !annualRate || !termMonths) return 0;

    const monthlyRate = annualRate / 12;
    
    if (monthlyRate === 0) {
      return principal / termMonths;
    }

    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                          (Math.pow(1 + monthlyRate, termMonths) - 1);
    
    return monthlyPayment;
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to add a loan');
      return;
    }

    // Validation based on loan type
    if (formData.type === 'credit_card' || formData.type === 'line_of_credit') {
      if (!formData.lender || !formData.creditLimit || !formData.currentBalance || !formData.interestRate || !formData.minimumPaymentPercentage || !formData.dueDate || !formData.statementDate) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      if (!isValidNumber(formData.creditLimit)) {
        Alert.alert('Error', 'Please enter a valid number for the credit limit');
        return;
      }

      if (!isValidNumber(formData.currentBalance)) {
        Alert.alert('Error', 'Please enter a valid number for the current balance');
        return;
      }

      const numericLimit = parseFormattedNumber(formData.creditLimit);
      const numericBalance = parseFormattedNumber(formData.currentBalance);
      const numericRate = parseFloat(formData.interestRate);
      const numericMinPercent = parseFloat(formData.minimumPaymentPercentage);

      if (numericLimit <= 0) {
        Alert.alert('Error', 'Please enter a positive number for the credit limit');
        return;
      }

      if (numericBalance < 0) {
        Alert.alert('Error', 'Current balance cannot be negative');
        return;
      }

      if (numericBalance > numericLimit) {
        Alert.alert('Error', 'Current balance cannot exceed credit limit');
        return;
      }

      if (isNaN(numericRate) || numericRate < 0) {
        Alert.alert('Error', 'Please enter a valid interest rate');
        return;
      }

      if (isNaN(numericMinPercent) || numericMinPercent <= 0 || numericMinPercent > 100) {
        Alert.alert('Error', 'Please enter a valid minimum payment percentage (1-100)');
        return;
      }

      try {
        // Calculate minimum payment for credit cards/lines of credit
        const minimumPayment = (numericBalance * numericMinPercent) / 100;
        
        let newLoan;
        const loanData = {
          user_id: user.id,
          name: formData.lender,
          loan_type: formData.type,
          principal: 0, // Not applicable for credit cards/LOC
          interest_rate: numericRate,
          term_months: null, // Not applicable for credit cards/LOC
          monthly_payment: null, // Not applicable for credit cards/LOC
          currency: formData.currency,
          start_date: null, // Not applicable for credit cards/LOC
          credit_limit: numericLimit,
          current_balance: numericBalance,
          minimum_payment_percentage: numericMinPercent,
          due_date: formData.dueDate,
          statement_date: formData.statementDate,
          last_statement_balance: null,
          last_statement_date: null,
          next_statement_date: null,
          minimum_payment_amount: null,
          late_fee_amount: null,
          grace_period_days: null,
          last_payment_date: null,
          last_payment_amount: null,
          days_past_due: null,
          total_fees_charged: null,
        };

        if (isEditing) {
          newLoan = await dataService.updateLoan(editingLoan.id, loanData);
        } else {
          newLoan = await dataService.createLoan(loanData);
        }

        // Schedule payment reminders for credit card/line of credit
        if (newLoan && newLoan.id && formData.dueDate) {
          try {
            console.log('Scheduling payment reminders for credit card/line of credit');
            // Schedule reminders for the next 12 months for credit cards
            const dueDate = new Date(formData.dueDate);
            let scheduledCount = 0;
            
            for (let i = 0; i < 12; i++) {
              const nextDueDate = new Date(dueDate);
              nextDueDate.setMonth(nextDueDate.getMonth() + i);
              
              // Only schedule if the due date is in the future
              if (nextDueDate > new Date()) {
                await notificationService.schedulePaymentReminder(
                  newLoan.id.toString(),
                  formData.lender,
                  nextDueDate,
                  minimumPayment,
                  formData.currency
                );
                scheduledCount++;
              }
            }
            console.log(`Scheduled ${scheduledCount} payment reminders for credit card`);
          } catch (error) {
            console.error('Error scheduling payment reminders:', error);
          }
        }

        Alert.alert(
          'Success',
          `${formData.type === 'credit_card' ? 'Credit card' : 'Line of credit'} ${isEditing ? 'updated' : 'added'} successfully!`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } catch (error) {
        console.error('Error creating loan:', error);
        Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'add'} loan. Please try again.`);
      }
    } else {
      // Amortized loan validation
      if (!formData.lender || !formData.amount || !formData.interestRate || !formData.loanTerm || !formData.startDate) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      if (!isValidNumber(formData.amount)) {
        Alert.alert('Error', 'Please enter a valid number for the loan amount');
        return;
      }

      const numericAmount = parseFormattedNumber(formData.amount);
      const numericRate = parseFloat(formData.interestRate);
      const numericTerm = parseInt(formData.loanTerm);

      if (numericAmount <= 0) {
        Alert.alert('Error', 'Please enter a positive number for the loan amount');
        return;
      }

      if (isNaN(numericRate) || numericRate < 0) {
        Alert.alert('Error', 'Please enter a valid interest rate');
        return;
      }

      if (isNaN(numericTerm) || numericTerm <= 0) {
        Alert.alert('Error', 'Please enter a valid positive number for the loan term');
        return;
      }

      const monthlyPayment = calculateMonthlyPayment();
      
      try {
        let newLoan;
        const loanData = {
          user_id: user.id,
          name: formData.lender,
          loan_type: formData.type,
          principal: numericAmount,
          interest_rate: numericRate,
          term_months: numericTerm,
          monthly_payment: monthlyPayment,
          currency: formData.currency,
          start_date: formData.startDate,
          credit_limit: null, // Not applicable for amortized loans
          current_balance: null, // Not applicable for amortized loans
          minimum_payment_percentage: null, // Not applicable for amortized loans
          due_date: null, // Not applicable for amortized loans
          statement_date: null, // Not applicable for amortized loans
          last_statement_balance: null,
          last_statement_date: null,
          next_statement_date: null,
          minimum_payment_amount: null,
          late_fee_amount: null,
          grace_period_days: null,
          last_payment_date: null,
          last_payment_amount: null,
          days_past_due: null,
          total_fees_charged: null,
        };

        if (isEditing) {
          newLoan = await dataService.updateLoan(editingLoan.id, loanData);
        } else {
          newLoan = await dataService.createLoan(loanData);
        }

        // Schedule payment reminders for the new loan (amortized loans only)
        if (newLoan && newLoan.id) {
          try {
            console.log('Scheduling payment reminders for amortized loan');
            // Schedule reminders for the next 12 months
            const startDate = new Date(formData.startDate);
            let scheduledCount = 0;
            
            for (let i = 1; i <= Math.min(numericTerm, 12); i++) {
              const paymentDate = new Date(startDate);
              paymentDate.setMonth(paymentDate.getMonth() + i);
              
              // Only schedule if the payment date is in the future
              if (paymentDate > new Date()) {
                await notificationService.schedulePaymentReminder(
                  newLoan.id.toString(),
                  formData.lender,
                  paymentDate,
                  monthlyPayment,
                  formData.currency
                );
                scheduledCount++;
              }
            }
            console.log(`Scheduled ${scheduledCount} payment reminders for loan`);
          } catch (error) {
            console.error('Error scheduling payment reminders:', error);
          }
        }

        Alert.alert(
          'Success',
          `Loan ${isEditing ? 'updated' : 'added'} successfully!\nMonthly Payment: ${formatCurrency(monthlyPayment)}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } catch (error) {
        console.error('Error creating loan:', error);
        Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'add'} loan. Please try again.`);
      }
    }
  };

  const handleDeleteLoan = async () => {
    if (!isEditing || !editingLoan) return;
    
    Alert.alert(
      'Delete Loan',
      'Are you sure you want to delete this loan? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await dataService.deleteLoan(editingLoan.id);
              Alert.alert(
                'Success',
                'Loan deleted successfully!',
                [{ text: 'OK', onPress: () => {
                  // Navigate back twice: once from the edit screen, once from the details screen
                  navigation.goBack(); // Back to details screen
                  setTimeout(() => navigation.goBack(), 100); // Back to loans list
                }}]
              );
            } catch (error) {
              console.error('Error deleting loan:', error);
              Alert.alert('Error', 'Failed to delete loan. Please try again.');
            }
          }
        }
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return formatCurrencyAmount(amount, formData.currency, defaultCurrency);
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
    requiredLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    required: {
      color: theme.colors.primary,
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
    deleteButton: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: '#FF3B30', // Red border
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 20,
    },
    deleteButtonText: {
      color: '#FF3B30', // Red text
      fontSize: 16,
      fontWeight: 'bold',
    },
    submitButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 20,
    },
    submitButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    helpText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    halfWidth: {
      width: '48%',
    },
    calculatedPaymentCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    calculatedPaymentLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    calculatedPaymentValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.primary,
    },
    totalCostSection: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    totalCostLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    totalCostValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#E74C3C', // Red to emphasize the total cost
      marginBottom: 8,
    },
    totalInterestLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
    },
    dateButton: {
      backgroundColor: theme.colors.card,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dateButtonText: {
      fontSize: 16,
      color: theme.colors.text,
    },
    dateButtonPlaceholder: {
      fontSize: 16,
      color: theme.colors.textSecondary,
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
        <Text style={styles.title}>{isEditing ? 'Edit Loan' : 'Add Loan'}</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formGroup}>
          <Text style={styles.requiredLabel}>
            Lender <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={formData.lender}
            onChangeText={(value) => handleInputChange('lender', value)}
            placeholder="e.g., Chase Bank, Wells Fargo"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.requiredLabel}>
            Loan Type <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.type}
              onValueChange={(value) => handleInputChange('type', value)}
              style={styles.picker}
            >
              {loanTypes.map((type) => (
                <Picker.Item
                  key={type.value}
                  label={type.label}
                  value={type.value}
                />
              ))}
            </Picker>
          </View>
          <Text style={styles.helpText}>
            {loanTypes.find(type => type.value === formData.type)?.description}
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.requiredLabel}>
            Currency <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.currency}
              onValueChange={(value) => handleInputChange('currency', value)}
              style={styles.picker}
            >
              {currencies.map((curr) => (
                <Picker.Item
                  key={curr.value}
                  label={curr.label}
                  value={curr.value}
                />
              ))}
            </Picker>
          </View>
        </View>

        {formData.type === 'credit_card' || formData.type === 'line_of_credit' ? (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.requiredLabel}>
                Credit Limit <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.creditLimit}
                onChangeText={(value) => handleInputChange('creditLimit', value)}
                placeholder="0"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
              <Text style={styles.helpText}>
                {formData.type === 'credit_card' ? 'Maximum credit limit available' : 'Maximum line of credit available'}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.requiredLabel}>
                Current Balance <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.currentBalance}
                onChangeText={(value) => handleInputChange('currentBalance', value)}
                placeholder="0"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
              <Text style={styles.helpText}>Current outstanding balance</Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.requiredLabel}>
                  Interest Rate <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.interestRate}
                  onChangeText={(value) => handleInputChange('interestRate', value)}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />
                <Text style={styles.helpText}>Annual APR (%)</Text>
              </View>

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.requiredLabel}>
                  Min Payment % <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.minimumPaymentPercentage}
                  onChangeText={(value) => handleInputChange('minimumPaymentPercentage', value)}
                  placeholder="2.0"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />
                <Text style={styles.helpText}>Min payment % of balance</Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.requiredLabel}>
                Due Date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDueDatePicker(true)}
              >
                <Text style={formData.dueDate ? styles.dateButtonText : styles.dateButtonPlaceholder}>
                  {formData.dueDate ? formatDateDisplay(dueDateValue) : 'Select due date'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.helpText}>Select the payment due date</Text>
              {showDueDatePicker && (
                <DateTimePicker
                  value={dueDateValue}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDueDateChange}
                />
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.requiredLabel}>
                Statement Date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStatementDatePicker(true)}
              >
                <Text style={formData.statementDate ? styles.dateButtonText : styles.dateButtonPlaceholder}>
                  {formData.statementDate ? formatDateDisplay(statementDateValue) : 'Select statement date'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.helpText}>Select the statement date</Text>
              {showStatementDatePicker && (
                <DateTimePicker
                  value={statementDateValue}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onStatementDateChange}
                />
              )}
            </View>
          </>
        ) : (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.requiredLabel}>
                Loan Amount <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.amount}
                onChangeText={(value) => handleInputChange('amount', value)}
                placeholder="0"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
              <Text style={styles.helpText}>Total amount borrowed (original loan amount)</Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.requiredLabel}>
                  Interest Rate <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.interestRate}
                  onChangeText={(value) => handleInputChange('interestRate', value)}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />
                <Text style={styles.helpText}>Annual rate (%)</Text>
              </View>

              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.requiredLabel}>
                  Loan Term <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.loanTerm}
                  onChangeText={(value) => handleInputChange('loanTerm', value)}
                  placeholder="360"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                />
                <Text style={styles.helpText}>Number of months</Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.requiredLabel}>
                Start Date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={formData.startDate ? styles.dateButtonText : styles.dateButtonPlaceholder}>
                  {formData.startDate ? formatDateDisplay(startDateValue) : 'Select start date'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.helpText}>Select the loan start date</Text>
              {showStartDatePicker && (
                <DateTimePicker
                  value={startDateValue}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onStartDateChange}
                />
              )}
            </View>

            {formData.amount && formData.interestRate && formData.loanTerm && (
              <View style={styles.calculatedPaymentCard}>
                <Text style={styles.calculatedPaymentLabel}>Calculated Monthly Payment:</Text>
                <Text style={styles.calculatedPaymentValue}>
                  {formatCurrency(calculateMonthlyPayment())}
                </Text>
                <View style={styles.totalCostSection}>
                  <Text style={styles.totalCostLabel}>Total Amount to Pay Back:</Text>
                  <Text style={styles.totalCostValue}>
                    {formatCurrency(calculateMonthlyPayment() * parseInt(formData.loanTerm))}
                  </Text>
                  <Text style={styles.totalInterestLabel}>
                    Total Interest: {formatCurrency((calculateMonthlyPayment() * parseInt(formData.loanTerm)) - parseFormattedNumber(formData.amount))}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {isEditing && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteLoan}>
            <Text style={styles.deleteButtonText}>Delete Loan</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>{isEditing ? 'Update Loan' : 'Add Loan'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};