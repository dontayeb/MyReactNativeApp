import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { dataExportService, UserDataExport } from '../../services/dataExportService';
import { DataExportEmptyState } from '../../components/EmptyStates';

interface DataExportScreenProps {
  navigation: any;
}

export const DataExportScreen: React.FC<DataExportScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { user } = useAuth();
  
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<UserDataExport | null>(null);

  const handleExportData = async () => {
    if (!user?.id || !user?.email) {
      Alert.alert('Error', 'User information not available');
      return;
    }

    Alert.alert(
      'Export Personal Data',
      'This will create a file containing all your personal data stored in the app. This may take a few moments.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            setIsExporting(true);
            
            try {
              // Export the data
              const exportData = await dataExportService.exportUserData(user.id, user.email);
              setLastExport(exportData);

              // Create file content
              const jsonContent = dataExportService.formatForDownload(exportData);
              const fileName = dataExportService.getExportFileName(user.id);
              
              // Save to device
              const fileUri = FileSystem.documentDirectory + fileName;
              await FileSystem.writeAsStringAsync(fileUri, jsonContent);

              // Share the file
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                  mimeType: 'application/json',
                  dialogTitle: 'Save or Share Your Data Export',
                  UTI: 'public.json',
                });
              } else {
                // Fallback for platforms where sharing isn't available
                await Share.share({
                  title: 'Data Export',
                  message: `Your data export has been saved to: ${fileUri}`,
                });
              }

              Alert.alert(
                'Export Complete',
                `Your data has been exported successfully!\n\nRecords exported: ${exportData.metadata.recordCount}\n\nThe file has been saved and shared from your device.`,
                [{ text: 'OK' }]
              );

            } catch (error) {
              console.error('Export failed:', error);
              Alert.alert(
                'Export Failed',
                'There was an error exporting your data. Please try again or contact support if the issue persists.'
              );
            } finally {
              setIsExporting(false);
            }
          },
        },
      ]
    );
  };

  const showExportSummary = () => {
    if (!lastExport) return;

    const summary = dataExportService.generateExportSummary(lastExport);
    
    Alert.alert(
      'Last Export Summary',
      summary,
      [{ text: 'OK' }]
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
    description: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      lineHeight: 24,
      marginBottom: 24,
    },
    infoCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    infoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    infoIcon: {
      marginRight: 12,
    },
    infoTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    infoText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginBottom: 8,
    },
    dataTypesList: {
      marginTop: 12,
    },
    dataTypeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    dataTypeIcon: {
      marginRight: 8,
    },
    dataTypeText: {
      fontSize: 14,
      color: theme.colors.text,
    },
    exportButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    exportButtonDisabled: {
      backgroundColor: theme.colors.textSecondary,
      opacity: 0.6,
    },
    exportButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    summaryButton: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    summaryButtonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    warningCard: {
      backgroundColor: '#FEF3C7',
      borderRadius: 12,
      padding: 16,
      marginTop: 24,
      borderLeftWidth: 4,
      borderLeftColor: '#F59E0B',
    },
    warningHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    warningTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#92400E',
      marginLeft: 8,
    },
    warningText: {
      fontSize: 14,
      color: '#92400E',
      lineHeight: 20,
    },
    lastExportInfo: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: 12,
      marginTop: 16,
    },
    lastExportText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
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
        <Text style={styles.title}>Export My Data</Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Text style={styles.description}>
          Export all your personal data stored in the app. This includes your profile, financial data, 
          preferences, and settings. The data will be provided in JSON format that you can save or share.
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons 
              name="document-text" 
              size={24} 
              color={theme.colors.primary}
              style={styles.infoIcon}
            />
            <Text style={styles.infoTitle}>What's Included</Text>
          </View>

          <Text style={styles.infoText}>
            Your export will contain all personal data associated with your account:
          </Text>

          <View style={styles.dataTypesList}>
            <View style={styles.dataTypeItem}>
              <Ionicons 
                name="person" 
                size={16} 
                color={theme.colors.primary}
                style={styles.dataTypeIcon}
              />
              <Text style={styles.dataTypeText}>Profile information and preferences</Text>
            </View>

            <View style={styles.dataTypeItem}>
              <Ionicons 
                name="wallet" 
                size={16} 
                color={theme.colors.primary}
                style={styles.dataTypeIcon}
              />
              <Text style={styles.dataTypeText}>Assets and financial accounts</Text>
            </View>

            <View style={styles.dataTypeItem}>
              <Ionicons 
                name="card" 
                size={16} 
                color={theme.colors.primary}
                style={styles.dataTypeIcon}
              />
              <Text style={styles.dataTypeText}>Loans and payment history</Text>
            </View>

            <View style={styles.dataTypeItem}>
              <Ionicons 
                name="settings" 
                size={16} 
                color={theme.colors.primary}
                style={styles.dataTypeIcon}
              />
              <Text style={styles.dataTypeText}>App settings and subscriptions</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.exportButton, isExporting && styles.exportButtonDisabled]} 
          onPress={handleExportData}
          disabled={isExporting}
        >
          <Ionicons 
            name={isExporting ? "cloud-download" : "download"} 
            size={20} 
            color="white" 
          />
          <Text style={styles.exportButtonText}>
            {isExporting ? 'Exporting Data...' : 'Export My Data'}
          </Text>
        </TouchableOpacity>

        {lastExport && (
          <TouchableOpacity 
            style={styles.summaryButton}
            onPress={showExportSummary}
          >
            <Ionicons name="information-circle" size={20} color={theme.colors.text} />
            <Text style={styles.summaryButtonText}>View Last Export Summary</Text>
          </TouchableOpacity>
        )}

        {lastExport && (
          <View style={styles.lastExportInfo}>
            <Text style={styles.lastExportText}>
              Last export: {new Date(lastExport.exportedAt).toLocaleString()}
              {'\n'}Records exported: {lastExport.metadata.recordCount}
            </Text>
          </View>
        )}

        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Ionicons name="warning" size={20} color="#F59E0B" />
            <Text style={styles.warningTitle}>Data Security Notice</Text>
          </View>
          <Text style={styles.warningText}>
            Your exported data contains sensitive financial information. Please store it securely and 
            avoid sharing it with unauthorized parties. Delete the file when no longer needed.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};