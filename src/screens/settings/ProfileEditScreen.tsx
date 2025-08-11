import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Ionicons } from '@expo/vector-icons';
import { AgeGroup, Gender, Country } from '../../types';
import { Dropdown } from '../../components/Dropdown';

interface ProfileEditScreenProps {
  navigation: any;
}

// Helper functions for number formatting (moved outside component)
const formatNumberWithCommas = (value: string): string => {
  // Remove non-numeric characters except decimal point
  const cleaned = value.replace(/[^\d.]/g, '');
  // Handle multiple decimal points
  const parts = cleaned.split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
};

const removeCommas = (value: string): string => {
  return value.replace(/,/g, '');
};

export const ProfileEditScreen: React.FC<ProfileEditScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { defaultCurrency } = useCurrency();
  const { user, updateProfile, checkUsernameAvailability } = useAuth();
  
  const [username, setUsername] = useState(user?.username || '');
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(user?.ageGroup as AgeGroup || null);
  const [gender, setGender] = useState<Gender | null>(user?.gender as Gender || null);
  const [country, setCountry] = useState<Country | null>(user?.country as Country || null);
  const [monthlySurvivalBudget, setMonthlySurvivalBudget] = useState(
    user?.monthlySurvivalBudget ? formatNumberWithCommas(user.monthlySurvivalBudget.toString()) : ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const handleBudgetChange = (text: string) => {
    const formatted = formatNumberWithCommas(text);
    setMonthlySurvivalBudget(formatted);
  };

  const ageGroups: { label: string; value: AgeGroup }[] = [
    { label: '18-24', value: '18-24' },
    { label: '25-34', value: '25-34' },
    { label: '35-44', value: '35-44' },
    { label: '45-54', value: '45-54' },
    { label: '55-64', value: '55-64' },
    { label: '65+', value: '65+' },
    { label: 'Prefer not to say', value: 'prefer-not-to-say' },
  ];

  const genders: { label: string; value: Gender }[] = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
  ];

  const countries: { label: string; value: Country }[] = [
    { label: 'Argentina', value: 'AR' },
    { label: 'Australia', value: 'AU' },
    { label: 'Austria', value: 'AT' },
    { label: 'Bangladesh', value: 'BD' },
    { label: 'Belgium', value: 'BE' },
    { label: 'Bolivia', value: 'BO' },
    { label: 'Brazil', value: 'BR' },
    { label: 'Cambodia', value: 'KH' },
    { label: 'Canada', value: 'CA' },
    { label: 'Chile', value: 'CL' },
    { label: 'China', value: 'CN' },
    { label: 'Colombia', value: 'CO' },
    { label: 'Costa Rica', value: 'CR' },
    { label: 'Cuba', value: 'CU' },
    { label: 'Czech Republic', value: 'CZ' },
    { label: 'Denmark', value: 'DK' },
    { label: 'Dominican Republic', value: 'DO' },
    { label: 'Ecuador', value: 'EC' },
    { label: 'Egypt', value: 'EG' },
    { label: 'El Salvador', value: 'SV' },
    { label: 'Fiji', value: 'FJ' },
    { label: 'Finland', value: 'FI' },
    { label: 'France', value: 'FR' },
    { label: 'Germany', value: 'DE' },
    { label: 'Ghana', value: 'GH' },
    { label: 'Greece', value: 'GR' },
    { label: 'Guatemala', value: 'GT' },
    { label: 'Honduras', value: 'HN' },
    { label: 'Hungary', value: 'HU' },
    { label: 'India', value: 'IN' },
    { label: 'Indonesia', value: 'ID' },
    { label: 'Ireland', value: 'IE' },
    { label: 'Israel', value: 'IL' },
    { label: 'Italy', value: 'IT' },
    { label: 'Jamaica', value: 'JM' },
    { label: 'Japan', value: 'JP' },
    { label: 'Kenya', value: 'KE' },
    { label: 'Laos', value: 'LA' },
    { label: 'Malaysia', value: 'MY' },
    { label: 'Mexico', value: 'MX' },
    { label: 'Morocco', value: 'MA' },
    { label: 'Myanmar', value: 'MM' },
    { label: 'Nepal', value: 'NP' },
    { label: 'Netherlands', value: 'NL' },
    { label: 'New Zealand', value: 'NZ' },
    { label: 'Nicaragua', value: 'NI' },
    { label: 'Nigeria', value: 'NG' },
    { label: 'Norway', value: 'NO' },
    { label: 'Pakistan', value: 'PK' },
    { label: 'Panama', value: 'PA' },
    { label: 'Paraguay', value: 'PY' },
    { label: 'Peru', value: 'PE' },
    { label: 'Philippines', value: 'PH' },
    { label: 'Poland', value: 'PL' },
    { label: 'Portugal', value: 'PT' },
    { label: 'Russia', value: 'RU' },
    { label: 'Saudi Arabia', value: 'SA' },
    { label: 'Singapore', value: 'SG' },
    { label: 'South Africa', value: 'ZA' },
    { label: 'South Korea', value: 'KR' },
    { label: 'Spain', value: 'ES' },
    { label: 'Sri Lanka', value: 'LK' },
    { label: 'Sweden', value: 'SE' },
    { label: 'Switzerland', value: 'CH' },
    { label: 'Thailand', value: 'TH' },
    { label: 'Trinidad and Tobago', value: 'TT' },
    { label: 'Tunisia', value: 'TN' },
    { label: 'Turkey', value: 'TR' },
    { label: 'United Arab Emirates', value: 'AE' },
    { label: 'United Kingdom', value: 'GB' },
    { label: 'United States', value: 'US' },
    { label: 'Uruguay', value: 'UY' },
    { label: 'Venezuela', value: 'VE' },
    { label: 'Vietnam', value: 'VN' },
    { label: 'Other', value: 'other' },
  ];

  const handleUsernameChange = async (text: string) => {
    setUsername(text);
    
    // Only check availability if username is different from current and not empty
    if (text && text !== user?.username && text.length >= 3) {
      setIsCheckingUsername(true);
      try {
        const isAvailable = await checkUsernameAvailability(text);
        // You could show availability status here if needed
      } catch (error) {
        // Handle error silently for now
      } finally {
        setIsCheckingUsername(false);
      }
    }
  };

  const handleSave = async () => {
    if (username && username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const budgetValue = monthlySurvivalBudget ? parseFloat(removeCommas(monthlySurvivalBudget)) : null;
      
      if (monthlySurvivalBudget && (isNaN(budgetValue!) || budgetValue! < 0)) {
        Alert.alert('Error', 'Please enter a valid monthly survival budget amount');
        setIsLoading(false);
        return;
      }

      await updateProfile({
        username: username || null,
        ageGroup,
        gender,
        country,
        monthlySurvivalBudget: budgetValue,
      });
      
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
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
      padding: 20,
      paddingTop: 10,
    },
    backButton: {
      marginRight: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 12,
      textTransform: 'uppercase',
    },
    inputContainer: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    description: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 8,
      lineHeight: 16,
    },
    currencyInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    currencySymbol: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      paddingLeft: 16,
      paddingRight: 8,
    },
    currencyInput: {
      flex: 1,
      backgroundColor: 'transparent',
      borderWidth: 0,
      paddingLeft: 0,
    },
    currencySelector: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    currencySelectorLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    currencyIcon: {
      marginRight: 12,
    },
    currencySelectorText: {
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: '500',
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 20,
    },
    saveButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
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
        <Text style={styles.title}>Edit Profile</Text>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={handleUsernameChange}
              placeholder="Enter username"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Age Group</Text>
            <Dropdown
              options={ageGroups}
              value={ageGroup}
              onSelect={(value) => setAgeGroup(value as AgeGroup)}
              placeholder="Select age group"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Gender</Text>
            <Dropdown
              options={genders}
              value={gender}
              onSelect={(value) => setGender(value as Gender)}
              placeholder="Select gender"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Country</Text>
            <Dropdown
              options={countries}
              value={country}
              onSelect={(value) => setCountry(value as Country)}
              placeholder="Select country"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Default Currency</Text>
            <Text style={styles.description}>Choose your preferred currency for displaying amounts throughout the app</Text>
            <TouchableOpacity 
              style={styles.currencySelector}
              onPress={() => navigation.navigate('CurrencySelection')}
            >
              <View style={styles.currencySelectorLeft}>
                <Ionicons 
                  name="cash" 
                  size={20} 
                  color={theme.colors.primary}
                  style={styles.currencyIcon}
                />
                <Text style={styles.currencySelectorText}>{defaultCurrency}</Text>
              </View>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('monthlySurvivalBudget')}</Text>
            <Text style={styles.description}>{t('monthlySurvivalBudgetDescription')}</Text>
            <View style={styles.currencyInputContainer}>
              <Text style={styles.currencySymbol}>{defaultCurrency}</Text>
              <TextInput
                style={[styles.input, styles.currencyInput]}
                value={monthlySurvivalBudget}
                onChangeText={handleBudgetChange}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Saving...' : 'Save Profile'}
          </Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};