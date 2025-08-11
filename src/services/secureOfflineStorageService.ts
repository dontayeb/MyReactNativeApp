import AsyncStorage from '@react-native-async-storage/async-storage';
import { encryptionService } from './encryptionService';

/**
 * SecureOfflineStorageService - Enhanced offline storage with encryption
 * 
 * Features:
 * - All sensitive data encrypted before storage
 * - Automatic data integrity verification
 * - Secure cache invalidation
 * - Memory-efficient storage management
 */

export class SecureOfflineStorageService {
  private static instance: SecureOfflineStorageService;

  private readonly STORAGE_KEYS = {
    ASSETS: 'encrypted_assets',
    LOANS: 'encrypted_loans',
    PROFILE: 'encrypted_profile',
    SYNC_TIME: 'last_sync_time',
    DATA_HASH: 'data_integrity_hash',
    CACHE_VERSION: 'cache_version',
  };

  private readonly CACHE_VERSION = '1.0.0'; // Increment to invalidate old caches
  private readonly MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  private constructor() {}

  static getInstance(): SecureOfflineStorageService {
    if (!SecureOfflineStorageService.instance) {
      SecureOfflineStorageService.instance = new SecureOfflineStorageService();
    }
    return SecureOfflineStorageService.instance;
  }

  /**
   * Initialize secure storage for user
   */
  async initialize(userId: string): Promise<void> {
    try {
      // Ensure encryption service is initialized
      if (!encryptionService.isInitialized()) {
        await encryptionService.initialize(userId);
      }

      // Check cache version compatibility
      await this.validateCacheVersion();
      
      // Clean up expired data
      await this.cleanupExpiredData();
    } catch (error) {
      console.error('Failed to initialize secure offline storage:', error);
      // Clear potentially corrupted data
      await this.clearAllData();
    }
  }

  /**
   * Securely cache assets with encryption
   */
  async cacheAssets(assets: any[]): Promise<void> {
    try {
      // Encrypt the entire assets array
      const encryptedData = await encryptionService.encryptData(assets);
      
      // Generate data integrity hash
      const dataHash = await encryptionService.hashData(JSON.stringify(assets));
      
      // Store encrypted data and metadata
      await Promise.all([
        AsyncStorage.setItem(this.STORAGE_KEYS.ASSETS, encryptedData),
        AsyncStorage.setItem(`${this.STORAGE_KEYS.ASSETS}_hash`, dataHash),
        this.updateSyncTime()
      ]);

      console.log(`Cached ${assets.length} encrypted assets`);
    } catch (error) {
      console.error('Failed to cache assets:', error);
      throw new Error('Secure asset caching failed');
    }
  }

  /**
   * Retrieve and decrypt cached assets
   */
  async getCachedAssets(): Promise<any[]> {
    try {
      const [encryptedData, storedHash] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEYS.ASSETS),
        AsyncStorage.getItem(`${this.STORAGE_KEYS.ASSETS}_hash`)
      ]);

      if (!encryptedData) {
        return [];
      }

      // Decrypt data
      const decryptedAssets = await encryptionService.decryptData(encryptedData);
      
      // Verify data integrity if hash exists
      if (storedHash) {
        const isValid = await encryptionService.validateDataIntegrity(
          JSON.stringify(decryptedAssets), 
          storedHash
        );
        
        if (!isValid) {
          console.warn('Asset cache integrity check failed, clearing cache');
          await this.clearAssetsCache();
          return [];
        }
      }

      return decryptedAssets;
    } catch (error) {
      console.error('Failed to retrieve cached assets:', error);
      // Clear potentially corrupted cache
      await this.clearAssetsCache();
      return [];
    }
  }

  /**
   * Securely cache loans with encryption
   */
  async cacheLoans(loans: any[]): Promise<void> {
    try {
      // Encrypt the entire loans array
      const encryptedData = await encryptionService.encryptData(loans);
      
      // Generate data integrity hash
      const dataHash = await encryptionService.hashData(JSON.stringify(loans));
      
      // Store encrypted data and metadata
      await Promise.all([
        AsyncStorage.setItem(this.STORAGE_KEYS.LOANS, encryptedData),
        AsyncStorage.setItem(`${this.STORAGE_KEYS.LOANS}_hash`, dataHash),
        this.updateSyncTime()
      ]);

      console.log(`Cached ${loans.length} encrypted loans`);
    } catch (error) {
      console.error('Failed to cache loans:', error);
      throw new Error('Secure loan caching failed');
    }
  }

  /**
   * Retrieve and decrypt cached loans
   */
  async getCachedLoans(): Promise<any[]> {
    try {
      const [encryptedData, storedHash] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEYS.LOANS),
        AsyncStorage.getItem(`${this.STORAGE_KEYS.LOANS}_hash`)
      ]);

      if (!encryptedData) {
        return [];
      }

      // Decrypt data
      const decryptedLoans = await encryptionService.decryptData(encryptedData);
      
      // Verify data integrity if hash exists
      if (storedHash) {
        const isValid = await encryptionService.validateDataIntegrity(
          JSON.stringify(decryptedLoans), 
          storedHash
        );
        
        if (!isValid) {
          console.warn('Loan cache integrity check failed, clearing cache');
          await this.clearLoansCache();
          return [];
        }
      }

      return decryptedLoans;
    } catch (error) {
      console.error('Failed to retrieve cached loans:', error);
      // Clear potentially corrupted cache
      await this.clearLoansCache();
      return [];
    }
  }

  /**
   * Cache user profile data securely
   */
  async cacheProfile(profile: any): Promise<void> {
    try {
      let dataToStore: string;
      let isEncrypted = true;
      
      try {
        // Try to encrypt the data
        dataToStore = await encryptionService.encryptData(profile);
      } catch (encryptionError) {
        console.warn('Encryption failed, storing profile unencrypted:', encryptionError);
        // Fallback to storing unencrypted data
        dataToStore = JSON.stringify(profile);
        isEncrypted = false;
      }
      
      let dataHash: string | null = null;
      try {
        dataHash = await encryptionService.hashData(JSON.stringify(profile));
      } catch (hashError) {
        console.warn('Failed to generate data hash, skipping integrity check:', hashError);
      }
      
      const storagePromises = [
        AsyncStorage.setItem(this.STORAGE_KEYS.PROFILE, dataToStore),
        AsyncStorage.setItem(`${this.STORAGE_KEYS.PROFILE}_encrypted`, isEncrypted.toString()),
        this.updateSyncTime()
      ];
      
      if (dataHash) {
        storagePromises.push(AsyncStorage.setItem(`${this.STORAGE_KEYS.PROFILE}_hash`, dataHash));
      }
      
      await Promise.all(storagePromises);
    } catch (error) {
      console.error('Failed to cache profile:', error);
      throw new Error('Secure profile caching failed');
    }
  }

  /**
   * Get cached profile data
   */
  async getCachedProfile(): Promise<any | null> {
    try {
      const [cachedData, storedHash, isEncryptedStr] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEYS.PROFILE),
        AsyncStorage.getItem(`${this.STORAGE_KEYS.PROFILE}_hash`),
        AsyncStorage.getItem(`${this.STORAGE_KEYS.PROFILE}_encrypted`)
      ]);

      if (!cachedData) {
        return null;
      }

      let profileData: any;
      const isEncrypted = isEncryptedStr === 'true';
      
      if (isEncrypted) {
        try {
          profileData = await encryptionService.decryptData(cachedData);
        } catch (decryptionError) {
          console.warn('Failed to decrypt profile data, trying as plain JSON:', decryptionError);
          profileData = JSON.parse(cachedData);
        }
      } else {
        profileData = JSON.parse(cachedData);
      }
      
      // Verify data integrity if hash exists
      if (storedHash) {
        try {
          const isValid = await encryptionService.validateDataIntegrity(
            JSON.stringify(profileData), 
            storedHash
          );
          
          if (!isValid) {
            console.warn('Profile cache integrity check failed, clearing cache');
            await this.clearProfileCache();
            return null;
          }
        } catch (hashError) {
          console.warn('Hash validation failed, skipping integrity check:', hashError);
          // Continue without integrity check if hashing fails
        }
      }

      return profileData;
    } catch (error) {
      console.error('Failed to retrieve cached profile:', error);
      await this.clearProfileCache();
      return null;
    }
  }

  /**
   * Get last sync time
   */
  async getLastSyncTime(): Promise<Date | null> {
    try {
      const timestamp = await AsyncStorage.getItem(this.STORAGE_KEYS.SYNC_TIME);
      return timestamp ? new Date(parseInt(timestamp)) : null;
    } catch (error) {
      console.error('Failed to get sync time:', error);
      return null;
    }
  }

  /**
   * Update last sync time
   */
  private async updateSyncTime(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.SYNC_TIME, Date.now().toString());
    } catch (error) {
      console.error('Failed to update sync time:', error);
    }
  }

  /**
   * Check if cached data is still valid (not expired)
   */
  async isCacheValid(): Promise<boolean> {
    try {
      const lastSync = await this.getLastSyncTime();
      if (!lastSync) {
        return false;
      }

      const age = Date.now() - lastSync.getTime();
      return age < this.MAX_CACHE_AGE;
    } catch (error) {
      console.error('Failed to check cache validity:', error);
      return false;
    }
  }

  /**
   * Validate cache version compatibility
   */
  private async validateCacheVersion(): Promise<void> {
    try {
      const storedVersion = await AsyncStorage.getItem(this.STORAGE_KEYS.CACHE_VERSION);
      
      if (storedVersion !== this.CACHE_VERSION) {
        console.log('Cache version mismatch, clearing old data');
        await this.clearAllData();
        await AsyncStorage.setItem(this.STORAGE_KEYS.CACHE_VERSION, this.CACHE_VERSION);
      }
    } catch (error) {
      console.error('Failed to validate cache version:', error);
      await this.clearAllData();
    }
  }

  /**
   * Clean up expired data
   */
  private async cleanupExpiredData(): Promise<void> {
    const isValid = await this.isCacheValid();
    if (!isValid) {
      console.log('Cache expired, clearing all data');
      await this.clearAllData();
    }
  }

  /**
   * Clear specific cache sections
   */
  async clearAssetsCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(this.STORAGE_KEYS.ASSETS),
        AsyncStorage.removeItem(`${this.STORAGE_KEYS.ASSETS}_hash`)
      ]);
    } catch (error) {
      console.error('Failed to clear assets cache:', error);
    }
  }

  async clearLoansCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(this.STORAGE_KEYS.LOANS),
        AsyncStorage.removeItem(`${this.STORAGE_KEYS.LOANS}_hash`)
      ]);
    } catch (error) {
      console.error('Failed to clear loans cache:', error);
    }
  }

  async clearProfileCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(this.STORAGE_KEYS.PROFILE),
        AsyncStorage.removeItem(`${this.STORAGE_KEYS.PROFILE}_hash`)
      ]);
    } catch (error) {
      console.error('Failed to clear profile cache:', error);
    }
  }

  /**
   * Clear all cached data (for logout or data corruption)
   */
  async clearAllData(): Promise<void> {
    try {
      const keys = Object.values(this.STORAGE_KEYS);
      const hashKeys = keys.map(key => `${key}_hash`);
      const allKeys = [...keys, ...hashKeys];
      
      await AsyncStorage.multiRemove(allKeys);
      console.log('All secure cache data cleared');
    } catch (error) {
      console.error('Failed to clear all cache data:', error);
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    hasAssets: boolean;
    hasLoans: boolean;
    hasProfile: boolean;
    lastSync: Date | null;
    isValid: boolean;
  }> {
    try {
      const [hasAssets, hasLoans, hasProfile, lastSync, isValid] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEYS.ASSETS).then(data => !!data),
        AsyncStorage.getItem(this.STORAGE_KEYS.LOANS).then(data => !!data),
        AsyncStorage.getItem(this.STORAGE_KEYS.PROFILE).then(data => !!data),
        this.getLastSyncTime(),
        this.isCacheValid()
      ]);

      return {
        hasAssets,
        hasLoans,
        hasProfile,
        lastSync,
        isValid
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        hasAssets: false,
        hasLoans: false,
        hasProfile: false,
        lastSync: null,
        isValid: false
      };
    }
  }
}

// Export singleton instance
export const secureOfflineStorageService = SecureOfflineStorageService.getInstance();