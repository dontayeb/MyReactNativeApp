-- Basic Encryption Schema Update
-- This only adds encryption to the core tables: assets, loans, and profiles
-- Run this if you only have the basic tables set up

-- 1. Add encrypted columns to assets table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assets') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'value_encrypted') THEN
            ALTER TABLE public.assets 
            ADD COLUMN value_encrypted text,
            ADD COLUMN value_masked text,
            ADD COLUMN data_hash text,
            ADD COLUMN encryption_version text DEFAULT '1.0';
            
            RAISE NOTICE '✅ Added encryption columns to assets table';
        ELSE
            RAISE NOTICE 'ℹ️ Encryption columns already exist in assets table';
        END IF;
    ELSE
        RAISE NOTICE '❌ Assets table does not exist - please run SUPABASE_SETUP.sql first';
    END IF;
END $$;

-- 2. Add encrypted columns to loans table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'loans') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'principal_encrypted') THEN
            ALTER TABLE public.loans 
            ADD COLUMN principal_encrypted text,
            ADD COLUMN principal_masked text,
            ADD COLUMN current_balance_encrypted text,
            ADD COLUMN current_balance_masked text,
            ADD COLUMN monthly_payment_encrypted text,
            ADD COLUMN monthly_payment_masked text,
            ADD COLUMN credit_limit_encrypted text,
            ADD COLUMN credit_limit_masked text,
            ADD COLUMN data_hash text,
            ADD COLUMN encryption_version text DEFAULT '1.0';
            
            RAISE NOTICE '✅ Added encryption columns to loans table';
        ELSE
            RAISE NOTICE 'ℹ️ Encryption columns already exist in loans table';
        END IF;
    ELSE
        RAISE NOTICE '❌ Loans table does not exist - please run SUPABASE_SETUP.sql first';
    END IF;
END $$;

-- 3. Add encrypted columns to profiles table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'monthly_survival_budget_encrypted') THEN
            ALTER TABLE public.profiles 
            ADD COLUMN monthly_survival_budget_encrypted text,
            ADD COLUMN monthly_survival_budget_masked text,
            ADD COLUMN data_hash text,
            ADD COLUMN encryption_version text DEFAULT '1.0';
            
            RAISE NOTICE '✅ Added encryption columns to profiles table';
        ELSE
            RAISE NOTICE 'ℹ️ Encryption columns already exist in profiles table';
        END IF;
    ELSE
        RAISE NOTICE '❌ Profiles table does not exist - please run SUPABASE_SETUP.sql first';
    END IF;
END $$;

-- 4. Create encryption audit log table
CREATE TABLE IF NOT EXISTS public.encryption_audit_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    action text NOT NULL CHECK (action IN ('encrypt', 'decrypt', 'rekey', 'verify_fail', 'account_deletion_start', 'account_deletion_complete', 'account_deletion_failed', 'user_deleted')),
    user_id uuid REFERENCES auth.users(id),
    timestamp timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    success boolean DEFAULT true,
    error_message text,
    encryption_version text DEFAULT '1.0'
);

-- Enable RLS on encryption audit log
ALTER TABLE public.encryption_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for encryption audit log
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'encryption_audit_log' AND policyname = 'Users can view their own encryption audit log') THEN
        CREATE POLICY "Users can view their own encryption audit log" ON public.encryption_audit_log
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'encryption_audit_log' AND policyname = 'System can insert encryption audit log') THEN
        CREATE POLICY "System can insert encryption audit log" ON public.encryption_audit_log
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_encryption_audit_user_id ON public.encryption_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_encryption_audit_timestamp ON public.encryption_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_encryption_audit_action ON public.encryption_audit_log(action);

-- 6. Function to log encryption events
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

-- 7. Create basic encryption statistics view
CREATE OR REPLACE VIEW encryption_statistics AS
SELECT 
    'assets' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN value_encrypted IS NOT NULL THEN 1 END) as encrypted_records,
    COUNT(CASE WHEN value IS NOT NULL AND value_encrypted IS NULL THEN 1 END) as unencrypted_records
FROM public.assets
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assets')

UNION ALL

SELECT 
    'loans' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN principal_encrypted IS NOT NULL THEN 1 END) as encrypted_records,
    COUNT(CASE WHEN principal IS NOT NULL AND principal_encrypted IS NULL THEN 1 END) as unencrypted_records
FROM public.loans
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'loans')

UNION ALL

SELECT 
    'profiles' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN monthly_survival_budget_encrypted IS NOT NULL THEN 1 END) as encrypted_records,
    COUNT(CASE WHEN monthly_survival_budget IS NOT NULL AND monthly_survival_budget_encrypted IS NULL THEN 1 END) as unencrypted_records
FROM public.profiles
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles');

-- 8. Function to check encryption coverage
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

-- 9. Show final status
DO $$
DECLARE
    assets_exists boolean;
    loans_exists boolean;
    profiles_exists boolean;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assets') INTO assets_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'loans') INTO loans_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') INTO profiles_exists;
    
    RAISE NOTICE '=== ENCRYPTION SETUP COMPLETE ===';
    RAISE NOTICE 'Tables processed:';
    RAISE NOTICE '  📊 Assets: %', CASE WHEN assets_exists THEN '✅ ENCRYPTED' ELSE '❌ MISSING' END;
    RAISE NOTICE '  💳 Loans: %', CASE WHEN loans_exists THEN '✅ ENCRYPTED' ELSE '❌ MISSING' END;
    RAISE NOTICE '  👤 Profiles: %', CASE WHEN profiles_exists THEN '✅ ENCRYPTED' ELSE '❌ MISSING' END;
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Test encryption: SELECT * FROM check_encryption_coverage();';
    RAISE NOTICE '  2. Your app will now encrypt new data automatically';
    RAISE NOTICE '  3. Existing data will be encrypted when next updated';
END $$;