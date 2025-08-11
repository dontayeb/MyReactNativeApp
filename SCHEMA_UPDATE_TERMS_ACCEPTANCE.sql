-- Schema Update: Add Terms Acceptance Tracking
-- Run this SQL in your Supabase SQL editor to add terms acceptance functionality

-- 1. Add terms acceptance fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN terms_accepted boolean DEFAULT false,
ADD COLUMN terms_accepted_at timestamp with time zone,
ADD COLUMN terms_version text DEFAULT '1.0',
ADD COLUMN privacy_policy_accepted boolean DEFAULT false,
ADD COLUMN privacy_policy_accepted_at timestamp with time zone,
ADD COLUMN privacy_policy_version text DEFAULT '1.0';

-- 2. Update the profile creation function to include terms acceptance
-- Note: Users will need to accept terms during signup, so they start as false
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    username, 
    default_currency, 
    age_group, 
    gender, 
    country,
    terms_accepted,
    privacy_policy_accepted,
    terms_version,
    privacy_policy_version
  )
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'username', 
    'USD', 
    null, 
    null, 
    null,
    false,
    false,
    '1.0',
    '1.0'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a function to record terms acceptance
CREATE OR REPLACE FUNCTION public.accept_terms_and_privacy(
    user_id_param uuid,
    terms_version_param text DEFAULT '1.0',
    privacy_version_param text DEFAULT '1.0'
)
RETURNS boolean AS $$
BEGIN
    UPDATE public.profiles SET 
        terms_accepted = true,
        terms_accepted_at = timezone('utc'::text, now()),
        terms_version = terms_version_param,
        privacy_policy_accepted = true,
        privacy_policy_accepted_at = timezone('utc'::text, now()),
        privacy_policy_version = privacy_version_param,
        updated_at = timezone('utc'::text, now())
    WHERE id = user_id_param;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create a function to check if user has accepted current terms
CREATE OR REPLACE FUNCTION public.check_terms_acceptance(
    user_id_param uuid,
    required_terms_version text DEFAULT '1.0',
    required_privacy_version text DEFAULT '1.0'
)
RETURNS jsonb AS $$
DECLARE
    profile_record RECORD;
BEGIN
    SELECT 
        terms_accepted,
        terms_accepted_at,
        terms_version,
        privacy_policy_accepted,
        privacy_policy_accepted_at,
        privacy_policy_version
    INTO profile_record
    FROM public.profiles 
    WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'terms_accepted', false,
            'privacy_accepted', false,
            'needs_update', true,
            'error', 'Profile not found'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'terms_accepted', profile_record.terms_accepted,
        'terms_version', profile_record.terms_version,
        'terms_accepted_at', profile_record.terms_accepted_at,
        'privacy_accepted', profile_record.privacy_policy_accepted,
        'privacy_version', profile_record.privacy_policy_version,
        'privacy_accepted_at', profile_record.privacy_policy_accepted_at,
        'needs_terms_update', profile_record.terms_version != required_terms_version OR NOT profile_record.terms_accepted,
        'needs_privacy_update', profile_record.privacy_policy_version != required_privacy_version OR NOT profile_record.privacy_policy_accepted,
        'needs_update', (profile_record.terms_version != required_terms_version OR NOT profile_record.terms_accepted) OR 
                       (profile_record.privacy_policy_version != required_privacy_version OR NOT profile_record.privacy_policy_accepted)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create a table to track terms acceptance history (optional but recommended for compliance)
CREATE TABLE IF NOT EXISTS public.terms_acceptance_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    terms_version text NOT NULL,
    privacy_policy_version text NOT NULL,
    accepted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    ip_address inet,
    user_agent text,
    acceptance_method text DEFAULT 'signup' CHECK (acceptance_method IN ('signup', 'update', 'forced_update')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create indexes for terms_acceptance_history
CREATE INDEX IF NOT EXISTS idx_terms_history_user_id ON public.terms_acceptance_history(user_id);
CREATE INDEX IF NOT EXISTS idx_terms_history_accepted_at ON public.terms_acceptance_history(accepted_at);

-- 7. Enable RLS on terms_acceptance_history
ALTER TABLE public.terms_acceptance_history ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for terms_acceptance_history
CREATE POLICY "Users can view their own terms acceptance history" ON public.terms_acceptance_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert terms acceptance history" ON public.terms_acceptance_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. Update the accept_terms_and_privacy function to also log to history
CREATE OR REPLACE FUNCTION public.accept_terms_and_privacy(
    user_id_param uuid,
    terms_version_param text DEFAULT '1.0',
    privacy_version_param text DEFAULT '1.0',
    acceptance_method_param text DEFAULT 'signup'
)
RETURNS boolean AS $$
BEGIN
    -- Update the profile
    UPDATE public.profiles SET 
        terms_accepted = true,
        terms_accepted_at = timezone('utc'::text, now()),
        terms_version = terms_version_param,
        privacy_policy_accepted = true,
        privacy_policy_accepted_at = timezone('utc'::text, now()),
        privacy_policy_version = privacy_version_param,
        updated_at = timezone('utc'::text, now())
    WHERE id = user_id_param;
    
    -- Log to history table
    INSERT INTO public.terms_acceptance_history (
        user_id,
        terms_version,
        privacy_policy_version,
        acceptance_method
    ) VALUES (
        user_id_param,
        terms_version_param,
        privacy_version_param,
        acceptance_method_param
    );
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Add constraint to ensure terms are accepted for active users (optional)
-- This can be uncommented if you want to enforce terms acceptance at the database level
-- ALTER TABLE public.profiles 
-- ADD CONSTRAINT check_terms_accepted 
-- CHECK (terms_accepted = true OR created_at > NOW() - INTERVAL '1 day');

-- 11. Update existing users to have default terms acceptance fields
-- This sets existing users to have accepted the current terms (adjust as needed for your use case)
UPDATE public.profiles 
SET 
    terms_accepted = true,
    terms_accepted_at = created_at,
    terms_version = '1.0',
    privacy_policy_accepted = true,
    privacy_policy_accepted_at = created_at,
    privacy_policy_version = '1.0'
WHERE terms_accepted IS NULL OR privacy_policy_accepted IS NULL;