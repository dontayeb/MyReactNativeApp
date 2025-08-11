import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { dataService } from '../../services/dataService';

interface DeleteAccountScreenProps {
  navigation: any;
}

export const DeleteAccountScreen: React.FC<DeleteAccountScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { user, signOut } = useAuth();
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmationText.trim() !== 'DELETE') {
      Alert.alert('Error', t('confirmationTextIncorrect'));
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    Alert.alert(
      t('deleteAccountConfirmation'),
      t('deleteAccountWarningText'),
      [
        {
          text: t('cancel'),
          style: 'cancel'
        },
        {
          text: t('deleteAccountConfirmation'),
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              // Delete user account and all associated data
              await dataService.deleteUserAccount(user.id);
              
              // Sign out user
              await signOut();
              
              // Show success message
              Alert.alert(
                'Success',
                t('accountDeletedSuccessfully'),
                [{ text: 'OK' }]
              );
            } catch (error: any) {
              console.error('Account deletion error:', error);
              Alert.alert(
                'Error',
                error.message || t('deleteAccountFailed')
              );
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      paddingTop: 10,
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
    warningContainer: {
      backgroundColor: theme.isDark ? '#4C1D1D' : '#FEF2F2',
      borderWidth: 1,
      borderColor: theme.isDark ? '#7F1D1D' : '#FECACA',
      borderRadius: 12,
      padding: 20,
      marginBottom: 32,
    },
    warningIcon: {
      alignSelf: 'center',
      marginBottom: 12,
    },
    warningTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.isDark ? '#FCA5A5' : '#DC2626',
      textAlign: 'center',
      marginBottom: 12,
    },
    warningText: {
      fontSize: 14,
      color: theme.isDark ? '#FCA5A5' : '#B91C1C',
      lineHeight: 20,
      textAlign: 'center',
    },
    instructionsContainer: {
      marginBottom: 24,
    },
    instructionsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    instructionsText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginBottom: 16,
    },
    inputContainer: {
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
    },
    inputFocused: {
      borderColor: theme.colors.primary,
    },
    inputError: {
      borderColor: '#EF4444',
    },
    placeholder: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 8,
      fontStyle: 'italic',
    },
    deleteButton: {
      backgroundColor: '#DC2626',
      height: 50,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 32,
    },
    deleteButtonDisabled: {
      backgroundColor: theme.colors.border,
      opacity: 0.5,
    },
    deleteButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.border,
      height: 50,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
    },
    cancelButtonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    consequencesList: {
      marginTop: 20,
    },
    consequenceItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    consequenceIcon: {
      marginRight: 12,
      marginTop: 2,
    },
    consequenceText: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
  });

  const isDeleteEnabled = confirmationText.trim() === 'DELETE';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('deleteAccountTitle')}</Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.warningContainer}>
          <Ionicons 
            name="warning" 
            size={32} 
            color={theme.isDark ? '#FCA5A5' : '#DC2626'} 
            style={styles.warningIcon}
          />
          <Text style={styles.warningTitle}>
            {t('deleteAccountWarning')}
          </Text>
          <Text style={styles.warningText}>
            {t('deleteAccountWarningText')}
          </Text>

          <View style={styles.consequencesList}>
            <View style={styles.consequenceItem}>
              <Ionicons 
                name="remove-circle" 
                size={16} 
                color={theme.isDark ? '#FCA5A5' : '#DC2626'} 
                style={styles.consequenceIcon}
              />
              <Text style={styles.consequenceText}>
                All financial data (assets, loans, payments) will be permanently deleted
              </Text>
            </View>
            
            <View style={styles.consequenceItem}>
              <Ionicons 
                name="remove-circle" 
                size={16} 
                color={theme.isDark ? '#FCA5A5' : '#DC2626'} 
                style={styles.consequenceIcon}
              />
              <Text style={styles.consequenceText}>
                Your account profile and settings will be removed
              </Text>
            </View>
            
            <View style={styles.consequenceItem}>
              <Ionicons 
                name="remove-circle" 
                size={16} 
                color={theme.isDark ? '#FCA5A5' : '#DC2626'} 
                style={styles.consequenceIcon}
              />
              <Text style={styles.consequenceText}>
                All cached and encrypted data will be cleared from this device
              </Text>
            </View>
            
            <View style={styles.consequenceItem}>
              <Ionicons 
                name="remove-circle" 
                size={16} 
                color={theme.isDark ? '#FCA5A5' : '#DC2626'} 
                style={styles.consequenceIcon}
              />
              <Text style={styles.consequenceText}>
                This action cannot be undone - you'll need to create a new account to use the app again
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>
            Confirmation Required
          </Text>
          <Text style={styles.instructionsText}>
            {t('deleteAccountInstructions')}
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                confirmationText.trim() !== '' && confirmationText.trim() !== 'DELETE' ? styles.inputError : null
              ]}
              value={confirmationText}
              onChangeText={setConfirmationText}
              placeholder={t('typeDeleteToConfirm')}
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isDeleting}
            />
            <Text style={styles.placeholder}>
              Type exactly: DELETE
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.deleteButton,
            (!isDeleteEnabled || isDeleting) && styles.deleteButtonDisabled
          ]}
          onPress={handleDeleteAccount}
          disabled={!isDeleteEnabled || isDeleting}
        >
          <Text style={styles.deleteButtonText}>
            {isDeleting ? 'Deleting Account...' : t('deleteAccountConfirmation')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isDeleting}
        >
          <Text style={styles.cancelButtonText}>
            {t('cancel')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};