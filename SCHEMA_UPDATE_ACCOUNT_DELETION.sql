-- Schema Update: Add Secure Account Deletion Function
-- Run this SQL in your Supabase SQL editor to add account deletion functionality

-- 1. Create comprehensive account deletion function
CREATE OR REPLACE FUNCTION delete_user_account(user_id_param uuid)
RETURNS jsonb AS $$
DECLARE
    deletion_summary jsonb := '{}';
    assets_count integer := 0;
    loans_count integer := 0;
    payments_count integer := 0;
    statements_count integer := 0;
    transactions_count integer := 0;
    terms_history_count integer := 0;
    audit_logs_count integer := 0;
BEGIN
    -- Verify the user exists and the function is called by the user themselves
    IF auth.uid() != user_id_param THEN
        RAISE EXCEPTION 'Unauthorized: You can only delete your own account';
    END IF;
    
    -- Count data before deletion for summary
    SELECT COUNT(*) INTO assets_count FROM public.assets WHERE user_id = user_id_param;
    SELECT COUNT(*) INTO loans_count FROM public.loans WHERE user_id = user_id_param;
    SELECT COUNT(*) INTO payments_count FROM public.loan_payments WHERE user_id = user_id_param;
    SELECT COUNT(*) INTO statements_count FROM public.credit_card_statements WHERE user_id = user_id_param;
    SELECT COUNT(*) INTO transactions_count FROM public.credit_card_transactions WHERE user_id = user_id_param;
    SELECT COUNT(*) INTO terms_history_count FROM public.terms_acceptance_history WHERE user_id = user_id_param;
    SELECT COUNT(*) INTO audit_logs_count FROM public.encryption_audit_log WHERE user_id = user_id_param;
    
    -- Log the account deletion attempt
    INSERT INTO public.encryption_audit_log (
        table_name,
        record_id,
        action,
        user_id,
        success,
        encryption_version
    ) VALUES (
        'user_account',
        user_id_param,
        'account_deletion_start',
        user_id_param,
        true,
        '1.0'
    );
    
    -- Delete all user data in correct order (respecting foreign key constraints)
    
    -- 1. Delete credit card transactions (references statements and loans)
    DELETE FROM public.credit_card_transactions WHERE user_id = user_id_param;
    
    -- 2. Delete credit card statements (references loans)
    DELETE FROM public.credit_card_statements WHERE user_id = user_id_param;
    
    -- 3. Delete loan payments (references loans)
    DELETE FROM public.loan_payments WHERE user_id = user_id_param;
    
    -- 4. Delete loans (references user)
    DELETE FROM public.loans WHERE user_id = user_id_param;
    
    -- 5. Delete assets (references user)
    DELETE FROM public.assets WHERE user_id = user_id_param;
    
    -- 6. Delete terms acceptance history (references user)
    DELETE FROM public.terms_acceptance_history WHERE user_id = user_id_param;
    
    -- 7. Delete encryption audit logs (references user)
    DELETE FROM public.encryption_audit_log WHERE user_id = user_id_param;
    
    -- 8. Delete user profile (references auth.users)
    DELETE FROM public.profiles WHERE id = user_id_param;
    
    -- 9. Finally delete the auth user (this will cascade to any remaining references)
    DELETE FROM auth.users WHERE id = user_id_param;
    
    -- Build deletion summary
    deletion_summary := jsonb_build_object(
        'user_id', user_id_param,
        'deletion_timestamp', NOW(),
        'data_deleted', jsonb_build_object(
            'assets', assets_count,
            'loans', loans_count,
            'loan_payments', payments_count,
            'credit_card_statements', statements_count,
            'credit_card_transactions', transactions_count,
            'terms_acceptance_history', terms_history_count,
            'encryption_audit_logs', audit_logs_count,
            'profile', CASE WHEN assets_count > 0 OR loans_count > 0 THEN 1 ELSE 0 END,
            'auth_user', 1
        ),
        'status', 'completed'
    );
    
    -- Log successful completion (this will be one of the last things that happens)
    INSERT INTO public.encryption_audit_log (
        table_name,
        record_id,
        action,
        user_id,
        success,
        encryption_version
    ) VALUES (
        'user_account',
        user_id_param,
        'account_deletion_complete',
        user_id_param,
        true,
        '1.0'
    );
    
    RETURN deletion_summary;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the failure
        INSERT INTO public.encryption_audit_log (
            table_name,
            record_id,
            action,
            user_id,
            success,
            error_message,
            encryption_version
        ) VALUES (
            'user_account',
            user_id_param,
            'account_deletion_failed',
            user_id_param,
            false,
            SQLERRM,
            '1.0'
        );
        
        -- Re-raise the exception
        RAISE EXCEPTION 'Account deletion failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create function to anonymize user data (alternative to full deletion)
CREATE OR REPLACE FUNCTION anonymize_user_account(user_id_param uuid)
RETURNS jsonb AS $$
DECLARE
    anonymization_summary jsonb := '{}';
    random_suffix text;
BEGIN
    -- Verify the user exists and the function is called by the user themselves
    IF auth.uid() != user_id_param THEN
        RAISE EXCEPTION 'Unauthorized: You can only anonymize your own account';
    END IF;
    
    -- Generate random suffix for anonymized data
    random_suffix := substr(md5(random()::text), 1, 8);
    
    -- Log the anonymization attempt
    INSERT INTO public.encryption_audit_log (
        table_name,
        record_id,
        action,
        user_id,
        success,
        encryption_version
    ) VALUES (
        'user_account',
        user_id_param,
        'account_anonymization_start',
        user_id_param,
        true,
        '1.0'
    );
    
    -- Anonymize user profile data
    UPDATE public.profiles SET 
        username = 'deleted_user_' || random_suffix,
        age_group = null,
        gender = null,
        country = null,
        monthly_survival_budget = null,
        monthly_survival_budget_encrypted = null,
        monthly_survival_budget_masked = null,
        terms_accepted = false,
        terms_accepted_at = null,
        updated_at = NOW()
    WHERE id = user_id_param;
    
    -- Anonymize asset names (keep financial data for analytics but remove identifying info)
    UPDATE public.assets SET 
        name = 'Asset_' || random_suffix || '_' || ROW_NUMBER() OVER (ORDER BY created_at),
        updated_at = NOW()
    WHERE user_id = user_id_param;
    
    -- Anonymize loan names
    UPDATE public.loans SET 
        name = 'Loan_' || random_suffix || '_' || ROW_NUMBER() OVER (ORDER BY created_at),
        updated_at = NOW()
    WHERE user_id = user_id_param;
    
    -- Clear email from auth.users (set to anonymous email)
    UPDATE auth.users SET 
        email = 'deleted_' || random_suffix || '@example.com',
        email_confirmed_at = null,
        updated_at = NOW()
    WHERE id = user_id_param;
    
    anonymization_summary := jsonb_build_object(
        'user_id', user_id_param,
        'anonymization_timestamp', NOW(),
        'status', 'completed',
        'anonymous_suffix', random_suffix
    );
    
    -- Log successful completion
    INSERT INTO public.encryption_audit_log (
        table_name,
        record_id,
        action,
        user_id,
        success,
        encryption_version
    ) VALUES (
        'user_account',
        user_id_param,
        'account_anonymization_complete',
        user_id_param,
        true,
        '1.0'
    );
    
    RETURN anonymization_summary;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the failure
        INSERT INTO public.encryption_audit_log (
            table_name,
            record_id,
            action,
            user_id,
            success,
            error_message,
            encryption_version
        ) VALUES (
            'user_account',
            user_id_param,
            'account_anonymization_failed',
            user_id_param,
            false,
            SQLERRM,
            '1.0'
        );
        
        -- Re-raise the exception
        RAISE EXCEPTION 'Account anonymization failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to get account deletion preview (what will be deleted)
CREATE OR REPLACE FUNCTION get_account_deletion_preview(user_id_param uuid)
RETURNS jsonb AS $$
DECLARE
    preview_data jsonb := '{}';
    assets_count integer := 0;
    loans_count integer := 0;
    payments_count integer := 0;
    statements_count integer := 0;
    transactions_count integer := 0;
    terms_history_count integer := 0;
    audit_logs_count integer := 0;
BEGIN
    -- Verify the user exists and the function is called by the user themselves
    IF auth.uid() != user_id_param THEN
        RAISE EXCEPTION 'Unauthorized: You can only preview your own account deletion';
    END IF;
    
    -- Count all data that would be deleted
    SELECT COUNT(*) INTO assets_count FROM public.assets WHERE user_id = user_id_param;
    SELECT COUNT(*) INTO loans_count FROM public.loans WHERE user_id = user_id_param;
    SELECT COUNT(*) INTO payments_count FROM public.loan_payments WHERE user_id = user_id_param;
    SELECT COUNT(*) INTO statements_count FROM public.credit_card_statements WHERE user_id = user_id_param;
    SELECT COUNT(*) INTO transactions_count FROM public.credit_card_transactions WHERE user_id = user_id_param;
    SELECT COUNT(*) INTO terms_history_count FROM public.terms_acceptance_history WHERE user_id = user_id_param;
    SELECT COUNT(*) INTO audit_logs_count FROM public.encryption_audit_log WHERE user_id = user_id_param;
    
    preview_data := jsonb_build_object(
        'user_id', user_id_param,
        'preview_timestamp', NOW(),
        'data_to_be_deleted', jsonb_build_object(
            'assets', assets_count,
            'loans', loans_count,
            'loan_payments', payments_count,
            'credit_card_statements', statements_count,
            'credit_card_transactions', transactions_count,
            'terms_acceptance_history', terms_history_count,
            'encryption_audit_logs', audit_logs_count,
            'profile', 1,
            'auth_user', 1
        ),
        'warning', 'This action cannot be undone. All data will be permanently deleted.'
    );
    
    RETURN preview_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger to log account deletions for compliance
CREATE OR REPLACE FUNCTION log_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Log user deletion for audit purposes
    INSERT INTO public.encryption_audit_log (
        table_name,
        record_id,
        action,
        user_id,
        success,
        encryption_version
    ) VALUES (
        'auth.users',
        OLD.id,
        'user_deleted',
        OLD.id,
        true,
        '1.0'
    );
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user deletion logging
DROP TRIGGER IF EXISTS on_user_deleted ON auth.users;
CREATE TRIGGER on_user_deleted
    BEFORE DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION log_user_deletion();

-- 5. Create view for account deletion statistics (admin use)
CREATE OR REPLACE VIEW account_deletion_stats AS
SELECT 
    DATE_TRUNC('day', timestamp) as deletion_date,
    COUNT(CASE WHEN action = 'account_deletion_complete' THEN 1 END) as successful_deletions,
    COUNT(CASE WHEN action = 'account_deletion_failed' THEN 1 END) as failed_deletions,
    COUNT(CASE WHEN action = 'account_anonymization_complete' THEN 1 END) as successful_anonymizations,
    COUNT(CASE WHEN action = 'account_anonymization_failed' THEN 1 END) as failed_anonymizations
FROM public.encryption_audit_log
WHERE action IN ('account_deletion_complete', 'account_deletion_failed', 'account_anonymization_complete', 'account_anonymization_failed')
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY deletion_date DESC;

-- 6. Grant execute permissions on the functions
-- Note: These functions use SECURITY DEFINER, so they run with the privileges of the function owner
-- The user authentication is handled within the function itself

-- 7. Create indexes for better performance on large datasets
CREATE INDEX IF NOT EXISTS idx_audit_log_action_timestamp ON public.encryption_audit_log(action, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_action ON public.encryption_audit_log(user_id, action);

-- Usage examples:
-- To preview what will be deleted: SELECT get_account_deletion_preview(auth.uid());
-- To delete account: SELECT delete_user_account(auth.uid());
-- To anonymize instead: SELECT anonymize_user_account(auth.uid());
-- To view deletion stats: SELECT * FROM account_deletion_stats;