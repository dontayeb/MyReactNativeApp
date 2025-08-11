import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { dataService } from '../../services/dataService';

interface Loan {
  id: string;
  lender: string;
  currency: string;
}

interface AddPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onPaymentAdded: () => void;
  loan: Loan;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  visible,
  onClose,
  onPaymentAdded,
  loan,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { user } = useAuth();
  
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [paymentType, setPaymentType] = useState<'regular' | 'additional' | 'extra' | 'minimum'>('additional');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setPaymentType('additional');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }

    try {
      setIsSubmitting(true);

      const paymentData = {
        user_id: user.id,
        loan_id: loan.id,
        amount: parseFloat(amount),
        payment_date: paymentDate,
        payment_type: paymentType,
        notes: notes.trim() || null,
        statement_id: null,
        is_minimum_payment: paymentType === 'minimum',
        is_late_payment: false,
        days_late: 0,
      };

      await dataService.createLoanPayment(paymentData);
      
      Alert.alert(
        'Success',
        `Payment of ${loan.currency} ${amount} has been added successfully.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onPaymentAdded();
              handleClose();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error adding payment:', error);
      Alert.alert(
        'Error',
        'Failed to add payment. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      padding: 4,
    },
    content: {
      padding: 20,
    },
    loanInfo: {
      backgroundColor: theme.colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 20,
    },
    loanName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    loanId: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    formGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
    },
    textArea: {
      height: 80,
      textAlignVertical: 'top',
    },
    paymentTypeContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    paymentTypeButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    paymentTypeButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    paymentTypeText: {
      fontSize: 14,
      color: theme.colors.text,
    },
    paymentTypeTextActive: {
      color: 'white',
      fontWeight: '600',
    },
    submitButton: {
      backgroundColor: theme.colors.primary,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 20,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButton: {
      backgroundColor: theme.colors.surface,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 10,
    },
    cancelButtonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={handleClose}
        />
        
        <View style={styles.modal}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.header}>
              <View style={{ width: 24 }} />
              <Text style={styles.title}>Add Payment</Text>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.loanInfo}>
                <Text style={styles.loanName}>{loan.lender}</Text>
                <Text style={styles.loanId}>ID: {loan.id}</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Payment Amount ({loan.currency})</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Payment Date</Text>
                <TextInput
                  style={styles.input}
                  value={paymentDate}
                  onChangeText={setPaymentDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Payment Type</Text>
                <View style={styles.paymentTypeContainer}>
                  {[
                    { key: 'additional', label: 'Additional' },
                    { key: 'extra', label: 'Extra' },
                    { key: 'minimum', label: 'Minimum' },
                    { key: 'regular', label: 'Regular' },
                  ].map((type) => (
                    <TouchableOpacity
                      key={type.key}
                      style={[
                        styles.paymentTypeButton,
                        paymentType === type.key && styles.paymentTypeButtonActive,
                      ]}
                      onPress={() => setPaymentType(type.key as any)}
                    >
                      <Text
                        style={[
                          styles.paymentTypeText,
                          paymentType === type.key && styles.paymentTypeTextActive,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any notes about this payment..."
                  multiline
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (isSubmitting || !amount) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting || !amount}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Adding Payment...' : 'Add Payment'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};