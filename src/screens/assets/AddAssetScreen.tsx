import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { CURRENCIES } from '../../constants/currencies';
import { formatNumberWithCommas, parseFormattedNumber, isValidNumber } from '../../utils/numberFormatting';
import { useAuth } from '../../contexts/AuthContext';
import { dataService } from '../../services/dataService';
import { notificationService } from '../../services/notificationService';

interface AddAssetScreenProps {
  navigation: any;
}

export const AddAssetScreen: React.FC<AddAssetScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { defaultCurrency } = useCurrency();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    type: 'bank',
    value: '',
    currency: defaultCurrency,
    lastValued: new Date().toISOString().split('T')[0], // Today's date by default
  });

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateValue, setDateValue] = useState(new Date());

  const assetTypes = [
    { value: 'bank', label: 'Bank Account' },
    { value: 'investment', label: 'Investment' },
    { value: 'property', label: 'Real Estate' },
    { value: 'vehicle', label: 'Vehicle' },
    { value: 'other', label: 'Other' },
  ];

  const handleInputChange = (field: string, value: string) => {
    if (field === 'value') {
      // Format money input with commas
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

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || dateValue;
    setShowDatePicker(Platform.OS === 'ios');
    setDateValue(currentDate);
    setFormData(prev => ({ ...prev, lastValued: formatDate(currentDate) }));
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to add an asset');
      return;
    }

    if (!formData.name || !formData.value) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!isValidNumber(formData.value)) {
      Alert.alert('Error', 'Please enter a valid number for the value');
      return;
    }

    const numericValue = parseFormattedNumber(formData.value);
    if (numericValue <= 0) {
      Alert.alert('Error', 'Please enter a positive number for the value');
      return;
    }

    try {
      const newAsset = await dataService.createAsset({
        user_id: user.id,
        name: formData.name,
        type: formData.type,
        value: numericValue,
        currency: formData.currency,
        last_valued: formData.lastValued,
      });

      // Schedule valuation reminder notification (1 year from last valued date)
      if (newAsset && newAsset.id) {
        try {
          await notificationService.scheduleAssetValuationReminder(
            newAsset.id,
            formData.name,
            new Date(formData.lastValued)
          );
        } catch (error) {
          console.error('Error scheduling asset valuation reminder:', error);
        }
      }

      Alert.alert(
        'Success', 
        'Asset added successfully! You\'ll be reminded to update its value in one year.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error creating asset:', error);
      Alert.alert('Error', 'Failed to add asset. Please try again.');
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
        <Text style={styles.title}>Add Asset</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formGroup}>
          <Text style={styles.requiredLabel}>
            Asset Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            placeholder="e.g., Apple Inc., Bitcoin, Savings Account"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.requiredLabel}>
            Asset Type <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.type}
              onValueChange={(value) => handleInputChange('type', value)}
              style={styles.picker}
            >
              {assetTypes.map((type) => (
                <Picker.Item
                  key={type.value}
                  label={type.label}
                  value={type.value}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.requiredLabel}>
            Current Value <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={formData.value}
            onChangeText={(value) => handleInputChange('value', value)}
            placeholder="0"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
          />
          <Text style={styles.helpText}>Enter the current market value</Text>
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
              {CURRENCIES.map((currency) => (
                <Picker.Item
                  key={currency.code}
                  label={`${currency.code} - ${currency.name}`}
                  value={currency.code}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.requiredLabel}>
            Last Valued <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {formatDateDisplay(dateValue)}
            </Text>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.helpText}>When was this asset last valued?</Text>
          {showDatePicker && (
            <DateTimePicker
              value={dateValue}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
            />
          )}
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Add Asset</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};