import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { dataService } from '../../services/dataService';
import { appStateService } from '../../services/appStateService';
import { formatCurrencyAmount, convertToDefaultCurrency, formatNetWorthAmount } from '../../utils/currencyUtils';
import { useCurrency } from '../../contexts/CurrencyContext';
import { NoLoansEmptyState } from '../../components/EmptyStates';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { cacheService } from '../../services/cacheService';

interface Loan {
  id: string;
  lender: string;
  amount: number;
  interestRate: number;
  remainingBalance: number;
  loanTerm: number;
  startDate: string;
  currency: string;
  type: 'amortized' | 'credit_card' | 'line_of_credit';
  creditLimit: number;
  currentBalance: number;
  minimumPaymentPercentage: number;
  dueDate: string;
  statementDate: string;
}

interface LoansScreenProps {
  navigation: any;
}

export const LoansScreen: React.FC<LoansScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { user } = useAuth();
  const { defaultCurrency } = useCurrency();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Register for app state refresh
  useEffect(() => {
    appStateService.onSessionRefresh(async () => {
      if (user?.id) {
        console.log('Loans: Refreshing data after app state change');
        await loadLoans();
      }
    });
  }, [user?.id]);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadLoans();
      }
    }, [user?.id])
  );

  const loadLoans = async () => {
    if (!user?.id) return;
    
    try {
      // Check cache first
      const cacheKey = cacheService.getUserDataKey(user.id, 'loans');
      const cachedLoans = cacheService.get(cacheKey);
      
      if (cachedLoans) {
        console.log('Loading loans from cache');
        setLoans(cachedLoans);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      console.log('Loading loans for user:', user.id);
      
      const loansData = await dataService.getLoans(user.id);
      console.log('Loaded loans:', loansData.length);

      // Convert Supabase data to component format
      const formattedLoans = loansData.map(loan => ({
        id: loan.id,
        lender: loan.name,
        amount: Number(loan.principal) || 0,
        interestRate: Number(loan.interest_rate) || 0,
        remainingBalance: 0, // Will be calculated after object creation
        loanTerm: Number(loan.term_months) || 0,
        startDate: loan.start_date || '',
        currency: loan.currency,
        type: loan.loan_type as 'amortized' | 'credit_card' | 'line_of_credit',
        creditLimit: Number(loan.credit_limit) || 0,
        currentBalance: Number(loan.current_balance) || 0,
        minimumPaymentPercentage: Number(loan.minimum_payment_percentage) || 0,
        dueDate: loan.due_date || '',
        statementDate: loan.statement_date || ''
      }));

      // Calculate the actual remaining balance for each loan
      const loansWithRemainingBalance = formattedLoans.map(loan => ({
        ...loan,
        remainingBalance: calculateRemainingBalance(loan)
      }));

      setLoans(loansWithRemainingBalance);
      
      // Cache the processed loans for faster subsequent loads
      cacheService.set(cacheKey, loansWithRemainingBalance, 3 * 60 * 1000); // 3 minutes cache
    } catch (error) {
      console.error('Error loading loans:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const getLoanIcon = (type: string) => {
    switch (type) {
      case 'amortized': return 'home';
      case 'credit_card': return 'card';
      case 'line_of_credit': return 'trending-up';
      default: return 'card';
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

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return formatCurrencyAmount(amount, currency, defaultCurrency);
  };

  const calculateMonthlyPayment = (loan: Loan) => {
    if (loan.type === 'credit_card' || loan.type === 'line_of_credit') {
      // For credit cards/LOC, return minimum payment based on current balance
      return (loan.currentBalance * loan.minimumPaymentPercentage) / 100;
    }

    // For amortized loans
    const { amount, interestRate, loanTerm } = loan;
    const monthlyRate = interestRate / 100 / 12;
    
    if (monthlyRate === 0) {
      return amount / loanTerm;
    }

    const monthlyPayment = amount * (monthlyRate * Math.pow(1 + monthlyRate, loanTerm)) / 
                          (Math.pow(1 + monthlyRate, loanTerm) - 1);
    
    return monthlyPayment;
  };

  // Calculate actual payments made based on current date vs loan start date
  const calculatePaymentsMade = (loan: Loan) => {
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

  const calculateProgressPercentage = (loan: Loan) => {
    const paymentsMade = calculatePaymentsMade(loan);
    return loan.loanTerm > 0 ? (paymentsMade / loan.loanTerm) * 100 : 0;
  };

  // Calculate the actual remaining balance for amortized loans
  const calculateRemainingBalance = (loan: Loan) => {
    if (loan.type === 'credit_card' || loan.type === 'line_of_credit') {
      return loan.currentBalance;
    }

    // For amortized loans, calculate based on payment schedule
    const paymentsMade = calculatePaymentsMade(loan);
    
    if (paymentsMade <= 0) {
      return loan.amount; // No payments made yet, full amount remains
    }

    const monthlyPayment = calculateMonthlyPayment(loan);
    const monthlyRate = (loan.interestRate / 100) / 12;
    
    let remainingBalance = loan.amount;
    
    // Simulate the amortization schedule up to payments made
    for (let i = 0; i < Math.min(paymentsMade, loan.loanTerm); i++) {
      const interestPayment = remainingBalance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingBalance = Math.max(0, remainingBalance - principalPayment);
      
      if (remainingBalance <= 0) {
        break;
      }
    }

    return remainingBalance;
  };

  const calculateTotalPayback = (loan: Loan) => {
    if (loan.type === 'credit_card' || loan.type === 'line_of_credit') {
      // For revolving credit, can't calculate total payback as it varies
      return null;
    }
    
    // For amortized loans: monthly payment × number of payments
    const monthlyPayment = calculateMonthlyPayment(loan);
    return monthlyPayment * loan.loanTerm;
  };

  const calculateTotalInterest = (loan: Loan) => {
    if (loan.type === 'credit_card' || loan.type === 'line_of_credit') {
      return null;
    }
    
    const totalPayback = calculateTotalPayback(loan);
    return totalPayback ? totalPayback - loan.amount : 0;
  };


  const renderLoanItem = ({ item }: { item: Loan }) => (
    <TouchableOpacity 
      style={styles.loanCard}
      onPress={() => navigation.navigate('LoanDetails', { loan: item })}
    >
      <View style={styles.loanHeader}>
        <View style={styles.loanTitleRow}>
          <Ionicons 
            name={getLoanIcon(item.type)} 
            size={24} 
            color={theme.colors.primary} 
            style={styles.loanIcon}
          />
          <View style={styles.loanTitleInfo}>
            <Text style={styles.loanLender}>{item.lender}</Text>
            <Text style={styles.loanType}>{getLoanTypeLabel(item.type)}</Text>
          </View>
          <View style={styles.loanAmounts}>
            <Text style={styles.loanBalance}>{formatCurrency(item.remainingBalance, item.currency)}</Text>
            <Text style={styles.balanceLabel}>Current Balance</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.loanDetails}>
        {item.type === 'credit_card' || item.type === 'line_of_credit' ? (
          <>
            <View style={styles.loanDetailRow}>
              <Text style={styles.loanDetailLabel}>Credit Limit:</Text>
              <Text style={styles.loanDetailValue}>{formatCurrency(item.creditLimit, item.currency)}</Text>
            </View>
            <View style={styles.loanDetailRow}>
              <Text style={styles.loanDetailLabel}>Available Credit:</Text>
              <Text style={styles.loanDetailValue}>{formatCurrency(item.creditLimit - item.currentBalance, item.currency)}</Text>
            </View>
            <View style={styles.loanDetailRow}>
              <Text style={styles.loanDetailLabel}>Minimum Payment:</Text>
              <Text style={styles.loanDetailValue}>{formatCurrency(calculateMonthlyPayment(item), item.currency)}</Text>
            </View>
            <View style={styles.loanDetailRow}>
              <Text style={styles.loanDetailLabel}>Interest Rate:</Text>
              <Text style={styles.loanDetailValue}>{item.interestRate}%</Text>
            </View>
            {item.dueDate && (
              <View style={styles.loanDetailRow}>
                <Text style={styles.loanDetailLabel}>Due Date:</Text>
                <Text style={styles.loanDetailValue}>{new Date(item.dueDate).toLocaleDateString()}</Text>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.loanDetailRow}>
              <Text style={styles.loanDetailLabel}>Monthly Payment:</Text>
              <Text style={styles.loanDetailValue}>{formatCurrency(calculateMonthlyPayment(item), item.currency)}</Text>
            </View>
            <View style={styles.loanDetailRow}>
              <Text style={styles.loanDetailLabel}>Total Interest:</Text>
              <Text style={styles.loanDetailValue}>{formatCurrency(calculateTotalInterest(item)!, item.currency)}</Text>
            </View>
            <View style={styles.loanDetailRow}>
              <Text style={styles.loanDetailLabel}>Interest Rate:</Text>
              <Text style={styles.loanDetailValue}>{item.interestRate}%</Text>
            </View>
            <View style={styles.loanDetailRow}>
              <Text style={styles.loanDetailLabel}>Loan Term:</Text>
              <Text style={styles.loanDetailValue}>{item.loanTerm} months</Text>
            </View>
            {item.startDate && (
              <View style={styles.loanDetailRow}>
                <Text style={styles.loanDetailLabel}>Start Date:</Text>
                <Text style={styles.loanDetailValue}>{new Date(item.startDate).toLocaleDateString()}</Text>
              </View>
            )}
            
            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Loan Progress</Text>
                <Text style={styles.progressPercentage}>
                  {calculateProgressPercentage(item).toFixed(1)}% complete
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${calculateProgressPercentage(item)}%` }
                  ]} 
                />
              </View>
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  const totalBalance = Math.round(loans.reduce((sum, loan) => {
    // For credit cards/LOC, use current balance; for amortized loans, use remaining balance
    const balance = (loan.type === 'credit_card' || loan.type === 'line_of_credit') 
      ? loan.currentBalance 
      : loan.remainingBalance;
    console.log(`Loan ${loan.lender} (${loan.type}): balance=${balance}, currency=${loan.currency}`);
    const convertedBalance = convertToDefaultCurrency(balance, loan.currency, defaultCurrency);
    console.log(`Converted balance: ${convertedBalance}`);
    return sum + convertedBalance;
  }, 0) * 100) / 100;
  
  const totalMonthlyPayment = Math.round(loans.reduce((sum, loan) => {
    const monthlyPayment = calculateMonthlyPayment(loan);
    console.log(`Monthly payment for ${loan.lender} (${loan.type}): ${monthlyPayment}`);
    // Ensure the payment is a valid number
    const payment = isNaN(monthlyPayment) ? 0 : monthlyPayment;
    const convertedPayment = convertToDefaultCurrency(payment, loan.currency, defaultCurrency);
    console.log(`Converted payment: ${convertedPayment}`);
    return sum + convertedPayment;
  }, 0) * 100) / 100;

  console.log(`Default currency: ${defaultCurrency}`);
  console.log(`Final totals - Balance: ${totalBalance}, Monthly Payment: ${totalMonthlyPayment}`);
  
  // Temporary: Clear currency cache if it's wrong (remove this after fixing)
  if (defaultCurrency !== 'JMD') {
    console.log('⚠️  Default currency is not JMD! Go to Settings > Currency to change it back to JMD');
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      padding: 24,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 0,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 4,
    },
    seamlessHeader: {
      paddingTop: 50, // Status bar height + padding
      paddingHorizontal: 24,
      paddingBottom: 24,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 0,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 4,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: -0.5,
      flex: 1,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    addButtonText: {
      color: theme.colors.primary,
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 6,
    },
    summaryCard: {
      backgroundColor: theme.colors.primary,
      borderRadius: 18,
      padding: 20,
      marginBottom: 12,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    summaryLabel: {
      fontSize: 15,
      color: 'rgba(255, 255, 255, 0.85)',
      fontWeight: '500',
      letterSpacing: 0.3,
    },
    summaryValue: {
      fontSize: 20,
      fontWeight: '700',
      color: 'white',
      letterSpacing: -0.5,
    },
    summaryValueLeft: {
      fontSize: 20,
      fontWeight: '700',
      color: 'white',
      letterSpacing: -0.5,
      textAlign: 'left',
    },
    listContainer: {
      padding: 20,
    },
    loanCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
    },
    loanHeader: {
      marginBottom: 12,
    },
    loanTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
    },
    loanIcon: {
      marginRight: 12,
    },
    loanTitleInfo: {
      flex: 1,
    },
    loanLender: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    loanType: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    loanAmounts: {
      alignItems: 'flex-end',
    },
    loanBalance: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.primary,
      textAlign: 'right',
    },
    balanceLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
      textAlign: 'right',
    },
    loanDetails: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 12,
    },
    loanDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    loanDetailLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    loanDetailValue: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
    },
    progressSection: {
      marginTop: 12,
      paddingTop: 12,
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
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    progressPercentage: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    progressBarContainer: {
      height: 6,
      backgroundColor: theme.colors.border,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: 3,
    },
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('loans')}</Text>
        </View>
        <SkeletonLoader />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.seamlessHeader}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{t('loans')}</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('AddLoan')}
          >
            <Ionicons name="add" size={24} color={theme.colors.primary} />
            <Text style={styles.addButtonText}>Add Loan</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Debt</Text>
            <Text style={styles.summaryValueLeft}>{formatCurrencyAmount(totalBalance, defaultCurrency, defaultCurrency)}</Text>
          </View>
          <View style={[styles.summaryRow, { marginBottom: 0 }]}>
            <Text style={styles.summaryLabel}>Monthly Payments</Text>
            <Text style={styles.summaryValueLeft}>{formatCurrencyAmount(totalMonthlyPayment, defaultCurrency, defaultCurrency)}</Text>
          </View>
        </View>
      </View>
      
      {loans.length === 0 ? (
        <NoLoansEmptyState onAddLoan={() => navigation.navigate('AddLoan')} />
      ) : (
        <FlatList
          data={loans}
          renderItem={renderLoanItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};