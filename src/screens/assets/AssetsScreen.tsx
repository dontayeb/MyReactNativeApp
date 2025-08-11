import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { dataService } from '../../services/dataService';
import { appStateService } from '../../services/appStateService';
import { formatNetWorthAmount } from '../../utils/currencyUtils';
import { useCurrency } from '../../contexts/CurrencyContext';
import { AssetsListSkeleton } from '../../components/LoadingStates';
import { NoAssetsEmptyState } from '../../components/EmptyStates';
import { SkeletonLoader } from '../../components/SkeletonLoader';

interface Asset {
  id: string;
  name: string;
  type: 'bank' | 'investment' | 'property' | 'vehicle' | 'other';
  value: number;
  change: number;
  changePercent: number;
  symbol?: string;
}

interface AssetsScreenProps {
  navigation: any;
}

export const AssetsScreen: React.FC<AssetsScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { user } = useAuth();
  const { defaultCurrency } = useCurrency();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Register for app state refresh
  useEffect(() => {
    appStateService.onSessionRefresh(async () => {
      if (user?.id) {
        console.log('Assets: Refreshing data after app state change');
        await loadAssets();
      }
    });
  }, [user?.id]);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadAssets();
      }
    }, [user?.id])
  );

  const loadAssets = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      console.log('Loading assets for user:', user.id);
      
      const assetsData = await dataService.getAssets(user.id);
      console.log('Loaded assets:', assetsData.length);

      // Convert Supabase data to component format
      const formattedAssets = assetsData.map(asset => ({
        id: asset.id,
        name: asset.name,
        type: asset.type as 'bank' | 'investment' | 'property' | 'vehicle' | 'other',
        value: asset.value,
        change: 0, // We don't track changes yet
        changePercent: 0,
        symbol: undefined
      }));

      setAssets(formattedAssets);
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'bank': return 'card';
      case 'investment': return 'trending-up';
      case 'property': return 'home';
      case 'vehicle': return 'car';
      case 'other': return 'ellipsis-horizontal';
      default: return 'wallet';
    }
  };

  const formatCurrency = (amount: number) => {
    // Assets currently don't have currency field, assuming default currency
    return formatNetWorthAmount(amount, defaultCurrency);
  };

  const renderAssetItem = ({ item }: { item: Asset }) => (
    <TouchableOpacity 
      style={styles.assetCard}
      onPress={() => navigation.navigate('AssetDetail', { asset: item })}
    >
      <View style={styles.assetHeader}>
        <View style={styles.assetTitleRow}>
          <Ionicons 
            name={getAssetIcon(item.type)} 
            size={24} 
            color={theme.colors.primary} 
            style={styles.assetIcon}
          />
          <View style={styles.assetTitleInfo}>
            <Text style={styles.assetName}>{item.name}</Text>
            <Text style={styles.assetSymbol}>
              {item.symbol ? item.symbol : item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
          </View>
        </View>
        <View style={styles.assetValueColumn}>
          <Text style={styles.assetValue}>{formatCurrency(item.value)}</Text>
          <View style={styles.changeRow}>
            <Ionicons 
              name={item.change >= 0 ? 'trending-up' : 'trending-down'} 
              size={12} 
              color={item.change >= 0 ? '#10B981' : '#EF4444'} 
            />
            <Text style={[
              styles.changeText,
              { color: item.change >= 0 ? '#10B981' : '#EF4444' }
            ]}>
              {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
  const totalChange = assets.reduce((sum, asset) => sum + asset.change, 0);
  const totalChangePercent = totalValue > 0 && (totalValue - totalChange) > 0 
    ? (totalChange / (totalValue - totalChange)) * 100 
    : 0;

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
      marginBottom: 16,
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
    listContainer: {
      padding: 20,
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
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    assetValueColumn: {
      alignItems: 'flex-end',
    },
    assetValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 4,
    },
    changeRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    changeText: {
      fontSize: 12,
      fontWeight: '500',
      marginLeft: 4,
    },
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.seamlessHeader}>
          <Text style={styles.title}>{t('assets')}</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('AddAsset')}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <SkeletonLoader />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.seamlessHeader}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{t('assets')}</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('AddAsset')}
          >
            <Ionicons name="add" size={24} color={theme.colors.primary} />
            <Text style={styles.addButtonText}>Add Asset</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Portfolio</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalValue)}</Text>
          </View>
          <View style={[styles.summaryRow, { marginBottom: 0 }]}>
            <Text style={styles.summaryLabel}>Today's Change</Text>
            <Text style={[
              styles.summaryValue,
              { color: totalChange >= 0 ? '#10B981' : '#EF4444' }
            ]}>
              {totalChange >= 0 ? '+' : ''}{totalChangePercent.toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>
      
      {assets.length === 0 ? (
        <NoAssetsEmptyState onAddAsset={() => navigation.navigate('AddAsset')} />
      ) : (
        <FlatList
          data={assets}
          renderItem={renderAssetItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};