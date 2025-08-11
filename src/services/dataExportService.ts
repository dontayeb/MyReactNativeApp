import { dataService } from './dataService';

/**
 * DataExportService - GDPR compliant data export functionality
 * 
 * Allows users to export all their personal data in JSON format
 * as required by GDPR Article 20 (Right to data portability)
 */

export interface UserDataExport {
  exportedAt: string;
  userId: string;
  profile: any;
  assets: any[];
  loans: any[];
  loanPayments: any[];
  creditCardStatements: any[];
  creditCardTransactions: any[];
  newsletterSubscription: any;
  metadata: {
    appVersion: string;
    exportVersion: string;
    recordCount: number;
  };
}

export class DataExportService {
  private static instance: DataExportService;

  private constructor() {}

  static getInstance(): DataExportService {
    if (!DataExportService.instance) {
      DataExportService.instance = new DataExportService();
    }
    return DataExportService.instance;
  }

  /**
   * Export all user data in GDPR-compliant format
   */
  async exportUserData(userId: string, userEmail: string): Promise<UserDataExport> {
    try {
      console.log('Starting data export for user:', userId);

      // Get profile data
      const { data: profileData } = await dataService.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Get assets
      const assets = await dataService.getAssets(userId, false);

      // Get loans
      const loans = await dataService.getLoans(userId, false);

      // Get all loan payments for user's loans
      const allLoanPayments: any[] = [];
      for (const loan of loans) {
        try {
          const payments = await dataService.getLoanPayments(userId, loan.id);
          allLoanPayments.push(...payments);
        } catch (error) {
          console.warn(`Failed to get payments for loan ${loan.id}:`, error);
        }
      }

      // Get all credit card statements and transactions
      const allStatements: any[] = [];
      const allTransactions: any[] = [];
      
      for (const loan of loans.filter(l => l.loan_type === 'credit_card')) {
        try {
          const statements = await dataService.getCreditCardStatements(userId, loan.id);
          const transactions = await dataService.getCreditCardTransactions(userId, loan.id);
          allStatements.push(...statements);
          allTransactions.push(...transactions);
        } catch (error) {
          console.warn(`Failed to get credit card data for loan ${loan.id}:`, error);
        }
      }

      // Get newsletter subscription status
      let newsletterSubscription = null;
      try {
        newsletterSubscription = await dataService.getNewsletterSubscriptionStatus(userId);
      } catch (error) {
        console.warn('Failed to get newsletter subscription:', error);
      }

      // Calculate record count
      const recordCount = 
        1 + // profile
        assets.length +
        loans.length +
        allLoanPayments.length +
        allStatements.length +
        allTransactions.length +
        (newsletterSubscription ? 1 : 0);

      const exportData: UserDataExport = {
        exportedAt: new Date().toISOString(),
        userId,
        profile: {
          ...profileData,
          email: userEmail, // Include email as it's not in profiles table
        },
        assets,
        loans,
        loanPayments: allLoanPayments,
        creditCardStatements: allStatements,
        creditCardTransactions: allTransactions,
        newsletterSubscription,
        metadata: {
          appVersion: '1.0.0',
          exportVersion: '1.0',
          recordCount,
        }
      };

      console.log(`Data export completed: ${recordCount} records exported`);
      return exportData;

    } catch (error) {
      console.error('Data export failed:', error);
      throw new Error('Failed to export user data. Please try again or contact support.');
    }
  }

  /**
   * Generate a human-readable summary of exported data
   */
  generateExportSummary(exportData: UserDataExport): string {
    const { assets, loans, loanPayments, creditCardStatements, creditCardTransactions, metadata } = exportData;

    return `
DATA EXPORT SUMMARY
==================
Export Date: ${new Date(exportData.exportedAt).toLocaleString()}
User ID: ${exportData.userId}
App Version: ${metadata.appVersion}

PERSONAL INFORMATION:
- Profile: 1 record
- Email: ${exportData.profile.email}
- Username: ${exportData.profile.username || 'Not set'}
- Country: ${exportData.profile.country || 'Not set'}

FINANCIAL DATA:
- Assets: ${assets.length} records
- Loans: ${loans.length} records
- Loan Payments: ${loanPayments.length} records
- Credit Card Statements: ${creditCardStatements.length} records
- Credit Card Transactions: ${creditCardTransactions.length} records

PREFERENCES:
- Newsletter Subscription: ${exportData.newsletterSubscription ? 'Subscribed' : 'Not subscribed'}
- Default Currency: ${exportData.profile.default_currency}
- Monthly Survival Budget: ${exportData.profile.monthly_survival_budget || 'Not set'}

TOTAL RECORDS: ${metadata.recordCount}

This export contains all personal data associated with your account.
The data is provided in JSON format for portability and transparency.
    `.trim();
  }

  /**
   * Format export data as downloadable JSON string
   */
  formatForDownload(exportData: UserDataExport): string {
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Get file name for export
   */
  getExportFileName(userId: string): string {
    const date = new Date().toISOString().split('T')[0];
    return `wealth-tracker-data-export-${date}.json`;
  }
}

// Export singleton instance
export const dataExportService = DataExportService.getInstance();