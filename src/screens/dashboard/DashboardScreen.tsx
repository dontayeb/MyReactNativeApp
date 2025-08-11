import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { dataService } from '../../services/dataService';
import { appStateService } from '../../services/appStateService';
import { formatCurrencyAmount, convertToDefaultCurrency, formatNetWorthAmount, formatCurrencyMobile } from '../../utils/currencyUtils';
import { useCurrency } from '../../contexts/CurrencyContext';
import { ProfileCompletionBanner } from '../../components/ProfileCompletionBanner';
import { OfflineBanner } from '../../components/OfflineBanner';
import { DashboardSkeleton } from '../../components/LoadingStates';
import { SkeletonLoader } from '../../components/SkeletonLoader';

interface DashboardScreenProps {
  navigation?: any;
}

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

interface Asset {
  id: string;
  name: string;
  type: 'bank' | 'investment' | 'property' | 'vehicle' | 'other';
  value: number;
  change: number;
  changePercent: number;
  symbol?: string;
  last_valued?: string;
  currency?: string;
}

interface UpcomingEvent {
  id: string;
  type: 'payment' | 'valuation';
  title: string;
  subtitle: string;
  date: Date;
  daysUntil: number;
  icon: string;
  amount?: number;
  currency?: string;
  navigationTarget?: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { user } = useAuth();
  const { defaultCurrency } = useCurrency();

  // Dynamic data from Supabase
  const [loans, setLoans] = useState<Loan[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Register for app state refresh
  useEffect(() => {
    appStateService.onSessionRefresh(async () => {
      if (user?.id) {
        console.log('Dashboard: Refreshing data after app state change');
        await loadUserData();
      }
    });
  }, [user?.id]);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadUserData();
      }
    }, [user?.id])
  );

  const loadUserData = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      console.log('Loading data for user:', user.id);
      
      // Load loans and assets from Supabase
      const [loansData, assetsData] = await Promise.all([
        dataService.getLoans(user.id),
        dataService.getAssets(user.id)
      ]);

      console.log('Loaded loans:', loansData.length);
      console.log('Loaded assets:', assetsData.length);

      // Convert Supabase data to component format
      const formattedLoans = loansData.map(loan => ({
        id: loan.id,
        lender: loan.name,
        amount: loan.principal || 0,
        interestRate: loan.interest_rate,
        remainingBalance: loan.current_balance || loan.principal || 0, // Will be recalculated by calculateCurrentBalance
        loanTerm: loan.term_months || 0,
        startDate: loan.start_date || '',
        currency: loan.currency,
        type: loan.loan_type as 'amortized' | 'credit_card' | 'line_of_credit',
        creditLimit: loan.credit_limit || 0,
        currentBalance: loan.current_balance || 0,
        minimumPaymentPercentage: loan.minimum_payment_percentage || 0,
        dueDate: loan.due_date || '',
        statementDate: loan.statement_date || ''
      }));

      const formattedAssets = assetsData.map(asset => ({
        id: asset.id,
        name: asset.name,
        type: asset.type as 'bank' | 'investment' | 'property' | 'vehicle' | 'other',
        value: asset.value,
        change: 0, // We don't track changes yet
        changePercent: 0,
        symbol: undefined,
        last_valued: asset.last_valued,
        currency: asset.currency || defaultCurrency
      }));

      setLoans(formattedLoans);
      setAssets(formattedAssets);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMonthlyPayment = (loan: Loan) => {
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

  const getUpcomingEvents = (): UpcomingEvent[] => {
    const today = new Date();
    const events: UpcomingEvent[] = [];

    // Add loan payment events
    (loansWithCurrentBalances || []).forEach(loan => {
      if (loan.type === 'amortized' && loan.startDate) {
        const startDate = new Date(loan.startDate);
        const paymentsCompleted = Math.round((loan.amount - loan.currentBalance) / calculateMonthlyPayment(loan));
        
        // Calculate next payment date
        const nextPaymentDate = new Date(startDate);
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + paymentsCompleted + 1);
        
        const daysUntil = Math.ceil((nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil >= 0 && daysUntil <= 30) {
          const monthlyPayment = calculateMonthlyPayment(loan);
          events.push({
            id: `payment-${loan.id}`,
            type: 'payment',
            title: `${loan.lender} Payment`,
            subtitle: formatCurrency(monthlyPayment, loan.currency),
            date: nextPaymentDate,
            daysUntil,
            icon: getLoanIcon(loan.type),
            amount: monthlyPayment,
            currency: loan.currency,
            navigationTarget: { screen: 'LoanDetails', params: { loan } }
          });
        }
      } else if ((loan.type === 'credit_card' || loan.type === 'line_of_credit') && loan.dueDate) {
        // Handle credit card/LOC due dates
        const dueDate = new Date(loan.dueDate);
        const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil >= 0 && daysUntil <= 30) {
          const minPayment = calculateMonthlyPayment(loan);
          events.push({
            id: `payment-${loan.id}`,
            type: 'payment',
            title: `${loan.lender} Payment`,
            subtitle: `Min: ${formatCurrency(minPayment, loan.currency)}`,
            date: dueDate,
            daysUntil,
            icon: getLoanIcon(loan.type),
            amount: minPayment,
            currency: loan.currency,
            navigationTarget: { screen: 'LoanDetails', params: { loan } }
          });
        }
      }
    });

    // Add asset valuation events
    (assets || []).forEach(asset => {
      if (asset.last_valued) {
        const lastValuedDate = new Date(asset.last_valued);
        const nextValuationDate = new Date(lastValuedDate);
        nextValuationDate.setFullYear(nextValuationDate.getFullYear() + 1);
        
        const daysUntil = Math.ceil((nextValuationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Show valuation reminders 30 days in advance
        if (daysUntil >= -7 && daysUntil <= 30) {
          events.push({
            id: `valuation-${asset.id}`,
            type: 'valuation',
            title: `${asset.name} Valuation`,
            subtitle: daysUntil < 0 ? 'Overdue for revaluation' : 'Time to update value',
            date: nextValuationDate,
            daysUntil,
            icon: getAssetIcon(asset.type),
            navigationTarget: { screen: 'Assets', params: { screen: 'AssetDetail', params: { asset } } }
          });
        }
      }
    });

    // Sort by date (most urgent first)
    return events.sort((a, b) => a.daysUntil - b.daysUntil);
  };

  const upcomingEvents = getUpcomingEvents();

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return formatCurrencyAmount(amount, currency, defaultCurrency);
  };

  const getLoanIcon = (type: string) => {
    switch (type) {
      case 'amortized': return 'cash-outline';
      case 'credit_card': return 'card-outline';
      case 'line_of_credit': return 'trending-up-outline';
      default: return 'cash-outline';
    }
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'bank': return 'wallet';
      case 'investment': return 'trending-up';
      case 'property': return 'home';
      case 'vehicle': return 'car';
      case 'other': return 'ellipsis-horizontal';
      default: return 'wallet';
    }
  };

  const calculateCurrentBalance = (loan: Loan) => {
    if (loan.type !== 'amortized') {
      // For credit cards and line of credit, use the static remainingBalance
      return loan.remainingBalance;
    }

    const today = new Date();
    const startDate = new Date(loan.startDate);
    const monthsElapsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)); // Average days per month
    
    if (monthsElapsed <= 0) {
      return loan.amount;
    }

    const monthlyPayment = calculateMonthlyPayment(loan);
    const monthlyRate = (loan.interestRate / 100) / 12;
    
    let remainingBalance = loan.amount;
    const paymentsToProcess = Math.min(monthsElapsed, loan.loanTerm);

    for (let i = 0; i < paymentsToProcess; i++) {
      const interestPayment = remainingBalance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingBalance -= principalPayment;
      
      if (remainingBalance <= 0) {
        return 0;
      }
    }

    return Math.max(0, remainingBalance);
  };

  // Calculate totals with dynamic balances
  const loansWithCurrentBalances = loans?.map(loan => ({
    ...loan,
    currentBalance: calculateCurrentBalance(loan)
  })) || [];

  const totalAssets = assets?.reduce((sum, asset) => {
    const assetCurrency = asset.currency || defaultCurrency;
    return sum + convertToDefaultCurrency(asset.value, assetCurrency, defaultCurrency);
  }, 0) || 0;
  const totalLiabilities = loansWithCurrentBalances.reduce((sum, loan) => {
    return sum + convertToDefaultCurrency(loan.currentBalance, loan.currency, defaultCurrency);
  }, 0);
  const totalMonthlyPayments = loans?.reduce((sum, loan) => {
    // Only include fixed monthly payments (exclude lines of credit)
    if (loan.type === 'line_of_credit') {
      return sum;
    }
    return sum + convertToDefaultCurrency(calculateMonthlyPayment(loan), loan.currency, defaultCurrency);
  }, 0) || 0;

  // Show loading state
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <SkeletonLoader />
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 8,
    },
    greeting: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.colors.text,
      marginBottom: 6,
      letterSpacing: -0.8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      fontWeight: '500',
      letterSpacing: 0.2,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 3,
    },
    summarySection: {
      marginBottom: 8,
    },
    summaryCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    summaryLabel: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
      marginBottom: 4,
    },
    summaryValue: {
      fontSize: 28,
      fontWeight: 'bold',
      color: 'white',
    },
    netWorthCard: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      marginBottom: 32,
      overflow: 'hidden',
    },
    netWorthSection: {
      padding: 28,
      alignItems: 'center',
    },
    netWorthLabel: {
      fontSize: 16,
      color: 'rgba(255, 255, 255, 0.85)',
      marginBottom: 12,
      textAlign: 'center',
      fontWeight: '500',
      letterSpacing: 0.5,
    },
    netWorthValue: {
      fontSize: 28,
      fontWeight: '700',
      color: 'white',
      textAlign: 'center',
      letterSpacing: -0.5,
      lineHeight: 32,
    },
    breakdownSection: {
      paddingTop: 16,
      paddingHorizontal: 28,
      paddingBottom: 28,
    },
    breakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    breakdownItem: {
      flex: 1,
      alignItems: 'center',
    },
    breakdownLabel: {
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.75)',
      marginBottom: 6,
      fontWeight: '500',
      letterSpacing: 0.3,
    },
    breakdownValue: {
      fontSize: 16,
      fontWeight: '700',
      color: 'white',
      letterSpacing: -0.5,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 16,
      letterSpacing: -0.5,
    },
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    quickActionCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      width: '48%',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    quickActionIcon: {
      marginBottom: 12,
    },
    quickActionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 6,
      letterSpacing: -0.3,
    },
    quickActionSubtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: '500',
      lineHeight: 18,
    },
    emptyState: {
      alignItems: 'center',
      padding: 20,
    },
    emptyStateIcon: {
      marginBottom: 16,
    },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    paymentsContainer: {
      marginBottom: 24,
    },
    paymentCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    paymentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    paymentTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    paymentIcon: {
      marginRight: 12,
    },
    paymentTitleInfo: {
      flex: 1,
    },
    paymentLender: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    paymentAmount: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    paymentDue: {
      alignItems: 'flex-end',
    },
    daysUntilDue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.primary,
      marginBottom: 2,
    },
    urgentPayment: {
      color: '#EF4444',
    },
    overduePayment: {
      color: '#DC2626',
      fontWeight: '700',
    },
    valuationCard: {
      borderLeftWidth: 4,
      borderLeftColor: '#F59E0B',
    },
    overdueCard: {
      borderLeftWidth: 4,
      borderLeftColor: '#EF4444',
    },
    paymentDate: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    halfWidth: {
      width: '48%',
    },
    overviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    viewAllText: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    overviewCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    overviewItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    overviewItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    overviewIcon: {
      marginRight: 8,
    },
    overviewItemInfo: {
      flex: 1,
    },
    overviewItemName: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    overviewItemValue: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    overviewItemRight: {
      alignItems: 'center',
      flexDirection: 'row',
    },
    overviewChangeText: {
      fontSize: 11,
      fontWeight: '600',
      marginLeft: 2,
    },
    overviewPaymentText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.text,
    },
    overviewPaymentLabel: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      marginLeft: 4,
    },
    loansList: {
      marginBottom: 24,
    },
    loanCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    loanHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    loanTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    loanIcon: {
      marginRight: 12,
    },
    loanTitleInfo: {
      flex: 1,
    },
    loanName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    loanSymbol: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: '500',
      marginTop: 2,
    },
    loanValueColumn: {
      alignItems: 'flex-end',
    },
    loanValue: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    paymentRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    paymentText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    dueDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dueDateText: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      marginLeft: 4,
    },
    assetsList: {
      marginBottom: 24,
    },
    assetCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    assetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    assetTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    assetIcon: {
      marginRight: 12,
    },
    assetTitleInfo: {
      flex: 1,
    },
    assetName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    assetSymbol: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: '500',
      marginTop: 2,
    },
    assetValueColumn: {
      alignItems: 'flex-end',
    },
    assetValue: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    changeRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    lastUpdatedText: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      marginLeft: 4,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back, {user?.username}!</Text>
        <Text style={styles.subtitle}>Here's your financial overview</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <OfflineBanner />
        
        <View style={styles.summarySection}>
          <ProfileCompletionBanner 
            onPress={() => navigation?.navigate('Settings', { 
              screen: 'ProfileEdit' 
            })}
          />
        </View>
        
        <View style={styles.summarySection}>
          <View style={styles.netWorthCard}>
            <View style={styles.netWorthSection}>
              <Text style={styles.netWorthLabel}>{t('netWorth')}</Text>
              <Text style={styles.netWorthValue}>{formatCurrencyAmount(totalAssets - totalLiabilities, defaultCurrency, defaultCurrency)}</Text>
            </View>
            
            <View style={styles.breakdownSection}>
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>{t('totalAssets')}</Text>
                  <Text style={styles.breakdownValue}>{formatCurrencyAmount(totalAssets, defaultCurrency, defaultCurrency)}</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>{t('totalLiabilities')}</Text>
                  <Text style={styles.breakdownValue}>{formatCurrencyAmount(totalLiabilities, defaultCurrency, defaultCurrency)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.overviewHeader}>
          <Text style={styles.sectionTitle}>Loans</Text>
          <TouchableOpacity onPress={() => navigation?.navigate('Loans', { screen: 'LoansList' })}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loansList}>
          {(loansWithCurrentBalances || []).map((loan) => (
            <TouchableOpacity 
              key={loan.id} 
              style={styles.loanCard}
              onPress={() => navigation?.navigate('LoanDetails', { loan })}
            >
              <View style={styles.loanHeader}>
                <View style={styles.loanTitleRow}>
                  <Ionicons 
                    name={getLoanIcon(loan.type)} 
                    size={24} 
                    color={theme.colors.primary} 
                    style={styles.loanIcon}
                  />
                  <View style={styles.loanTitleInfo}>
                    <Text style={styles.loanName}>{loan.lender}</Text>
                    <Text style={styles.loanSymbol}>
                      {loan.interestRate}% APR
                    </Text>
                  </View>
                </View>
                <View style={styles.loanValueColumn}>
                  <Text style={styles.loanValue}>{formatCurrency(loan.currentBalance, loan.currency)}</Text>
                  <View style={styles.paymentRow}>
                    {loan.type === 'line_of_credit' ? (
                      <Text style={styles.paymentText}>
                        Available: {formatCurrency(loan.creditLimit - loan.currentBalance, loan.currency)}
                      </Text>
                    ) : loan.type === 'credit_card' ? (
                      <View style={styles.dueDateRow}>
                        <Ionicons 
                          name="calendar-outline" 
                          size={12} 
                          color={theme.colors.textSecondary} 
                        />
                        <Text style={styles.dueDateText}>
                          {loan.dueDate ? 
                            `Due ${new Date(loan.dueDate).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}` : 
                            'No due date'
                          }
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.dueDateRow}>
                        <Ionicons 
                          name="calendar-outline" 
                          size={12} 
                          color={theme.colors.textSecondary} 
                        />
                        <Text style={styles.dueDateText}>
                          {(() => {
                            // Calculate next payment date for amortized loans
                            if (loan.type === 'amortized' && loan.startDate) {
                              const startDate = new Date(loan.startDate);
                              const today = new Date();
                              
                              // Calculate months elapsed since start date
                              let monthsElapsed = (today.getFullYear() - startDate.getFullYear()) * 12 + 
                                                  (today.getMonth() - startDate.getMonth());
                              
                              // Adjust for day of month - if current day is before start day, subtract 1 month
                              if (today.getDate() < startDate.getDate()) {
                                monthsElapsed--;
                              }
                              
                              // Next payment is one month after the last payment made
                              const nextPaymentDate = new Date(startDate);
                              nextPaymentDate.setMonth(nextPaymentDate.getMonth() + monthsElapsed + 1);
                              
                              // Handle month-end edge cases
                              const startDay = startDate.getDate();
                              if (nextPaymentDate.getDate() !== startDay) {
                                nextPaymentDate.setDate(0); // Set to last day of previous month
                              }
                              
                              // Check if loan is already paid off
                              if (monthsElapsed >= loan.loanTerm) {
                                return 'Paid off';
                              }
                              
                              return `Due ${nextPaymentDate.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}`;
                            }
                            return 'No due date';
                          })()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.overviewHeader}>
          <Text style={styles.sectionTitle}>Assets</Text>
          <TouchableOpacity onPress={() => navigation?.navigate('Assets', { screen: 'AssetsList' })}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.assetsList}>
          {(assets || []).map((asset) => (
            <TouchableOpacity 
              key={asset.id} 
              style={styles.assetCard}
              onPress={() => navigation?.navigate('Assets', { 
                screen: 'AssetDetail', 
                params: { asset } 
              })}
            >
              <View style={styles.assetHeader}>
                <View style={styles.assetTitleRow}>
                  <Ionicons 
                    name={getAssetIcon(asset.type)} 
                    size={24} 
                    color={theme.colors.primary} 
                    style={styles.assetIcon}
                  />
                  <View style={styles.assetTitleInfo}>
                    <Text style={styles.assetName}>{asset.name}</Text>
                    <Text style={styles.assetSymbol}>
                      {asset.symbol ? asset.symbol : asset.type.charAt(0).toUpperCase() + asset.type.slice(1)}
                    </Text>
                  </View>
                </View>
                <View style={styles.assetValueColumn}>
                  <Text style={styles.assetValue}>{formatCurrency(asset.value, asset.currency)}</Text>
                  <View style={styles.changeRow}>
                    <Ionicons 
                      name="time-outline" 
                      size={12} 
                      color={theme.colors.textSecondary} 
                    />
                    <Text style={styles.lastUpdatedText}>
                      {asset.last_valued ? 
                        `Updated ${new Date(asset.last_valued).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}` : 
                        'Never updated'
                      }
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={styles.quickActionCard}
            onPress={() => navigation?.navigate('AddAsset')}
          >
            <Ionicons 
              name="add-circle" 
              size={24} 
              color={theme.colors.primary} 
              style={styles.quickActionIcon}
            />
            <Text style={styles.quickActionTitle}>{t('addAsset')}</Text>
            <Text style={styles.quickActionSubtitle}>Add new asset</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionCard}
            onPress={() => navigation?.navigate('AddLoan')}
          >
            <Ionicons 
              name="card" 
              size={24} 
              color={theme.colors.primary} 
              style={styles.quickActionIcon}
            />
            <Text style={styles.quickActionTitle}>{t('addLoan')}</Text>
            <Text style={styles.quickActionSubtitle}>Add new loan</Text>
          </TouchableOpacity>


        </View>

      </ScrollView>
    </SafeAreaView>
  );
};