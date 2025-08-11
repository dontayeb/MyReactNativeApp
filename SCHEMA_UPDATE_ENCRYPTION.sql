-- Schema Update: Add Field-Level Encryption Support
-- Run this SQL in your Supabase SQL editor to add encryption columns

-- 1. Add encrypted columns to assets table
ALTER TABLE public.assets 
ADD COLUMN value_encrypted text,
ADD COLUMN value_masked text,
ADD COLUMN data_hash text,
ADD COLUMN encryption_version text DEFAULT '1.0';

-- 2. Add encrypted columns to loans table  
ALTER TABLE public.loans 
ADD COLUMN principal_encrypted text,
ADD COLUMN principal_masked text,
ADD COLUMN current_balance_encrypted text,
ADD COLUMN current_balance_masked text,
ADD COLUMN monthly_payment_encrypted text,
ADD COLUMN monthly_payment_masked text,
ADD COLUMN credit_limit_encrypted text,
ADD COLUMN credit_limit_masked text,
ADD COLUMN last_payment_amount_encrypted text,
ADD COLUMN last_payment_amount_masked text,
ADD COLUMN minimum_payment_amount_encrypted text,
ADD COLUMN minimum_payment_amount_masked text,
ADD COLUMN data_hash text,
ADD COLUMN encryption_version text DEFAULT '1.0';

-- 3. Add encrypted columns to profiles table for sensitive financial data
ALTER TABLE public.profiles 
ADD COLUMN monthly_survival_budget_encrypted text,
ADD COLUMN monthly_survival_budget_masked text,
ADD COLUMN salary_encrypted text,
ADD COLUMN salary_masked text,
ADD COLUMN data_hash text,
ADD COLUMN encryption_version text DEFAULT '1.0';

-- 4. Add encrypted columns to loan_payments table
ALTER TABLE public.loan_payments 
ADD COLUMN amount_encrypted text,
ADD COLUMN amount_masked text,
ADD COLUMN data_hash text,
ADD COLUMN encryption_version text DEFAULT '1.0';

-- 5. Add encrypted columns to credit_card_statements table
ALTER TABLE public.credit_card_statements 
ADD COLUMN previous_balance_encrypted text,
ADD COLUMN previous_balance_masked text,
ADD COLUMN new_balance_encrypted text,
ADD COLUMN new_balance_masked text,
ADD COLUMN payment_amount_encrypted text,
ADD COLUMN payment_amount_masked text,
ADD COLUMN minimum_payment_due_encrypted text,
ADD COLUMN minimum_payment_due_masked text,
ADD COLUMN credit_limit_encrypted text,
ADD COLUMN credit_limit_masked text,
ADD COLUMN available_credit_encrypted text,
ADD COLUMN available_credit_masked text,
ADD COLUMN data_hash text,
ADD COLUMN encryption_version text DEFAULT '1.0';

-- 6. Add encrypted columns to credit_card_transactions table
ALTER TABLE public.credit_card_transactions 
ADD COLUMN amount_encrypted text,
ADD COLUMN amount_masked text,
ADD COLUMN running_balance_encrypted text,
ADD COLUMN running_balance_masked text,
ADD COLUMN data_hash text,
ADD COLUMN encryption_version text DEFAULT '1.0';

-- 7. Create function to validate data integrity
CREATE OR REPLACE FUNCTION validate_data_integrity(
    table_name text,
    record_id uuid,
    expected_hash text
)
RETURNS boolean AS $$
DECLARE
    stored_hash text;
    query_text text;
BEGIN
    -- Build dynamic query to get hash from specified table
    query_text := format('SELECT data_hash FROM public.%I WHERE id = $1', table_name);
    
    EXECUTE query_text INTO stored_hash USING record_id;
    
    RETURN stored_hash = expected_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to clean up old unencrypted data (use with caution)
CREATE OR REPLACE FUNCTION migrate_to_encrypted_storage()
RETURNS text AS $$
DECLARE
    migration_report text := '';
    record_count integer;
BEGIN
    -- This function should be run after all data has been properly encrypted
    -- and you've verified the encryption is working correctly
    
    -- Count records that still have unencrypted sensitive data
    SELECT COUNT(*) INTO record_count 
    FROM public.assets 
    WHERE value IS NOT NULL AND value_encrypted IS NULL;
    
    migration_report := migration_report || 'Assets with unencrypted values: ' || record_count || E'\n';
    
    SELECT COUNT(*) INTO record_count 
    FROM public.loans 
    WHERE principal IS NOT NULL AND principal_encrypted IS NULL;
    
    migration_report := migration_report || 'Loans with unencrypted principal: ' || record_count || E'\n';
    
    -- Add warnings about data migration
    migration_report := migration_report || E'\nWARNING: Before running any data migration:' || E'\n';
    migration_report := migration_report || '1. Backup your database' || E'\n';
    migration_report := migration_report || '2. Verify encryption is working correctly' || E'\n';
    migration_report := migration_report || '3. Test data retrieval with your app' || E'\n';
    migration_report := migration_report || '4. Only then consider removing unencrypted columns' || E'\n';
    
    RETURN migration_report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create indexes for encrypted data queries (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_assets_encryption_version ON public.assets(encryption_version);
CREATE INDEX IF NOT EXISTS idx_loans_encryption_version ON public.loans(encryption_version);
CREATE INDEX IF NOT EXISTS idx_profiles_encryption_version ON public.profiles(encryption_version);

-- 10. Create view for encrypted data statistics
CREATE OR REPLACE VIEW encryption_statistics AS
SELECT 
    'assets' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN value_encrypted IS NOT NULL THEN 1 END) as encrypted_records,
    COUNT(CASE WHEN value IS NOT NULL AND value_encrypted IS NULL THEN 1 END) as unencrypted_records
FROM public.assets
UNION ALL
SELECT 
    'loans' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN principal_encrypted IS NOT NULL THEN 1 END) as encrypted_records,
    COUNT(CASE WHEN principal IS NOT NULL AND principal_encrypted IS NULL THEN 1 END) as unencrypted_records
FROM public.loans
UNION ALL
SELECT 
    'profiles' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN monthly_survival_budget_encrypted IS NOT NULL THEN 1 END) as encrypted_records,
    COUNT(CASE WHEN monthly_survival_budget IS NOT NULL AND monthly_survival_budget_encrypted IS NULL THEN 1 END) as unencrypted_records
FROM public.profiles;

-- 11. Create function to check encryption coverage
CREATE OR REPLACE FUNCTION check_encryption_coverage()
RETURNS TABLE(
    table_name text,
    total_records bigint,
    encrypted_records bigint,
    encryption_percentage numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        es.table_name::text,
        es.total_records,
        es.encrypted_records,
        CASE 
            WHEN es.total_records = 0 THEN 0::numeric
            ELSE ROUND((es.encrypted_records::numeric / es.total_records::numeric) * 100, 2)
        END as encryption_percentage
    FROM encryption_statistics es;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Add constraint to ensure data integrity (optional - uncomment if needed)
-- ALTER TABLE public.assets 
-- ADD CONSTRAINT check_encryption_consistency 
-- CHECK ((value IS NULL AND value_encrypted IS NULL) OR (value IS NOT NULL OR value_encrypted IS NOT NULL));

-- 13. Create audit log for encryption events (optional but recommended)
CREATE TABLE IF NOT EXISTS public.encryption_audit_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    action text NOT NULL CHECK (action IN ('encrypt', 'decrypt', 'rekey', 'verify_fail')),
    user_id uuid REFERENCES auth.users(id),
    timestamp timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    success boolean DEFAULT true,
    error_message text,
    encryption_version text
);

-- 14. Enable RLS on encryption audit log
ALTER TABLE public.encryption_audit_log ENABLE ROW LEVEL SECURITY;

-- 15. Create RLS policies for encryption audit log
CREATE POLICY "Users can view their own encryption audit log" ON public.encryption_audit_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert encryption audit log" ON public.encryption_audit_log
    FOR INSERT WITH CHECK (true); -- Allow system to log all encryption events

-- 16. Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_encryption_audit_user_id ON public.encryption_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_encryption_audit_timestamp ON public.encryption_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_encryption_audit_action ON public.encryption_audit_log(action);

-- 17. Function to log encryption events
CREATE OR REPLACE FUNCTION log_encryption_event(
    p_table_name text,
    p_record_id uuid,
    p_action text,
    p_user_id uuid DEFAULT auth.uid(),
    p_success boolean DEFAULT true,
    p_error_message text DEFAULT NULL,
    p_encryption_version text DEFAULT '1.0'
)
RETURNS uuid AS $$
DECLARE
    log_id uuid;
BEGIN
    INSERT INTO public.encryption_audit_log (
        table_name,
        record_id,
        action,
        user_id,
        success,
        error_message,
        encryption_version
    ) VALUES (
        p_table_name,
        p_record_id,
        p_action,
        p_user_id,
        p_success,
        p_error_message,
        p_encryption_version
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;