import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { CURRENCIES } from '../../constants/currencies';
import { formatNumberWithCommas, parseFormattedNumber, isValidNumber, formatNumberForDisplay } from '../../utils/numberFormatting';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../contexts/AuthContext';

interface AssetDetailScreenProps {
  navigation: any;
  route: any;
}

export const AssetDetailScreen: React.FC<AssetDetailScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { defaultCurrency } = useCurrency();
  const { user } = useAuth();
  
  const { asset } = route.params;

  const [formData, setFormData] = useState({
    name: asset.name || '',
    type: asset.type || 'stocks',
    value: asset.value ? formatNumberForDisplay(asset.value, 0) : '',
    currency: asset.currency || defaultCurrency,
    symbol: asset.symbol || '',
  });

  const assetTypes = [
    { value: 'stocks', label: 'Stocks' },
    { value: 'crypto', label: 'Cryptocurrency' },
    { value: 'savings', label: 'Savings Account' },
    { value: 'property', label: 'Real Estate' },
    { value: 'bonds', label: 'Bonds' },
    { value: 'commodities', label: 'Commodities' },
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

  const handleUpdate = () => {
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

    Alert.alert(
      'Success',
      'Asset updated successfully!',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Asset',
      'Are you sure you want to delete this asset? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await dataService.deleteAsset(asset.id);
              Alert.alert(
                'Success',
                'Asset deleted successfully!',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } catch (error) {
              console.error('Error deleting asset:', error);
              Alert.alert(
                'Error',
                'Failed to delete asset. Please try again.',
                [{ text: 'OK' }]
              );
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
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      marginRight: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    deleteButton: {
      padding: 8,
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
    updateButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 20,
    },
    updateButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
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
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Asset</Text>
        </View>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
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
          <Text style={styles.label}>Symbol (Optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.symbol}
            onChangeText={(value) => handleInputChange('symbol', value)}
            placeholder="e.g., AAPL, BTC"
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="characters"
          />
          <Text style={styles.helpText}>Stock ticker symbol or cryptocurrency code</Text>
        </View>

        <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
          <Text style={styles.updateButtonText}>Update Asset</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};