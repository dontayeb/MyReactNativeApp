import { supabase } from './supabase';
import { secureOfflineStorageService } from './secureOfflineStorageService';
import { encryptionService } from './encryptionService';
import { dataSanitizationService } from './dataSanitizationService';

export interface Asset {
  id: string;
  user_id: string;
  name: string;
  type: string;
  value: number;
  currency: string;
  last_valued: string;
  created_at: string;
  updated_at: string;
}

export interface LoanPayment {
  id: string;
  user_id: string;
  loan_id: string;
  amount: number;
  payment_date: string;
  payment_type: 'regular' | 'additional' | 'extra' | 'minimum' | 'statement_payment' | 'late_payment';
  notes: string | null;
  statement_id: string | null;
  is_minimum_payment: boolean;
  is_late_payment: boolean;
  days_late: number;
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: string;
  user_id: string;
  name: string;
  loan_type: string;
  principal: number;
  interest_rate: number;
  term_months: number | null;
  monthly_payment: number | null;
  currency: string;
  start_date: string | null;
  credit_limit: number | null;
  current_balance: number | null;
  minimum_payment_percentage: number | null;
  due_date: string | null;
  statement_date: string | null;
  last_statement_balance: number | null;
  last_statement_date: string | null;
  next_statement_date: string | null;
  minimum_payment_amount: number | null;
  late_fee_amount: number | null;
  grace_period_days: number | null;
  last_payment_date: string | null;
  last_payment_amount: number | null;
  days_past_due: number | null;
  total_fees_charged: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreditCardStatement {
  id: string;
  user_id: string;
  loan_id: string;
  statement_date: string;
  previous_balance: number;
  payments_credits: number;
  purchases_charges: number;
  interest_charged: number;
  fees_charged: number;
  new_balance: number;
  minimum_payment_due: number;
  payment_due_date: string;
  is_payment_received: boolean;
  payment_received_date: string | null;
  payment_amount: number;
  late_fees_applied: number;
  account_summary: object;
  payment_allocation: object;
  interest_calculation: object;
  fee_summary: object;
  credit_limit: number;
  available_credit: number;
  cash_advance_limit: number;
  available_cash_advance: number;
  over_limit_amount: number;
  days_in_billing_cycle: number;
  average_daily_balance: number;
  purchase_balance: number;
  cash_advance_balance: number;
  balance_transfer_balance: number;
  purchase_apr: number;
  cash_advance_apr: number;
  balance_transfer_apr: number;
  penalty_apr: number;
  is_penalty_pricing: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreditCardTransaction {
  id: string;
  user_id: string;
  loan_id: string;
  transaction_date: string;
  post_date: string;
  transaction_type: 'purchase' | 'payment' | 'interest' | 'fee' | 'cash_advance' | 'balance_transfer' | 'refund' | 'adjustment';
  description: string;
  merchant_name: string | null;
  category: string | null;
  amount: number;
  running_balance: number;
  statement_id: string | null;
  is_pending: boolean;
  created_at: string;
  updated_at: string;
}

export const dataService = {
  async getAssets(userId: string, allowOffline: boolean = true): Promise<Asset[]> {
    try {
      // Ensure encryption service is initialized for this user
      if (!encryptionService.isInitialized()) {
        await encryptionService.initialize(userId);
      }

      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Decrypt sensitive data before returning
      const assets = data || [];
      const decryptedAssets = await encryptionService.decryptSensitiveArray(assets);
      
      // Cache the encrypted data for offline use (not decrypted for security)
      await secureOfflineStorageService.cacheAssets(assets);
      
      return decryptedAssets;
    } catch (error) {
      // If online request fails and offline is allowed, return cached data
      if (allowOffline) {
        console.log('Loading assets from cache due to network error');
        const cachedAssets = await secureOfflineStorageService.getCachedAssets();
        // Decrypt cached data
        return await encryptionService.decryptSensitiveArray(cachedAssets);
      }
      throw error;
    }
  },

  async createAsset(asset: Omit<Asset, 'id' | 'created_at' | 'updated_at'>): Promise<Asset> {
    // Validate and sanitize input data
    const validation = dataSanitizationService.validateAsset(asset);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Ensure encryption service is initialized
    if (!encryptionService.isInitialized()) {
      await encryptionService.initialize(asset.user_id);
    }

    // Use sanitized data and encrypt sensitive fields before storing
    const encryptedAsset = await encryptionService.encryptSensitiveFields(validation.sanitizedData);

    const { data, error } = await supabase
      .from('assets')
      .insert(encryptedAsset)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Return decrypted data to the client
    return await encryptionService.decryptSensitiveFields(data);
  },

  async updateAsset(id: string, updates: Partial<Asset>): Promise<Asset> {
    const { data, error } = await supabase
      .from('assets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async deleteAsset(id: string): Promise<void> {
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  },

  async getLoans(userId: string, allowOffline: boolean = true): Promise<Loan[]> {
    try {
      // Ensure encryption service is initialized for this user
      if (!encryptionService.isInitialized()) {
        await encryptionService.initialize(userId);
      }

      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Decrypt sensitive data before returning
      const loans = data || [];
      const decryptedLoans = await encryptionService.decryptSensitiveArray(loans);
      
      // Cache the encrypted data for offline use (not decrypted for security)
      await secureOfflineStorageService.cacheLoans(loans);
      
      return decryptedLoans;
    } catch (error) {
      // If online request fails and offline is allowed, return cached data
      if (allowOffline) {
        console.log('Loading loans from cache due to network error');
        const cachedLoans = await secureOfflineStorageService.getCachedLoans();
        // Decrypt cached data
        return await encryptionService.decryptSensitiveArray(cachedLoans);
      }
      throw error;
    }
  },

  async createLoan(loan: Omit<Loan, 'id' | 'created_at' | 'updated_at'>): Promise<Loan> {
    const { data, error } = await supabase
      .from('loans')
      .insert(loan)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async updateLoan(id: string, updates: Partial<Loan>): Promise<Loan> {
    const { data, error } = await supabase
      .from('loans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async deleteLoan(id: string): Promise<void> {
    const { error } = await supabase
      .from('loans')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  },

  async updateUserProfile(userId: string, updates: { username?: string; default_currency?: string }): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      throw error;
    }
  },

  async acceptTermsAndPrivacy(userId: string, termsVersion: string = '1.0', privacyVersion: string = '1.0'): Promise<void> {
    const { error } = await supabase
      .rpc('accept_terms_and_privacy', {
        user_id_param: userId,
        terms_version_param: termsVersion,
        privacy_version_param: privacyVersion,
        acceptance_method_param: 'signup'
      });

    if (error) {
      throw error;
    }
  },

  async checkTermsAcceptance(userId: string, requiredTermsVersion: string = '1.0', requiredPrivacyVersion: string = '1.0'): Promise<any> {
    const { data, error } = await supabase
      .rpc('check_terms_acceptance', {
        user_id_param: userId,
        required_terms_version: requiredTermsVersion,
        required_privacy_version: requiredPrivacyVersion
      });

    if (error) {
      throw error;
    }

    return data;
  },

  async deleteUserAccount(userId: string): Promise<void> {
    try {
      // Clear local encrypted data and keys first
      if (encryptionService.isInitialized()) {
        await encryptionService.clearKeys(userId);
      }
      
      // Clear local cached data
      await secureOfflineStorageService.clearAllData();
      
      // Delete user account using database function
      const { error } = await supabase
        .rpc('delete_user_account', {
          user_id_param: userId
        });

      if (error) {
        throw error;
      }

      console.log('User account and all associated data deleted successfully');
    } catch (error) {
      console.error('Error deleting user account:', error);
      throw new Error('Failed to delete user account. Please try again or contact support.');
    }
  },

  // Newsletter subscription functions
  async subscribeToNewsletter(userId: string, source: string = 'app', preferences: any = {}): Promise<void> {
    const { data, error } = await supabase
      .rpc('subscribe_to_newsletter', {
        user_id_param: userId,
        source_param: source,
        preferences_param: preferences
      });

    if (error) {
      console.error('Newsletter subscription error:', error);
      throw error;
    }

    return data;
  },

  async unsubscribeFromNewsletter(userId: string, reason?: string): Promise<void> {
    const { data, error } = await supabase
      .rpc('unsubscribe_from_newsletter', {
        user_id_param: userId,
        reason_param: reason
      });

    if (error) {
      console.error('Newsletter unsubscription error:', error);
      throw error;
    }

    return data;
  },

  async getNewsletterSubscriptionStatus(userId: string): Promise<any> {
    const { data, error } = await supabase
      .rpc('get_newsletter_subscription_status', {
        user_id_param: userId
      });

    if (error) {
      console.error('Error getting newsletter status:', error);
      throw error;
    }

    return data;
  },

  // Loan Payment functions
  async getLoanPayments(userId: string, loanId: string): Promise<LoanPayment[]> {
    const { data, error } = await supabase
      .from('loan_payments')
      .select('*')
      .eq('user_id', userId)
      .eq('loan_id', loanId)
      .order('payment_date', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  },

  async createLoanPayment(payment: Omit<LoanPayment, 'id' | 'created_at' | 'updated_at'>): Promise<LoanPayment> {
    const { data, error } = await supabase
      .from('loan_payments')
      .insert([payment])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async updateLoanPayment(id: string, updates: Partial<Omit<LoanPayment, 'id' | 'user_id' | 'loan_id' | 'created_at' | 'updated_at'>>): Promise<void> {
    const { error } = await supabase
      .from('loan_payments')
      .update(updates)
      .eq('id', id);

    if (error) {
      throw error;
    }
  },

  async deleteLoanPayment(id: string): Promise<void> {
    const { error } = await supabase
      .from('loan_payments')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  },

  // Credit Card Statement functions
  async getCreditCardStatements(userId: string, loanId: string): Promise<CreditCardStatement[]> {
    const { data, error } = await supabase
      .from('credit_card_statements')
      .select('*')
      .eq('user_id', userId)
      .eq('loan_id', loanId)
      .order('statement_date', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  },

  async createCreditCardStatement(statement: Omit<CreditCardStatement, 'id' | 'created_at' | 'updated_at'>): Promise<CreditCardStatement> {
    const { data, error } = await supabase
      .from('credit_card_statements')
      .insert([statement])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async updateCreditCardStatement(id: string, updates: Partial<Omit<CreditCardStatement, 'id' | 'user_id' | 'loan_id' | 'created_at' | 'updated_at'>>): Promise<void> {
    const { error } = await supabase
      .from('credit_card_statements')
      .update(updates)
      .eq('id', id);

    if (error) {
      throw error;
    }
  },

  async getLatestStatement(userId: string, loanId: string): Promise<CreditCardStatement | null> {
    const { data, error } = await supabase
      .from('credit_card_statements')
      .select('*')
      .eq('user_id', userId)
      .eq('loan_id', loanId)
      .order('statement_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  },

  async getOverdueStatements(userId: string): Promise<CreditCardStatement[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('credit_card_statements')
      .select('*')
      .eq('user_id', userId)
      .eq('is_payment_received', false)
      .lt('payment_due_date', today);

    if (error) {
      throw error;
    }

    return data || [];
  },

  // Credit Card Statement Calculation Functions
  async calculateStatementInterest(loanId: string, previousBalance: number, annualRate: number, daysInPeriod: number = 30): Promise<number> {
    const dailyRate = annualRate / 100 / 365;
    return previousBalance * dailyRate * daysInPeriod;
  },

  async processLatePayment(statementId: string, daysLate: number, lateFeeAmount: number): Promise<void> {
    const { error } = await supabase
      .from('credit_card_statements')
      .update({
        late_fees_applied: lateFeeAmount,
        fees_charged: lateFeeAmount
      })
      .eq('id', statementId);

    if (error) {
      throw error;
    }
  },

  async recordStatementPayment(
    statementId: string, 
    paymentAmount: number, 
    paymentDate: string, 
    isLate: boolean = false,
    daysLate: number = 0
  ): Promise<void> {
    const { error } = await supabase
      .from('credit_card_statements')
      .update({
        is_payment_received: true,
        payment_received_date: paymentDate,
        payment_amount: paymentAmount
      })
      .eq('id', statementId);

    if (error) {
      throw error;
    }
  },

  // Credit Card Transaction Functions
  async getCreditCardTransactions(userId: string, loanId: string): Promise<CreditCardTransaction[]> {
    const { data, error } = await supabase
      .from('credit_card_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('loan_id', loanId)
      .order('transaction_date', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  },

  async createCreditCardTransaction(transaction: Omit<CreditCardTransaction, 'id' | 'created_at' | 'updated_at'>): Promise<CreditCardTransaction> {
    const { data, error } = await supabase
      .from('credit_card_transactions')
      .insert([transaction])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async addCreditCardPurchase(
    userId: string,
    loanId: string,
    amount: number,
    description: string,
    merchantName?: string,
    category?: string
  ): Promise<void> {
    const transactionDate = new Date().toISOString().split('T')[0];
    
    // Get current balance
    const loan = await this.getLoan(loanId);
    if (!loan) throw new Error('Credit card not found');
    
    const newBalance = (loan.current_balance || 0) + amount;
    
    // Create transaction record
    await this.createCreditCardTransaction({
      user_id: userId,
      loan_id: loanId,
      transaction_date: transactionDate,
      post_date: transactionDate,
      transaction_type: 'purchase',
      description,
      merchant_name: merchantName || null,
      category: category || null,
      amount,
      running_balance: newBalance,
      statement_id: null,
      is_pending: false
    });

    // Update loan balance
    await this.updateLoan(loanId, {
      current_balance: newBalance,
      available_credit: (loan.credit_limit || 0) - newBalance
    });
  },

  async processCreditCardPayment(
    userId: string,
    loanId: string,
    paymentAmount: number,
    paymentDate: string,
    isMinimumPayment: boolean = false,
    isLatePayment: boolean = false
  ): Promise<void> {
    // Get current balance
    const loan = await this.getLoan(loanId);
    if (!loan) throw new Error('Credit card not found');
    
    const newBalance = Math.max(0, (loan.current_balance || 0) - paymentAmount);
    
    // Create payment transaction
    await this.createCreditCardTransaction({
      user_id: userId,
      loan_id: loanId,
      transaction_date: paymentDate,
      post_date: paymentDate,
      transaction_type: 'payment',
      description: isMinimumPayment ? 'Minimum Payment' : 'Payment',
      merchant_name: null,
      category: null,
      amount: -paymentAmount, // Negative for payments
      running_balance: newBalance,
      statement_id: null,
      is_pending: false
    });

    // Update loan balance
    await this.updateLoan(loanId, {
      current_balance: newBalance,
      available_credit: (loan.credit_limit || 0) - newBalance,
      last_payment_date: paymentDate,
      last_payment_amount: paymentAmount
    });
  },

  async addCreditCardInterest(
    userId: string,
    loanId: string,
    interestAmount: number,
    calculationDate: string
  ): Promise<void> {
    // Get current balance
    const loan = await this.getLoan(loanId);
    if (!loan) throw new Error('Credit card not found');
    
    const newBalance = (loan.current_balance || 0) + interestAmount;
    
    // Create interest transaction
    await this.createCreditCardTransaction({
      user_id: userId,
      loan_id: loanId,
      transaction_date: calculationDate,
      post_date: calculationDate,
      transaction_type: 'interest',
      description: 'Interest Charge',
      merchant_name: null,
      category: null,
      amount: interestAmount,
      running_balance: newBalance,
      statement_id: null,
      is_pending: false
    });

    // Update loan balance
    await this.updateLoan(loanId, {
      current_balance: newBalance,
      available_credit: (loan.credit_limit || 0) - newBalance
    });
  },

  async addCreditCardFee(
    userId: string,
    loanId: string,
    feeAmount: number,
    feeType: string,
    feeDate: string
  ): Promise<void> {
    // Get current balance
    const loan = await this.getLoan(loanId);
    if (!loan) throw new Error('Credit card not found');
    
    const newBalance = (loan.current_balance || 0) + feeAmount;
    
    // Create fee transaction
    await this.createCreditCardTransaction({
      user_id: userId,
      loan_id: loanId,
      transaction_date: feeDate,
      post_date: feeDate,
      transaction_type: 'fee',
      description: feeType,
      merchant_name: null,
      category: null,
      amount: feeAmount,
      running_balance: newBalance,
      statement_id: null,
      is_pending: false
    });

    // Update loan balance
    await this.updateLoan(loanId, {
      current_balance: newBalance,
      available_credit: (loan.credit_limit || 0) - newBalance
    });
  },

  // Generate monthly statement using database function
  async generateMonthlyStatement(loanId: string, statementDate?: string): Promise<string> {
    const { data, error } = await supabase
      .rpc('generate_credit_card_statement', {
        loan_id_param: loanId,
        statement_date_param: statementDate || new Date().toISOString().split('T')[0]
      });

    if (error) {
      throw error;
    }

    return data;
  },

  // Calculate interest using database function
  async calculateInterest(loanId: string, calculationDate?: string): Promise<any> {
    const { data, error } = await supabase
      .rpc('calculate_credit_card_interest', {
        loan_id_param: loanId,
        calculation_date: calculationDate || new Date().toISOString().split('T')[0]
      });

    if (error) {
      throw error;
    }

    return data;
  },

  // Check for overdue payments and apply late fees
  async processOverduePayments(userId: string): Promise<void> {
    const overdueStatements = await this.getOverdueStatements(userId);
    
    for (const statement of overdueStatements) {
      const daysLate = Math.floor(
        (new Date().getTime() - new Date(statement.payment_due_date).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      
      if (daysLate > 0 && statement.late_fees_applied === 0) {
        // Apply late fee
        const lateFeeAmount = 25; // Default late fee
        await this.addCreditCardFee(
          userId,
          statement.loan_id,
          lateFeeAmount,
          'Late Payment Fee',
          new Date().toISOString().split('T')[0]
        );
        
        await this.processLatePayment(statement.id, daysLate, lateFeeAmount);
      }
    }
  },

  // Simple Credit Card Functions (Statement-based approach)
  async getSimpleCreditCardStatements(userId: string, loanId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('credit_card_statements')
      .select('*')
      .eq('user_id', userId)
      .eq('loan_id', loanId)
      .order('statement_date', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  },

  async createSimpleCreditCardStatement(statement: any): Promise<any> {
    const { data, error } = await supabase
      .from('credit_card_statements')
      .insert([statement])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async recordSimplePayment(statementId: string, paymentAmount: number, paymentDate: string): Promise<void> {
    const { error } = await supabase
      .rpc('record_credit_card_payment', {
        statement_id_param: statementId,
        payment_amount_param: paymentAmount,
        payment_date_param: paymentDate
      });

    if (error) {
      throw error;
    }
  },

  async checkOverdueStatements(): Promise<void> {
    const { error } = await supabase
      .rpc('check_overdue_statements');

    if (error) {
      throw error;
    }
  },

  // Currency update functions
  async updateDefaultCurrencyAssets(userId: string, oldCurrency: string, newCurrency: string): Promise<void> {
    // Update assets that were created with the old default currency to the new default currency
    // This preserves explicitly set currencies (different from old default) unchanged
    const { error } = await supabase
      .from('assets')
      .update({ currency: newCurrency })
      .eq('user_id', userId)
      .eq('currency', oldCurrency);

    if (error) {
      throw error;
    }
  },

  async updateDefaultCurrencyLoans(userId: string, oldCurrency: string, newCurrency: string): Promise<void> {
    // Update loans that were created with the old default currency to the new default currency
    // This preserves explicitly set currencies (different from old default) unchanged
    const { error } = await supabase
      .from('loans')
      .update({ currency: newCurrency })
      .eq('user_id', userId)
      .eq('currency', oldCurrency);

    if (error) {
      throw error;
    }
  },

  async updateUserDefaultCurrency(userId: string, currency: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ default_currency: currency })
      .eq('id', userId);

    if (error) {
      throw error;
    }
  },

  // Add supabase reference for direct RPC calls
  get supabase() {
    return supabase;
  },
};
