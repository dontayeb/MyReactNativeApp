import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { dataService, CreditCardStatement } from '../../services/dataService';
import { formatCurrencyAmount } from '../../utils/currencyUtils';

interface CreditCardStatementViewProps {
  loanId: string;
  currency: string;
}

export const CreditCardStatementView: React.FC<CreditCardStatementViewProps> = ({
  loanId,
  currency,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { user } = useAuth();
  const { defaultCurrency } = useCurrency();
  
  const [statements, setStatements] = useState<CreditCardStatement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedStatement, setExpandedStatement] = useState<string | null>(null);

  const loadStatements = async () => {
    if (!user?.id || !loanId) return;

    try {
      const data = await dataService.getCreditCardStatements(user.id, loanId);
      setStatements(data);
    } catch (error) {
      console.error('Error loading credit card statements:', error);
      Alert.alert('Error', 'Failed to load statements');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStatements();
  }, [user?.id, loanId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStatements();
  };

  const formatCurrency = (amount: number) => {
    return formatCurrencyAmount(amount, currency, defaultCurrency);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatementStatus = (statement: CreditCardStatement) => {
    const today = new Date();
    const dueDate = new Date(statement.payment_due_date);
    
    if (statement.is_payment_received) {
      return { status: 'paid', color: '#059669', icon: 'checkmark-circle' };
    } else if (dueDate < today) {
      return { status: 'overdue', color: '#DC2626', icon: 'alert-circle' };
    } else {
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 7) {
        return { status: 'due_soon', color: '#F59E0B', icon: 'time' };
      }
      return { status: 'current', color: '#6B7280', icon: 'document-text' };
    }
  };

  const generateStatement = async () => {
    if (!loanId) return;

    try {
      setIsLoading(true);
      await dataService.generateMonthlyStatement(loanId);
      Alert.alert('Success', 'Monthly statement generated successfully');
      loadStatements();
    } catch (error) {
      console.error('Error generating statement:', error);
      Alert.alert('Error', 'Failed to generate statement');
    } finally {
      setIsLoading(false);
    }
  };

  const recordPayment = async (statementId: string, statement: CreditCardStatement) => {
    Alert.prompt(
      'Record Payment',
      `Enter payment amount for statement dated ${formatDate(statement.statement_date)}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Record',
          onPress: async (paymentAmount) => {
            if (!paymentAmount || isNaN(parseFloat(paymentAmount))) {
              Alert.alert('Error', 'Please enter a valid amount');
              return;
            }

            try {
              const amount = parseFloat(paymentAmount);
              const paymentDate = new Date().toISOString().split('T')[0];
              
              await dataService.recordSimplePayment(statementId, amount, paymentDate);
              Alert.alert('Success', 'Payment recorded successfully');
              loadStatements();
            } catch (error) {
              console.error('Error recording payment:', error);
              Alert.alert('Error', 'Failed to record payment');
            }
          },
        },
      ],
      'plain-text',
      statement.minimum_payment_due.toString()
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      marginBottom: 16,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    generateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    generateButtonText: {
      color: 'white',
      fontSize: 12,
      fontWeight: '600',
      marginLeft: 4,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    emptyStateText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 16,
    },
    statementCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      marginBottom: 12,
      overflow: 'hidden',
    },
    statementHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    statusIcon: {
      marginRight: 12,
    },
    statementInfo: {
      flex: 1,
    },
    statementDate: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    statementSummary: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    amountContainer: {
      alignItems: 'flex-end',
    },
    newBalance: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    minimumDue: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    expandButton: {
      padding: 8,
    },
    expandedContent: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      padding: 16,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    detailLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
    },
    actionButtons: {
      flexDirection: 'row',
      marginTop: 16,
      gap: 12,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: 10,
      borderRadius: 8,
    },
    actionButtonSecondary: {
      backgroundColor: theme.colors.surface,
    },
    actionButtonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 6,
    },
    actionButtonTextSecondary: {
      color: theme.colors.text,
    },
  });

  if (isLoading && statements.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Credit Card Statements</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="document-text" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.emptyStateText}>Loading statements...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Credit Card Statements</Text>
        <TouchableOpacity style={styles.generateButton} onPress={generateStatement}>
          <Ionicons name="add" size={16} color="white" />
          <Text style={styles.generateButtonText}>Generate</Text>
        </TouchableOpacity>
      </View>

      {statements.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.emptyStateText}>
            No statements found.{'\n'}Generate your first statement to get started.
          </Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {statements.map((statement) => {
            const statusInfo = getStatementStatus(statement);
            const isExpanded = expandedStatement === statement.id;

            return (
              <View key={statement.id} style={styles.statementCard}>
                <View style={styles.statementHeader}>
                  <Ionicons
                    name={statusInfo.icon as any}
                    size={24}
                    color={statusInfo.color}
                    style={styles.statusIcon}
                  />
                  
                  <View style={styles.statementInfo}>
                    <Text style={styles.statementDate}>
                      {formatDate(statement.statement_date)}
                    </Text>
                    <Text style={styles.statementSummary}>
                      Due: {formatDate(statement.payment_due_date)} • {statusInfo.status.replace('_', ' ')}
                    </Text>
                  </View>

                  <View style={styles.amountContainer}>
                    <Text style={styles.newBalance}>
                      {formatCurrency(statement.new_balance)}
                    </Text>
                    <Text style={styles.minimumDue}>
                      Min: {formatCurrency(statement.minimum_payment_due)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => setExpandedStatement(isExpanded ? null : statement.id)}
                  >
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Previous Balance</Text>
                      <Text style={styles.detailValue}>{formatCurrency(statement.previous_balance)}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Payments & Credits</Text>
                      <Text style={styles.detailValue}>{formatCurrency(statement.payments_credits)}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Purchases & Charges</Text>
                      <Text style={styles.detailValue}>{formatCurrency(statement.purchases_charges)}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Interest Charged</Text>
                      <Text style={styles.detailValue}>{formatCurrency(statement.interest_charged)}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Fees Charged</Text>
                      <Text style={styles.detailValue}>{formatCurrency(statement.fees_charged)}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Available Credit</Text>
                      <Text style={styles.detailValue}>{formatCurrency(statement.available_credit)}</Text>
                    </View>

                    {!statement.is_payment_received && (
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => recordPayment(statement.id, statement)}
                        >
                          <Ionicons name="card" size={16} color="white" />
                          <Text style={styles.actionButtonText}>Pay</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionButtonSecondary]}
                          onPress={() => {/* Handle view details */}}
                        >
                          <Ionicons name="eye" size={16} color={theme.colors.text} />
                          <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
                            Details
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};