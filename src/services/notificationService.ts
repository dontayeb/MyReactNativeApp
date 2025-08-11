import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Notification handler configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationSettings {
  paymentReminders: boolean;
  reminderDays: number; // Days before payment due
}

const defaultSettings: NotificationSettings = {
  paymentReminders: true,
  reminderDays: 3,
};

export class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private initialized: boolean = false;
  private isExpoGo: boolean = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Initialize notification service
  async initialize() {
    if (this.initialized) {
      console.log('Notification service already initialized');
      return;
    }
    
    try {
      // Check if running in Expo Go
      this.isExpoGo = Constants.appOwnership === 'expo';
      
      if (this.isExpoGo) {
        console.warn('Running in Expo Go - push notifications are not available since SDK 53');
        this.initialized = true;
        return;
      }
      
      await this.registerForPushNotificationsAsync();
      await this.setupNotificationChannels();
      this.initialized = true;
      console.log('Notification service initialized successfully');
    } catch (error) {
      console.warn('Notification service initialization failed:', error);
      this.isExpoGo = true; // Assume Expo Go if initialization fails
      this.initialized = true; // Mark as initialized to prevent retries
    }
  }

  // Register for push notifications
  private async registerForPushNotificationsAsync(): Promise<string | null> {
    let token = null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }
      
      try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
          throw new Error('Project ID not found');
        }
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        this.expoPushToken = token;
        console.log('Expo push token:', token);
      } catch (e) {
        console.warn('Push notifications not configured - skipping token registration:', e.message);
        // Don't throw error, just continue without push notifications
        return null;
      }
    } else {
      console.log('Must use physical device for push notifications');
    }

    return token;
  }

  // Setup notification channels for Android
  private async setupNotificationChannels() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('payment-reminders', {
        name: 'Payment Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
      
      await Notifications.setNotificationChannelAsync('asset-reminders', {
        name: 'Asset Valuation Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });

    }
  }

  // Get notification settings
  async getSettings(): Promise<NotificationSettings> {
    try {
      const settings = await AsyncStorage.getItem('notificationSettings');
      return settings ? { ...defaultSettings, ...JSON.parse(settings) } : defaultSettings;
    } catch (error) {
      console.error('Error loading notification settings:', error);
      return defaultSettings;
    }
  }

  // Save notification settings
  async saveSettings(settings: Partial<NotificationSettings>) {
    try {
      const currentSettings = await this.getSettings();
      const newSettings = { ...currentSettings, ...settings };
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  }

  // Schedule payment reminder notification
  async schedulePaymentReminder(loanId: string, loanName: string, paymentDate: Date, amount: number, currency: string) {
    const settings = await this.getSettings();
    if (!settings.paymentReminders) return;

    const reminderDate = new Date(paymentDate);
    reminderDate.setDate(reminderDate.getDate() - settings.reminderDays);

    // Don't schedule if reminder date is in the past
    if (reminderDate <= new Date()) return;

    const notificationId = `payment-reminder-${loanId}-${paymentDate.toISOString()}`;

    await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title: '💳 Payment Reminder',
        body: `Your ${loanName} payment of ${currency}${amount.toLocaleString()} is due in ${settings.reminderDays} days`,
        data: { 
          type: 'payment-reminder', 
          loanId, 
          paymentDate: paymentDate.toISOString(),
          amount,
          currency 
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        date: reminderDate,
        channelId: 'payment-reminders',
      },
    });

    console.log(`Scheduled payment reminder for ${loanName} on ${reminderDate.toDateString()}`);
  }




  // Cancel all scheduled notifications for a loan
  async cancelLoanNotifications(loanId: string) {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notification of scheduledNotifications) {
      if (notification.identifier.includes(loanId)) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  }

  // Cancel specific type of notifications
  async cancelNotificationsByType(type: string) {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notification of scheduledNotifications) {
      if (notification.identifier.includes(type)) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  }

  // Get all scheduled notifications
  async getScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  // Clear all scheduled notifications
  async clearAllNotifications() {
    if (this.isExpoGo) {
      console.log('Skipping notification clear - running in Expo Go');
      return;
    }
    
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All scheduled notifications cleared');
    } catch (error) {
      console.warn('Failed to clear notifications:', error);
    }
  }


  // Handle notification received
  handleNotificationReceived(notification: Notifications.Notification) {
    console.log('Notification received:', notification);
    
    const { type } = notification.request.content.data || {};
    
    switch (type) {
      case 'payment-reminder':
        // Payment reminder received - no action needed
        break;
      default:
        break;
    }
  }

  // Schedule asset valuation reminder (1 year from last valued date)
  async scheduleAssetValuationReminder(assetId: string, assetName: string, lastValuedDate: Date) {
    const reminderDate = new Date(lastValuedDate);
    reminderDate.setFullYear(reminderDate.getFullYear() + 1); // 1 year from last valued
    
    // Don't schedule if reminder date is in the past
    if (reminderDate <= new Date()) return;
    
    const notificationId = `asset-valuation-${assetId}`;
    
    await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title: '📊 Asset Valuation Reminder',
        body: `It's been a year since you valued "${assetName}". Consider updating its value to keep your portfolio current.`,
        data: { 
          type: 'asset-valuation', 
          assetId, 
          assetName,
          lastValuedDate: lastValuedDate.toISOString()
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
      },
      trigger: {
        date: reminderDate,
        channelId: 'asset-reminders',
      },
    });
    
    console.log(`Scheduled asset valuation reminder for ${assetName} on ${reminderDate.toDateString()}`);
  }
  
  // Cancel asset valuation notifications for a specific asset
  async cancelAssetNotifications(assetId: string) {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notification of scheduledNotifications) {
      if (notification.identifier.includes(`asset-valuation-${assetId}`)) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  }

  // Handle notification response (when user taps notification)
  handleNotificationResponse(response: Notifications.NotificationResponse) {
    console.log('Notification response:', response);
    
    const { type, loanId, assetId } = response.notification.request.content.data || {};
    
    // You can implement navigation logic here based on notification type
    switch (type) {
      case 'payment-reminder':
        // Navigate to loan details
        console.log(`Navigate to loan ${loanId}`);
        break;
      case 'asset-valuation':
        // Navigate to asset details or edit screen
        console.log(`Navigate to asset ${assetId}`);
        break;
      default:
        break;
    }
  }
}

export const notificationService = NotificationService.getInstance();