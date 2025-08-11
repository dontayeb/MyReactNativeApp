# Analytics Queries for EasyWealthGuide

This document contains SQL queries to view and analyze your app's usage data in Supabase.

## Setup Instructions

1. Run the SQL schema in your Supabase dashboard:
   - Go to SQL Editor in your Supabase project
   - Copy and paste the contents of `SCHEMA_UPDATE_ANALYTICS.sql`
   - Execute the query to create the analytics tables and views

2. The analytics service will automatically start collecting data when users use the app

## Common Analytics Queries

### 1. Daily Active Users by Tier
```sql
SELECT 
    DATE_TRUNC('day', timestamp) as date,
    user_tier,
    COUNT(DISTINCT data->>'userId') as active_users,
    AVG(loan_count) as avg_loans,
    AVG(asset_count) as avg_assets
FROM analytics_events 
WHERE event_type = 'user_activity_summary'
    AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', timestamp), user_tier
ORDER BY date DESC, user_tier;
```

### 2. Most Popular Features
```sql
SELECT 
    data->>'feature' as feature_name,
    COUNT(*) as usage_count,
    DATE_TRUNC('week', timestamp) as week
FROM analytics_events
WHERE event_type = 'feature_usage'
    AND timestamp >= NOW() - INTERVAL '4 weeks'
GROUP BY data->>'feature', DATE_TRUNC('week', timestamp)
ORDER BY week DESC, usage_count DESC;
```

### 3. User Growth Trends
```sql
SELECT 
    DATE_TRUNC('week', timestamp) as week,
    user_tier,
    COUNT(*) as user_count,
    AVG(loan_count + asset_count) as avg_total_items
FROM analytics_events
WHERE event_type = 'user_activity_summary'
    AND timestamp >= NOW() - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', timestamp), user_tier
ORDER BY week DESC, user_tier;
```

### 4. Loan Category Distribution
```sql
SELECT 
    jsonb_object_keys(data->'loanCategories') as loan_type,
    SUM((data->'loanCategories'->>jsonb_object_keys(data->'loanCategories'))::int) as total_loans,
    COUNT(*) as users_with_this_type
FROM analytics_events
WHERE event_type = 'user_activity_summary'
    AND data ? 'loanCategories'
    AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY jsonb_object_keys(data->'loanCategories')
ORDER BY total_loans DESC;
```

### 5. Asset Type Breakdown
```sql
SELECT 
    jsonb_object_keys(data->'assetCategories') as asset_type,
    SUM((data->'assetCategories'->>jsonb_object_keys(data->'assetCategories'))::int) as total_assets,
    COUNT(*) as users_with_this_type
FROM analytics_events
WHERE event_type = 'user_activity_summary'
    AND data ? 'assetCategories'
    AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY jsonb_object_keys(data->'assetCategories')
ORDER BY total_assets DESC;
```

### 6. User Engagement Levels
```sql
SELECT 
    user_tier,
    COUNT(*) as user_count,
    ROUND(AVG(loan_count), 2) as avg_loans,
    ROUND(AVG(asset_count), 2) as avg_assets,
    ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as percentage
FROM analytics_events
WHERE event_type = 'user_activity_summary'
    AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY user_tier
ORDER BY 
    CASE user_tier 
        WHEN 'power' THEN 1 
        WHEN 'active' THEN 2 
        WHEN 'basic' THEN 3 
    END;
```

### 7. Recent Activity Summary
```sql
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as events,
    COUNT(DISTINCT CASE WHEN event_type = 'user_activity_summary' THEN data END) as unique_users,
    COUNT(CASE WHEN event_type = 'feature_usage' THEN 1 END) as feature_uses
FROM analytics_events
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;
```

## Using the Pre-built Views

The schema creates several views for easy access:

### Analytics Summary View
```sql
SELECT * FROM analytics_summary
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, event_count DESC;
```

### User Tier Distribution View  
```sql
SELECT * FROM user_tier_distribution
WHERE week >= CURRENT_DATE - INTERVAL '4 weeks'
ORDER BY week DESC, user_count DESC;
```

### Feature Popularity View
```sql
SELECT * FROM feature_popularity
WHERE week >= CURRENT_DATE - INTERVAL '4 weeks'
ORDER BY week DESC, usage_count DESC;
```

## Setting Up Automated Reports

### Daily Summary Query (for scheduled reports)
```sql
SELECT 
    CURRENT_DATE as report_date,
    COUNT(DISTINCT CASE WHEN event_type = 'user_activity_summary' THEN data END) as daily_active_users,
    COUNT(CASE WHEN event_type = 'feature_usage' THEN 1 END) as total_feature_uses,
    ROUND(AVG(CASE WHEN event_type = 'user_activity_summary' THEN loan_count END), 2) as avg_loans,
    ROUND(AVG(CASE WHEN event_type = 'user_activity_summary' THEN asset_count END), 2) as avg_assets,
    COUNT(CASE WHEN event_type = 'user_activity_summary' AND user_tier = 'power' THEN 1 END) as power_users,
    COUNT(CASE WHEN event_type = 'user_activity_summary' AND user_tier = 'active' THEN 1 END) as active_users,
    COUNT(CASE WHEN event_type = 'user_activity_summary' AND user_tier = 'basic' THEN 1 END) as basic_users
FROM analytics_events
WHERE DATE_TRUNC('day', timestamp) = CURRENT_DATE;
```

## Data Cleanup

### Clean old analytics data (keep 1 year)
```sql
SELECT cleanup_old_analytics();
```

### Manual cleanup (if needed)
```sql
DELETE FROM analytics_events 
WHERE timestamp < NOW() - INTERVAL '1 year';
```

## Access Methods

1. **Supabase Dashboard**: Use the SQL editor to run these queries
2. **Database Connection**: Connect using any PostgreSQL client
3. **API Integration**: Use Supabase client to query from your admin dashboard
4. **Scheduled Reports**: Set up cron jobs or functions to generate regular reports

## Privacy Notes

- All analytics are anonymous (no personal financial data)
- Only aggregate usage patterns are collected
- User IDs are not stored in analytics events
- Financial amounts are never tracked, only counts and categories