-- Analytics Events Table for EasyWealthGuide
-- This table stores anonymous usage analytics data

CREATE TABLE analytics_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_tier VARCHAR(20) CHECK (user_tier IN ('basic', 'active', 'power')),
    loan_count INTEGER DEFAULT 0,
    asset_count INTEGER DEFAULT 0,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes separately for faster queries
CREATE INDEX idx_analytics_timestamp ON analytics_events (timestamp);
CREATE INDEX idx_analytics_event_type ON analytics_events (event_type);
CREATE INDEX idx_analytics_user_tier ON analytics_events (user_tier);
CREATE INDEX idx_analytics_created_at ON analytics_events (created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Create policy for analytics service access
-- Only allow the service to insert and read its own data
CREATE POLICY analytics_insert_policy ON analytics_events 
    FOR INSERT WITH CHECK (true);

CREATE POLICY analytics_select_policy ON analytics_events 
    FOR SELECT USING (true);

-- Create a view for common analytics queries
CREATE VIEW analytics_summary AS
SELECT 
    DATE_TRUNC('day', timestamp) as date,
    event_type,
    user_tier,
    COUNT(*) as event_count,
    AVG(loan_count) as avg_loans,
    AVG(asset_count) as avg_assets,
    data
FROM analytics_events
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', timestamp), event_type, user_tier, data
ORDER BY date DESC;

-- Create a view for user tier distribution
CREATE VIEW user_tier_distribution AS
SELECT 
    user_tier,
    COUNT(*) as user_count,
    AVG(loan_count) as avg_loans,
    AVG(asset_count) as avg_assets,
    DATE_TRUNC('week', timestamp) as week
FROM analytics_events
WHERE event_type = 'user_activity_summary'
    AND timestamp >= NOW() - INTERVAL '12 weeks'
GROUP BY user_tier, DATE_TRUNC('week', timestamp)
ORDER BY week DESC, user_count DESC;

-- Create a view for feature popularity
CREATE VIEW feature_popularity AS
SELECT 
    jsonb_array_elements_text(data->'mostUsedFeatures') as feature,
    COUNT(*) as usage_count,
    DATE_TRUNC('week', timestamp) as week
FROM analytics_events
WHERE event_type = 'user_activity_summary'
    AND data ? 'mostUsedFeatures'
    AND timestamp >= NOW() - INTERVAL '8 weeks'
GROUP BY feature, DATE_TRUNC('week', timestamp)
ORDER BY week DESC, usage_count DESC;

-- Create a function to clean old analytics data (optional)
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete analytics data older than 1 year
    DELETE FROM analytics_events 
    WHERE timestamp < NOW() - INTERVAL '1 year';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE analytics_events IS 'Stores anonymous usage analytics for app improvement';
COMMENT ON COLUMN analytics_events.event_type IS 'Type of event: user_activity_summary, feature_usage, etc.';
COMMENT ON COLUMN analytics_events.data IS 'JSON data containing anonymous usage metrics';
COMMENT ON COLUMN analytics_events.user_tier IS 'User engagement level: basic, active, or power user';
COMMENT ON VIEW analytics_summary IS 'Daily summary of analytics events for dashboard views';
COMMENT ON VIEW user_tier_distribution IS 'Weekly breakdown of user engagement levels';
COMMENT ON VIEW feature_popularity IS 'Most used features by week for product decisions';