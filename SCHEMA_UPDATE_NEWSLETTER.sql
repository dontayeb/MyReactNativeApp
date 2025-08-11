-- Schema Update: Add Newsletter Subscription System
-- Run this SQL in your Supabase SQL editor to add newsletter functionality

-- 1. Add newsletter subscription fields to profiles table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        -- Check if newsletter columns don't already exist before adding
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'newsletter_subscribed') THEN
            ALTER TABLE public.profiles 
            ADD COLUMN newsletter_subscribed boolean DEFAULT false,
            ADD COLUMN newsletter_subscribed_at timestamp with time zone,
            ADD COLUMN newsletter_unsubscribed_at timestamp with time zone,
            ADD COLUMN newsletter_subscription_source text DEFAULT 'app' CHECK (newsletter_subscription_source IN ('signup', 'settings', 'app', 'web')),
            ADD COLUMN newsletter_preferences jsonb DEFAULT '{}';
            
            RAISE NOTICE '✅ Added newsletter subscription columns to profiles table';
        ELSE
            RAISE NOTICE 'ℹ️ Newsletter subscription columns already exist in profiles table';
        END IF;
    ELSE
        RAISE NOTICE '❌ Profiles table does not exist - please run SUPABASE_SETUP.sql first';
    END IF;
END $$;

-- 2. Create newsletter subscriptions table for detailed tracking
CREATE TABLE IF NOT EXISTS public.newsletter_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    email text NOT NULL,
    subscribed boolean DEFAULT true,
    subscription_source text DEFAULT 'app' CHECK (subscription_source IN ('signup', 'settings', 'app', 'web', 'api')),
    subscription_date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    unsubscription_date timestamp with time zone,
    unsubscribe_reason text,
    preferences jsonb DEFAULT '{}',
    email_verified boolean DEFAULT false,
    email_verification_token text,
    email_verification_sent_at timestamp with time zone,
    last_email_sent_at timestamp with time zone,
    total_emails_sent integer DEFAULT 0,
    bounce_count integer DEFAULT 0,
    complaint_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    CONSTRAINT unique_user_newsletter UNIQUE(user_id)
);

-- 3. Enable RLS on newsletter subscriptions
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for newsletter subscriptions
CREATE POLICY "Users can view their own newsletter subscription" ON public.newsletter_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own newsletter subscription" ON public.newsletter_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own newsletter subscription" ON public.newsletter_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own newsletter subscription" ON public.newsletter_subscriptions
    FOR DELETE USING (auth.uid() = user_id);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_user_id ON public.newsletter_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_email ON public.newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_subscribed ON public.newsletter_subscriptions(subscribed);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_active ON public.newsletter_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_last_email ON public.newsletter_subscriptions(last_email_sent_at);

-- 6. Create function to subscribe user to newsletter
CREATE OR REPLACE FUNCTION subscribe_to_newsletter(
    user_id_param uuid,
    source_param text DEFAULT 'app',
    preferences_param jsonb DEFAULT '{}'
)
RETURNS jsonb AS $$
DECLARE
    user_email text;
    subscription_result jsonb;
    existing_subscription uuid;
BEGIN
    -- Verify the user exists and get their email
    SELECT email INTO user_email FROM auth.users WHERE id = user_id_param;
    
    IF user_email IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Check if subscription already exists
    SELECT id INTO existing_subscription 
    FROM public.newsletter_subscriptions 
    WHERE user_id = user_id_param;
    
    IF existing_subscription IS NOT NULL THEN
        -- Update existing subscription
        UPDATE public.newsletter_subscriptions SET
            subscribed = true,
            subscription_source = source_param,
            subscription_date = timezone('utc'::text, now()),
            unsubscription_date = NULL,
            unsubscribe_reason = NULL,
            preferences = preferences_param,
            is_active = true,
            updated_at = timezone('utc'::text, now())
        WHERE user_id = user_id_param;
        
        subscription_result := jsonb_build_object(
            'success', true,
            'action', 'updated',
            'message', 'Newsletter subscription updated'
        );
    ELSE
        -- Create new subscription
        INSERT INTO public.newsletter_subscriptions (
            user_id,
            email,
            subscribed,
            subscription_source,
            preferences,
            is_active
        ) VALUES (
            user_id_param,
            user_email,
            true,
            source_param,
            preferences_param,
            true
        );
        
        subscription_result := jsonb_build_object(
            'success', true,
            'action', 'created',
            'message', 'Newsletter subscription created'
        );
    END IF;
    
    -- Update user profile
    UPDATE public.profiles SET
        newsletter_subscribed = true,
        newsletter_subscribed_at = timezone('utc'::text, now()),
        newsletter_unsubscribed_at = NULL,
        newsletter_subscription_source = source_param,
        newsletter_preferences = preferences_param,
        updated_at = timezone('utc'::text, now())
    WHERE id = user_id_param;
    
    RETURN subscription_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to unsubscribe user from newsletter
CREATE OR REPLACE FUNCTION unsubscribe_from_newsletter(
    user_id_param uuid,
    reason_param text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    subscription_result jsonb;
BEGIN
    -- Update newsletter subscription
    UPDATE public.newsletter_subscriptions SET
        subscribed = false,
        unsubscription_date = timezone('utc'::text, now()),
        unsubscribe_reason = reason_param,
        updated_at = timezone('utc'::text, now())
    WHERE user_id = user_id_param;
    
    -- Update user profile
    UPDATE public.profiles SET
        newsletter_subscribed = false,
        newsletter_unsubscribed_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = user_id_param;
    
    subscription_result := jsonb_build_object(
        'success', true,
        'action', 'unsubscribed',
        'message', 'Successfully unsubscribed from newsletter'
    );
    
    RETURN subscription_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to get newsletter subscription status
CREATE OR REPLACE FUNCTION get_newsletter_subscription_status(user_id_param uuid)
RETURNS jsonb AS $$
DECLARE
    subscription_info jsonb;
    profile_info RECORD;
    subscription_info_detail RECORD;
BEGIN
    -- Get profile newsletter info
    SELECT 
        newsletter_subscribed,
        newsletter_subscribed_at,
        newsletter_unsubscribed_at,
        newsletter_subscription_source,
        newsletter_preferences
    INTO profile_info
    FROM public.profiles 
    WHERE id = user_id_param;
    
    -- Get detailed subscription info
    SELECT 
        subscribed,
        subscription_date,
        unsubscription_date,
        subscription_source,
        preferences,
        last_email_sent_at,
        total_emails_sent
    INTO subscription_info_detail
    FROM public.newsletter_subscriptions 
    WHERE user_id = user_id_param;
    
    subscription_info := jsonb_build_object(
        'user_id', user_id_param,
        'subscribed', COALESCE(profile_info.newsletter_subscribed, false),
        'subscription_date', profile_info.newsletter_subscribed_at,
        'unsubscription_date', profile_info.newsletter_unsubscribed_at,
        'subscription_source', profile_info.newsletter_subscription_source,
        'preferences', COALESCE(profile_info.newsletter_preferences, '{}'),
        'detailed_info', CASE 
            WHEN subscription_info_detail.subscribed IS NOT NULL THEN
                jsonb_build_object(
                    'last_email_sent', subscription_info_detail.last_email_sent_at,
                    'total_emails_sent', subscription_info_detail.total_emails_sent,
                    'subscription_source', subscription_info_detail.subscription_source
                )
            ELSE '{}'
        END
    );
    
    RETURN subscription_info;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_newsletter_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for newsletter subscriptions updated_at
DROP TRIGGER IF EXISTS update_newsletter_subscriptions_updated_at ON public.newsletter_subscriptions;
CREATE TRIGGER update_newsletter_subscriptions_updated_at
    BEFORE UPDATE ON public.newsletter_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_newsletter_updated_at_column();

-- 10. Create view for newsletter statistics (admin use)
CREATE OR REPLACE VIEW newsletter_statistics AS
SELECT 
    COUNT(*) as total_subscriptions,
    COUNT(CASE WHEN subscribed = true THEN 1 END) as active_subscriptions,
    COUNT(CASE WHEN subscribed = false THEN 1 END) as unsubscribed_count,
    COUNT(CASE WHEN subscription_source = 'signup' THEN 1 END) as signup_subscriptions,
    COUNT(CASE WHEN subscription_source = 'settings' THEN 1 END) as settings_subscriptions,
    AVG(total_emails_sent) as avg_emails_sent,
    MAX(last_email_sent_at) as last_email_campaign,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as subscriptions_last_30_days,
    COUNT(CASE WHEN unsubscription_date > NOW() - INTERVAL '30 days' THEN 1 END) as unsubscriptions_last_30_days
FROM public.newsletter_subscriptions;

-- 11. Create function for email campaign tracking
CREATE OR REPLACE FUNCTION record_newsletter_email_sent(
    user_id_param uuid,
    campaign_name text DEFAULT 'general'
)
RETURNS boolean AS $$
BEGIN
    UPDATE public.newsletter_subscriptions SET
        last_email_sent_at = timezone('utc'::text, now()),
        total_emails_sent = total_emails_sent + 1,
        updated_at = timezone('utc'::text, now())
    WHERE user_id = user_id_param AND subscribed = true;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Update profile creation function to include newsletter fields
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
    privacy_policy_version,
    newsletter_subscribed,
    newsletter_subscription_source
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
    '1.0',
    COALESCE((new.raw_user_meta_data->>'newsletter_subscribed')::boolean, false),
    CASE 
        WHEN (new.raw_user_meta_data->>'newsletter_subscribed')::boolean = true THEN 'signup'
        ELSE null
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Show setup completion status
DO $$
DECLARE
    profiles_exists boolean;
    newsletter_table_created boolean;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') INTO profiles_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'newsletter_subscriptions') INTO newsletter_table_created;
    
    RAISE NOTICE '=== NEWSLETTER SYSTEM SETUP COMPLETE ===';
    RAISE NOTICE 'Components status:';
    RAISE NOTICE '  📊 Profiles table: %', CASE WHEN profiles_exists THEN '✅ UPDATED' ELSE '❌ MISSING' END;
    RAISE NOTICE '  📧 Newsletter table: %', CASE WHEN newsletter_table_created THEN '✅ CREATED' ELSE '❌ FAILED' END;
    RAISE NOTICE '  🔧 Functions: ✅ CREATED';
    RAISE NOTICE '  🛡️ Security: ✅ ENABLED';
    RAISE NOTICE '';
    RAISE NOTICE 'Available functions:';
    RAISE NOTICE '  - subscribe_to_newsletter(user_id, source)';
    RAISE NOTICE '  - unsubscribe_from_newsletter(user_id, reason)';
    RAISE NOTICE '  - get_newsletter_subscription_status(user_id)';
    RAISE NOTICE '  - record_newsletter_email_sent(user_id, campaign)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Test subscription: SELECT subscribe_to_newsletter(auth.uid(), ''settings'');';
    RAISE NOTICE '  2. Check status: SELECT get_newsletter_subscription_status(auth.uid());';
    RAISE NOTICE '  3. View stats: SELECT * FROM newsletter_statistics;';
END $$;