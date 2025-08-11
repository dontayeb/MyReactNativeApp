import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { CURRENCIES } from '../../constants/currencies';
import { Currency } from '../../types';

interface CurrencySelectionScreenProps {
  navigation: any;
}

export const CurrencySelectionScreen: React.FC<CurrencySelectionScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { defaultCurrency, setDefaultCurrency } = useCurrency();
  const { updateProfile, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const filteredCurrencies = CURRENCIES.filter(currency =>
    currency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    currency.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCurrencySelect = async (currency: Currency) => {
    if (currency.code === defaultCurrency) {
      navigation.goBack();
      return;
    }

    setIsLoading(true);
    try {
      // Update the currency context with userId to trigger automatic updates
      await setDefaultCurrency(currency.code, user?.id);
      
      // Update the user's profile in Supabase (this may be redundant with the context update)
      await updateProfile({ defaultCurrency: currency.code });
      
      navigation.goBack();
    } catch (error) {
      console.error('Error updating currency:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCurrencyItem = (currency: Currency, index: number) => {
    const isSelected = currency.code === defaultCurrency;
    
    return (
      <TouchableOpacity
        key={currency.code}
        style={[
          styles.currencyItem, 
          isSelected && styles.selectedCurrencyItem,
          index === filteredCurrencies.length - 1 && styles.lastCurrencyItem
        ]}
        onPress={() => handleCurrencySelect(currency)}
        disabled={isLoading}
      >
        <View style={styles.currencyLeft}>
          <View style={[styles.currencyFlag, { backgroundColor: isSelected ? theme.colors.primary : theme.colors.background }]}>
            <Text style={[styles.currencySymbol, { color: isSelected ? 'white' : theme.colors.primary }]}>
              {currency.symbol}
            </Text>
          </View>
          <View style={styles.currencyInfo}>
            <Text style={[styles.currencyCode, isSelected && styles.selectedText]}>
              {currency.code}
            </Text>
            <Text style={[styles.currencyName, isSelected && styles.selectedSubtext]}>
              {currency.name}
            </Text>
          </View>
        </View>
        {isSelected && (
          <Ionicons 
            name="checkmark-circle" 
            size={24} 
            color={theme.colors.primary}
          />
        )}
      </TouchableOpacity>
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
    headerContent: {
      flex: 1,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    searchContainer: {
      padding: 20,
      paddingBottom: 16,
    },
    searchInput: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    currencyList: {
      flex: 1,
      paddingHorizontal: 20,
    },
    currencyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    selectedCurrencyItem: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '10',
    },
    lastCurrencyItem: {
      marginBottom: 100,
    },
    currencyLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    currencyFlag: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    currencySymbol: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    currencyInfo: {
      flex: 1,
    },
    currencyCode: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    selectedText: {
      color: theme.colors.primary,
    },
    currencyName: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    selectedSubtext: {
      color: theme.colors.primary + 'CC',
    },
    sectionHeader: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: theme.colors.background,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
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
        <View style={styles.headerContent}>
          <Text style={styles.title}>Select Currency</Text>
          <Text style={styles.subtitle}>Choose your default currency</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search currencies..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
      </View>

      <ScrollView 
        style={styles.currencyList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filteredCurrencies.length > 0 ? (
          filteredCurrencies.map((currency, index) => renderCurrencyItem(currency, index))
        ) : (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="search-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={{ color: theme.colors.textSecondary, marginTop: 16, textAlign: 'center' }}>
              No currencies found matching "{searchQuery}"
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};