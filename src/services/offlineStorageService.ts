import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset, Loan } from './dataService';

const STORAGE_KEYS = {
  ASSETS: 'offline_assets',
  LOANS: 'offline_loans',
  LAST_SYNC: 'last_sync_timestamp',
};

class OfflineStorageService {
  // Assets
  async cacheAssets(assets: Asset[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets));
      await this.updateLastSyncTime();
    } catch (error) {
      console.error('Error caching assets:', error);
    }
  }

  async getCachedAssets(): Promise<Asset[]> {
    try {
      const cachedAssets = await AsyncStorage.getItem(STORAGE_KEYS.ASSETS);
      return cachedAssets ? JSON.parse(cachedAssets) : [];
    } catch (error) {
      console.error('Error getting cached assets:', error);
      return [];
    }
  }

  // Loans
  async cacheLoans(loans: Loan[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans));
      await this.updateLastSyncTime();
    } catch (error) {
      console.error('Error caching loans:', error);
    }
  }

  async getCachedLoans(): Promise<Loan[]> {
    try {
      const cachedLoans = await AsyncStorage.getItem(STORAGE_KEYS.LOANS);
      return cachedLoans ? JSON.parse(cachedLoans) : [];
    } catch (error) {
      console.error('Error getting cached loans:', error);
      return [];
    }
  }

  // Sync management
  private async updateLastSyncTime(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    } catch (error) {
      console.error('Error updating last sync time:', error);
    }
  }

  async getLastSyncTime(): Promise<Date | null> {
    try {
      const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return lastSync ? new Date(lastSync) : null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  // Clear cache (for logout)
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ASSETS,
        STORAGE_KEYS.LOANS,
        STORAGE_KEYS.LAST_SYNC,
      ]);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Check if we have any cached data
  async hasCachedData(): Promise<boolean> {
    try {
      const assets = await AsyncStorage.getItem(STORAGE_KEYS.ASSETS);
      const loans = await AsyncStorage.getItem(STORAGE_KEYS.LOANS);
      return !!(assets || loans);
    } catch (error) {
      return false;
    }
  }
}

export const offlineStorageService = new OfflineStorageService();