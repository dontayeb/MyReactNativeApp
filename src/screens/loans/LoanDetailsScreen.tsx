import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { dataService } from '../../services/dataService';
import { formatCurrencyAmount, convertToDefaultCurrency } from '../../utils/currencyUtils';
import { useCurrency } from '../../contexts/CurrencyContext';
import { AddPaymentModal } from './AddPaymentModal';
import { CreditCardStatementView } from './CreditCardStatementView';

interface LoanDetailsScreenProps {
  navigation: any;
  route: any;
}

interface AmortizationEntry {
  paymentNumber: number;
  paymentDate: string;
  beginningBalance: number;
  payment: number;
  principal: number;
  interest: number;
  endingBalance: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
}

export const LoanDetailsScreen: React.FC<LoanDetailsScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { user } = useAuth();
  const { defaultCurrency } = useCurrency();
  
  const { loan: initialLoan } = route.params;
  const [loan, setLoan] = useState(initialLoan);
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [additionalPayments, setAdditionalPayments] = useState<any[]>([]);
  
  // Get screen width for responsive design
  const screenWidth = Dimensions.get('window').width;
  const isSmallScreen = screenWidth < 400; // Show icon-only buttons more often

  const reloadLoanData = async () => {
    try {
      if (user?.id && loan.id) {
        const [loans, payments] = await Promise.all([
          dataService.getLoans(user.id),
          dataService.getLoanPayments(user.id, loan.id)
        ]);
        
        const updatedLoan = loans.find(l => l.id === loan.id);
        if (updatedLoan) {
          // Convert the database loan format to the component format
          // Calculate actual remaining balance including additional payments
          const calculateActualRemainingBalance = () => {
            if (updatedLoan.loan_type === 'amortized') {
              // For amortized loans, calculate based on schedule with additional payments
              const totalAdditionalPayments = payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
              
              // Start with original principal
              let balance = updatedLoan.principal || 0;
              const monthlyRate = (updatedLoan.interest_rate / 100) / 12;
              const monthlyPayment = updatedLoan.monthly_payment || 0;
              const startDate = new Date(updatedLoan.start_date || Date.now());
              const currentDate = new Date();
              
              // Calculate months elapsed
              let monthsElapsed = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                                  (currentDate.getMonth() - startDate.getMonth());
              
              if (currentDate.getDate() < startDate.getDate()) {
                monthsElapsed--;
              }
              
              // Apply regular payments for elapsed months
              for (let i = 0; i < monthsElapsed && balance > 0.01; i++) {
                const interestPayment = balance * monthlyRate;
                const principalPayment = Math.min(monthlyPayment - interestPayment, balance);
                balance -= principalPayment;
              }
              
              // Subtract additional payments
              balance -= totalAdditionalPayments;
              
              return Math.max(0, balance);
            }
            
            // For other loan types, use stored current_balance or principal
            return updatedLoan.current_balance || updatedLoan.principal || 0;
          };
          
          const actualRemainingBalance = calculateActualRemainingBalance();

          const formattedLoan = {
            id: updatedLoan.id,
            lender: updatedLoan.name,
            amount: updatedLoan.principal || 0,
            interestRate: updatedLoan.interest_rate,
            remainingBalance: actualRemainingBalance,
            loanTerm: updatedLoan.term_months || 0,
            startDate: updatedLoan.start_date || '',
            currency: updatedLoan.currency,
            type: updatedLoan.loan_type as 'amortized' | 'credit_card' | 'line_of_credit',
            creditLimit: updatedLoan.credit_limit || 0,
            currentBalance: updatedLoan.current_balance || 0,
            minimumPaymentPercentage: updatedLoan.minimum_payment_percentage || 0,
            dueDate: updatedLoan.due_date || '',
            statementDate: updatedLoan.statement_date || ''
          };
          setLoan(formattedLoan);
          setAdditionalPayments(payments || []);
        }
      }
    } catch (error) {
      console.error('Error reloading loan data:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      reloadLoanData();
    }, [user?.id, loan.id])
  );

  const formatCurrency = (amount: number) => {
    return formatCurrencyAmount(amount, loan.currency || 'USD', defaultCurrency);
  };

  const formatNumber = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatAmountWithDollarSign = (amount: number) => {
    return '$' + new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateMonthlyPayment = () => {
    if (loan.type === 'credit_card' || loan.type === 'line_of_credit') {
      // For credit cards/LOC, return minimum payment based on current balance
      return (loan.currentBalance * loan.minimumPaymentPercentage) / 100;
    }

    // For amortized loans
    const principal = loan.amount;
    const annualRate = loan.interestRate / 100;
    const termMonths = loan.loanTerm;

    if (!principal || !annualRate || !termMonths) return 0;

    const monthlyRate = annualRate / 12;
    
    if (monthlyRate === 0) {
      return principal / termMonths;
    }

    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                          (Math.pow(1 + monthlyRate, termMonths) - 1);
    
    return monthlyPayment;
  };

  const calculateTotalPayback = () => {
    if (loan.type === 'credit_card' || loan.type === 'line_of_credit') {
      return null; // Can't calculate for revolving credit
    }
    return calculateMonthlyPayment() * loan.loanTerm;
  };

  const calculateTotalInterest = () => {
    if (loan.type === 'credit_card' || loan.type === 'line_of_credit') {
      return null;
    }
    const totalPayback = calculateTotalPayback();
    return totalPayback ? totalPayback - loan.amount : 0;
  };

  const amortizationSchedule = useMemo(() => {
    if (loan.type !== 'amortized') return [];
    
    const schedule: AmortizationEntry[] = [];
    const monthlyPayment = calculateMonthlyPayment();
    const monthlyRate = (loan.interestRate / 100) / 12;
    
    let remainingBalance = loan.amount;
    let cumulativeInterest = 0;
    let cumulativePrincipal = 0;
    const startDate = new Date(loan.startDate);
    const startDay = startDate.getDate(); // Remember the original day of month

    // Sort additional payments by date
    const sortedPayments = [...additionalPayments].sort((a, b) => 
      new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
    );

    for (let i = 1; i <= loan.loanTerm && remainingBalance > 0.01; i++) {
      // Calculate payment date by adding (i-1) months to start date
      // This makes the start date the first payment date
      const paymentDate = new Date(startDate.getFullYear(), startDate.getMonth() + (i - 1), startDay);
      
      // Handle month-end edge cases (e.g., Jan 31 + 1 month should be Feb 28, not Mar 3)
      if (paymentDate.getDate() !== startDay) {
        // If the day changed, it means the target month doesn't have enough days
        // Set to the last day of the target month
        paymentDate.setDate(0);
      }

      const paymentDateStr = paymentDate.toISOString().split('T')[0];
      
      // Calculate regular payment amounts
      const interestPayment = remainingBalance * monthlyRate;
      let principalPayment = Math.min(monthlyPayment - interestPayment, remainingBalance);
      
      // Check for additional payments made on or before this payment date
      const additionalPaymentsThisPeriod = sortedPayments.filter(payment => {
        const paymentDate = new Date(payment.payment_date);
        const scheduleDate = new Date(paymentDateStr);
        const previousScheduleDate = i > 1 ? 
          new Date(startDate.getFullYear(), startDate.getMonth() + (i - 2), startDay) : 
          new Date(startDate);
        
        return paymentDate > previousScheduleDate && paymentDate <= scheduleDate;
      });

      // Apply additional payments to principal
      let totalAdditionalPayment = 0;
      additionalPaymentsThisPeriod.forEach(payment => {
        totalAdditionalPayment += payment.amount;
      });

      // Additional payments go directly to principal
      const totalPrincipalPayment = Math.min(principalPayment + totalAdditionalPayment, remainingBalance);
      const newBalance = remainingBalance - totalPrincipalPayment;
      
      cumulativeInterest += interestPayment;
      cumulativePrincipal += totalPrincipalPayment;

      schedule.push({
        paymentNumber: i,
        paymentDate: paymentDateStr,
        beginningBalance: remainingBalance,
        payment: monthlyPayment + totalAdditionalPayment,
        principal: totalPrincipalPayment,
        interest: interestPayment,
        endingBalance: newBalance,
        cumulativeInterest: cumulativeInterest,
        cumulativePrincipal: cumulativePrincipal,
      });

      remainingBalance = newBalance;
      
      // If loan is paid off early due to additional payments, break
      if (remainingBalance <= 0.01) {
        break;
      }
    }

    return schedule;
  }, [loan, additionalPayments]);

  const totalInterest = amortizationSchedule.length > 0 
    ? amortizationSchedule[amortizationSchedule.length - 1]?.cumulativeInterest || 0
    : 0;

  // Calculate actual payments made based on current date vs loan start date
  const calculatePaymentsMade = () => {
    if (loan.type !== 'amortized') return 0;
    
    const startDate = new Date(loan.startDate);
    const currentDate = new Date();
    
    // If current date is before start date, no payments made yet
    if (currentDate < startDate) return 0;
    
    // Calculate months between start date and current date
    let monthsDiff = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                     (currentDate.getMonth() - startDate.getMonth());
    
    // Adjust for day of month - if current day is before start day, subtract 1 month
    if (currentDate.getDate() < startDate.getDate()) {
      monthsDiff--;
    }
    
    // Ensure we don't exceed total loan term and don't go below 0
    return Math.max(0, Math.min(monthsDiff + 1, loan.loanTerm));
  };

  const paymentsMade = calculatePaymentsMade();
  const progressPercentage = loan.loanTerm > 0 ? (paymentsMade / loan.loanTerm) * 100 : 0;


  // Calculate debt-free date
  const calculateDebtFreeDate = () => {
    if (loan.type !== 'amortized') return null;
    
    const startDate = new Date(loan.startDate);
    const debtFreeDate = new Date(startDate);
    debtFreeDate.setMonth(debtFreeDate.getMonth() + loan.loanTerm - 1);
    
    return debtFreeDate;
  };

  const debtFreeDate = calculateDebtFreeDate();
  
  // Calculate countdown to debt-free date
  const calculateCountdown = () => {
    if (!debtFreeDate) return null;
    
    const now = new Date();
    const timeDiff = debtFreeDate.getTime() - now.getTime();
    
    if (timeDiff <= 0) return { years: 0, months: 0, days: 0, isPastDue: true };
    
    const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    const years = Math.floor(days / 365);
    const remainingDays = days % 365;
    const months = Math.floor(remainingDays / 30);
    const finalDays = remainingDays % 30;
    
    return { years, months, days: finalDays, totalDays: days, isPastDue: false };
  };

  const countdown = calculateCountdown();


  const displaySchedule = showFullSchedule ? amortizationSchedule : amortizationSchedule.slice(0, 12);

  const getLoanIcon = (type: string) => {
    switch (type) {
      case 'amortized': return 'home-outline';
      case 'credit_card': return 'card-outline';
      case 'line_of_credit': return 'trending-up-outline';
      default: return 'cash-outline';
    }
  };

  const getLoanTypeLabel = (type: string) => {
    switch (type) {
      case 'amortized': return 'Amortized Loan';
      case 'credit_card': return 'Credit Card';
      case 'line_of_credit': return 'Line of Credit';
      default: return 'Loan';
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
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      maxWidth: '60%', // Don't take more than 60% of header width
    },
    backButton: {
      marginRight: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      flex: 1,
      marginRight: 8,
    },
    actionsButton: {
      padding: 8,
      borderRadius: 6,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 36,
      height: 36,
    },
    content: {
      flex: 1,
    },
    loanOverview: {
      backgroundColor: theme.colors.card,
      margin: 20,
      borderRadius: 16,
      padding: 24,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 6,
    },
    loanTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    loanIcon: {
      marginRight: 12,
    },
    loanTitleInfo: {
      flex: 1,
    },
    loanLender: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    loanType: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    balanceSection: {
      alignItems: 'center',
      alignSelf: 'center',
      width: '100%',
    },
    loanBalance: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.primary,
      textAlign: 'center',
      marginBottom: 8,
    },
    balanceLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    totalPayback: {
      fontSize: 28,
      fontWeight: '700',
      color: '#E74C3C', // Red to emphasize the total cost
      textAlign: 'center',
      marginTop: 12,
      marginBottom: 4,
    },
    totalPaybackLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
      fontWeight: '600',
    },
    detailsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    detailItem: {
      width: '48%',
      marginBottom: 16,
    },
    detailLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    detailValue: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    progressSection: {
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    progressLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    progressLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    progressPercentage: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    progressBarContainer: {
      height: 8,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: 4,
    },
    scheduleSection: {
      backgroundColor: theme.colors.card,
      margin: 20,
      marginTop: 0,
      borderRadius: 16,
      padding: 20,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 6,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 16,
    },
    scheduleInfo: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    paymentsProgress: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    monthlyPaymentInfo: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    scheduleHeader: {
      flexDirection: 'row',
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: theme.colors.border,
      marginBottom: 8,
    },
    headerCell: {
      flex: 1,
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    scheduleRow: {
      flexDirection: 'row',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    cell: {
      flex: 1,
      fontSize: 12,
      color: theme.colors.text,
      textAlign: 'center',
    },
    lastPaymentRow: {
      // Remove background and border styling
    },
    nextPaymentRow: {
      // Remove background and border styling
    },
    lastPaymentText: {
      color: '#059669',
      fontWeight: '600',
    },
    nextPaymentText: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    additionalPaymentRow: {
      backgroundColor: '#FEF3C7', // Light yellow background
    },
    additionalPaymentText: {
      color: '#B45309', // Orange text for additional payments
      fontWeight: '600',
    },
    paymentLegend: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    legendColor: {
      width: 12,
      height: 12,
      backgroundColor: '#FEF3C7',
      borderRadius: 2,
      marginRight: 6,
      borderWidth: 1,
      borderColor: '#F59E0B',
    },
    legendText: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    showMoreButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 16,
    },
    showMoreText: {
      color: 'white',
      fontWeight: '600',
    },
    summaryCards: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginHorizontal: 20,
      marginBottom: 20,
    },
    summaryCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      width: '48%',
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    summaryValue: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.primary,
      marginBottom: 4,
    },
    summaryLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    tipsSection: {
      margin: 20,
      marginTop: 0,
    },
    tipsCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 20,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 6,
    },
    tipsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    tipsTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginLeft: 8,
    },
    tipItem: {
      marginBottom: 12,
    },
    tipText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
    warningSection: {
      backgroundColor: '#FEE2E2',
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
      borderLeftWidth: 4,
      borderLeftColor: '#DC2626',
    },
    warningHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    warningTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#DC2626',
      marginLeft: 8,
    },
    warningText: {
      fontSize: 14,
      color: '#DC2626',
      marginBottom: 8,
      lineHeight: 20,
    },
    warningBullet: {
      fontSize: 14,
      color: '#DC2626',
      marginBottom: 4,
      marginLeft: 8,
    },
    warningAction: {
      fontSize: 14,
      fontWeight: '600',
      color: '#DC2626',
      marginTop: 8,
      fontStyle: 'italic',
    },
    cautionSection: {
      backgroundColor: '#FEF3C7',
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
      borderLeftWidth: 4,
      borderLeftColor: '#F59E0B',
    },
    cautionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    cautionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#92400E',
      marginLeft: 8,
    },
    cautionText: {
      fontSize: 14,
      color: '#92400E',
      lineHeight: 20,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">Loan Details</Text>
        </View>
        <TouchableOpacity 
          style={styles.actionsButton}
          onPress={() => {
            const actions = loan.type === 'amortized' ? [
              { text: 'Cancel', style: 'cancel' as const },
              { text: 'Edit Loan', onPress: () => navigation.navigate('LoanDetail', { loan }) },
              { text: 'Add Payment', onPress: () => setShowAddPaymentModal(true) },
            ] : [
              { text: 'Cancel', style: 'cancel' as const },
              { text: 'Edit Loan', onPress: () => navigation.navigate('LoanDetail', { loan }) },
              { text: 'Update Balance', onPress: () => setShowAddPaymentModal(true) },
            ];
            
            Alert.alert('Loan Actions', 'Choose an action:', actions);
          }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.loanOverview}>
          <View style={styles.loanTitleRow}>
            <Ionicons 
              name={getLoanIcon(loan.type)} 
              size={32} 
              color={theme.colors.primary} 
              style={styles.loanIcon}
            />
            <View style={styles.loanTitleInfo}>
              <Text style={styles.loanLender}>{loan.lender}</Text>
              <Text style={styles.loanType}>{getLoanTypeLabel(loan.type)}</Text>
            </View>
          </View>

          <View style={styles.balanceSection}>
            <Text style={styles.loanBalance}>{formatCurrency(loan.remainingBalance)}</Text>
            <Text style={styles.balanceLabel}>Current Balance</Text>
          </View>

          <View style={styles.detailsGrid}>
            {loan.type === 'credit_card' || loan.type === 'line_of_credit' ? (
              <>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Credit Limit</Text>
                  <Text style={styles.detailValue}>{formatCurrency(loan.creditLimit)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Available Credit</Text>
                  <Text style={styles.detailValue}>{formatCurrency(loan.creditLimit - loan.currentBalance)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Interest Rate</Text>
                  <Text style={styles.detailValue}>{loan.interestRate}% APR</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Minimum Payment</Text>
                  <Text style={styles.detailValue}>{formatCurrency(calculateMonthlyPayment())}</Text>
                </View>
                {loan.dueDate && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Next Due Date</Text>
                    <Text style={styles.detailValue}>{formatDate(loan.dueDate)}</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Loan Taken</Text>
                  <Text style={styles.detailValue}>{formatCurrency(loan.amount)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Total Interest</Text>
                  <Text style={styles.detailValue}>{formatCurrency(calculateTotalInterest()!)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Total to Pay Back</Text>
                  <Text style={styles.detailValue}>{formatCurrency(calculateTotalPayback()!)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Interest Rate</Text>
                  <Text style={styles.detailValue}>{loan.interestRate}%</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Monthly Payment</Text>
                  <Text style={styles.detailValue}>{formatCurrency(calculateMonthlyPayment())}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Loan Term</Text>
                  <Text style={styles.detailValue}>{loan.loanTerm} months</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Start Date</Text>
                  <Text style={styles.detailValue}>{formatDate(loan.startDate)}</Text>
                </View>
              </>
            )}
          </View>

          {loan.type === 'amortized' && (
            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Loan Progress</Text>
                <Text style={styles.progressPercentage}>
                  {progressPercentage.toFixed(1)}% complete
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${progressPercentage}%` }
                  ]} 
                />
              </View>
            </View>
          )}
        </View>


        {loan.type === 'amortized' && amortizationSchedule.length > 0 && (
          <>
            <View style={styles.summaryCards}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{formatCurrency(totalInterest)}</Text>
                <Text style={styles.summaryLabel}>Total Interest</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{formatCurrency(loan.amount + totalInterest)}</Text>
                <Text style={styles.summaryLabel}>Total Cost</Text>
              </View>
            </View>

            <View style={styles.scheduleSection}>
              <Text style={styles.sectionTitle}>Amortization Schedule</Text>
              
              <View style={styles.scheduleInfo}>
                <Text style={styles.paymentsProgress}>
                  {paymentsMade} of {loan.loanTerm} payments made
                </Text>
                <Text style={styles.monthlyPaymentInfo}>
                  Monthly payment of {formatCurrency(calculateMonthlyPayment())}
                </Text>
              </View>
              
              <View style={styles.scheduleHeader}>
                <Text style={[styles.headerCell, { flex: 1.5 }]}>Date</Text>
                <Text style={styles.headerCell}>Principal</Text>
                <Text style={styles.headerCell}>Interest</Text>
                <Text style={styles.headerCell}>Balance</Text>
              </View>
              
              {additionalPayments.length > 0 && (
                <View style={styles.paymentLegend}>
                  <View style={styles.legendItem}>
                    <View style={styles.legendColor} />
                    <Text style={styles.legendText}>Additional Payment Applied</Text>
                  </View>
                </View>
              )}

              {displaySchedule.map((entry, index) => {
                const today = new Date();
                const paymentDate = new Date(entry.paymentDate);
                
                // Find the last payment that was made (payment date <= today)
                const lastPaymentMadeIndex = displaySchedule.findIndex((e, i) => {
                  const nextEntryDate = displaySchedule[i + 1] ? new Date(displaySchedule[i + 1].paymentDate) : null;
                  return new Date(e.paymentDate) <= today && (!nextEntryDate || nextEntryDate > today);
                });
                
                // Find the next payment to be made (first payment date > today)
                const nextPaymentIndex = displaySchedule.findIndex(e => new Date(e.paymentDate) > today);
                
                const isLastPaymentMade = index === lastPaymentMadeIndex && lastPaymentMadeIndex !== -1;
                const isNextPayment = index === nextPaymentIndex && nextPaymentIndex !== -1;
                
                // Check if this payment includes additional payments
                const hasAdditionalPayment = entry.payment > calculateMonthlyPayment() + 0.01;
                
                return (
                  <View key={entry.paymentNumber} style={[
                    styles.scheduleRow,
                    isLastPaymentMade && styles.lastPaymentRow,
                    isNextPayment && styles.nextPaymentRow,
                    hasAdditionalPayment && styles.additionalPaymentRow
                  ]}>
                    <Text style={[
                      styles.cell, 
                      { flex: 1.5 },
                      isLastPaymentMade && styles.lastPaymentText,
                      isNextPayment && styles.nextPaymentText,
                      hasAdditionalPayment && styles.additionalPaymentText
                    ]}>{formatDate(entry.paymentDate)}</Text>
                    <Text style={[
                      styles.cell,
                      isLastPaymentMade && styles.lastPaymentText,
                      isNextPayment && styles.nextPaymentText,
                      hasAdditionalPayment && styles.additionalPaymentText
                    ]}>{formatAmountWithDollarSign(entry.principal)}</Text>
                    <Text style={[
                      styles.cell,
                      isLastPaymentMade && styles.lastPaymentText,
                      isNextPayment && styles.nextPaymentText,
                      hasAdditionalPayment && styles.additionalPaymentText
                    ]}>{formatAmountWithDollarSign(entry.interest)}</Text>
                    <Text style={[
                      styles.cell,
                      isLastPaymentMade && styles.lastPaymentText,
                      isNextPayment && styles.nextPaymentText,
                      hasAdditionalPayment && styles.additionalPaymentText
                    ]}>{formatAmountWithDollarSign(entry.endingBalance)}</Text>
                  </View>
                );
              })}

              {amortizationSchedule.length > 12 && (
                <TouchableOpacity 
                  style={styles.showMoreButton}
                  onPress={() => setShowFullSchedule(!showFullSchedule)}
                >
                  <Text style={styles.showMoreText}>
                    {showFullSchedule ? `Show Less` : `Show All ${amortizationSchedule.length} Payments`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {loan.type === 'credit_card' && (
          <View style={styles.tipsSection}>
            <View style={styles.tipsCard}>
              <View style={styles.tipsHeader}>
                <Ionicons name="bulb-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.tipsTitle}>Credit Card Tips</Text>
              </View>
              
              <View style={styles.tipItem}>
                <Text style={styles.tipText}>💡 Pay your full balance each month to avoid interest charges</Text>
              </View>
              
              <View style={styles.tipItem}>
                <Text style={styles.tipText}>📊 Keep your utilization below 30% for better credit scores</Text>
              </View>
              
              <View style={styles.tipItem}>
                <Text style={styles.tipText}>📅 Set up automatic payments to never miss a due date</Text>
              </View>
              
              <View style={styles.tipItem}>
                <Text style={styles.tipText}>🎯 Use "Update Balance" button when you receive your monthly statement</Text>
              </View>

              {/* Over-limit warning */}
              {loan.currentBalance > loan.creditLimit && (
                <View style={styles.warningSection}>
                  <View style={styles.warningHeader}>
                    <Ionicons name="warning" size={20} color="#DC2626" />
                    <Text style={styles.warningTitle}>Over Credit Limit!</Text>
                  </View>
                  <Text style={styles.warningText}>
                    Your balance exceeds your credit limit. This will result in:
                  </Text>
                  <Text style={styles.warningBullet}>• Over-limit fees (usually $25-$35)</Text>
                  <Text style={styles.warningBullet}>• Higher interest rates</Text>
                  <Text style={styles.warningBullet}>• Negative impact on credit score</Text>
                  <Text style={styles.warningBullet}>• Possible account suspension</Text>
                  <Text style={styles.warningAction}>
                    Make a payment immediately to bring your balance below the limit.
                  </Text>
                </View>
              )}

              {/* High utilization warning */}
              {!loan.currentBalance || (loan.currentBalance <= loan.creditLimit && (loan.currentBalance / loan.creditLimit) > 0.8) && (
                <View style={styles.cautionSection}>
                  <View style={styles.cautionHeader}>
                    <Ionicons name="alert-circle-outline" size={20} color="#F59E0B" />
                    <Text style={styles.cautionTitle}>High Credit Utilization</Text>
                  </View>
                  <Text style={styles.cautionText}>
                    You're using {((loan.currentBalance / loan.creditLimit) * 100).toFixed(1)}% of your credit limit. 
                    Consider paying down your balance to improve your credit score.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
      
      <AddPaymentModal
        visible={showAddPaymentModal}
        onClose={() => setShowAddPaymentModal(false)}
        onPaymentAdded={reloadLoanData}
        loan={{
          id: loan.id,
          lender: loan.lender,
          currency: loan.currency
        }}
      />
    </SafeAreaView>
  );
};