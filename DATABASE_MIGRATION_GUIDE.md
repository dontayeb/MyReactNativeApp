# Database Migration Strategy for EasyWealthGuide

## Overview

When you launch new features that require database changes, you need a migration strategy that updates the schema without breaking existing user data or causing downtime.

## Migration Process Flow

```
Development → Testing → Staging → Production
     ↓           ↓         ↓          ↓
  Schema     Schema    Schema    Schema
  Changes    Testing   Validation Migration
```

## 1. Development Phase

### Create Migration Files
Create numbered migration files for each change:

```
migrations/
├── 001_initial_schema.sql
├── 002_add_analytics_table.sql
├── 003_add_budgets_feature.sql
├── 004_add_notifications_settings.sql
└── 005_add_categories_table.sql
```

### Example Migration File Structure
```sql
-- Migration: 005_add_categories_table.sql
-- Description: Add custom categories for loans and assets
-- Date: 2024-08-10

-- Forward migration (UP)
CREATE TABLE IF NOT EXISTS user_categories (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category_name VARCHAR(100) NOT NULL,
    category_type VARCHAR(20) CHECK (category_type IN ('loan', 'asset')),
    color_hex VARCHAR(7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, category_name, category_type)
);

-- Add indexes
CREATE INDEX idx_user_categories_user_id ON user_categories (user_id);
CREATE INDEX idx_user_categories_type ON user_categories (category_type);

-- Add new column to existing tables (safely)
ALTER TABLE loans ADD COLUMN IF NOT EXISTS custom_category_id BIGINT REFERENCES user_categories(id);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS custom_category_id BIGINT REFERENCES user_categories(id);

-- Rollback migration (DOWN) - commented out for safety
/*
DROP INDEX IF EXISTS idx_user_categories_user_id;
DROP INDEX IF EXISTS idx_user_categories_type;
ALTER TABLE loans DROP COLUMN IF EXISTS custom_category_id;
ALTER TABLE assets DROP COLUMN IF EXISTS custom_category_id;
DROP TABLE IF EXISTS user_categories;
*/
```

## 2. Supabase Migration Methods

### Method A: Manual SQL Execution
1. **Development**: Test schema changes locally
2. **Staging**: Apply to staging database first
3. **Production**: Execute in Supabase dashboard during low-traffic hours

### Method B: Supabase CLI (Recommended)
```bash
# Initialize migrations
supabase migration new add_categories_feature

# Generate migration from schema diff
supabase db diff -f add_categories_feature

# Apply migrations
supabase db push

# Reset database (development only)
supabase db reset
```

### Method C: Database Functions for Complex Migrations
```sql
-- Create a migration function for complex data transformations
CREATE OR REPLACE FUNCTION migrate_to_v5()
RETURNS void AS $$
BEGIN
    -- Check if migration already applied
    IF EXISTS (SELECT 1 FROM migrations WHERE version = 5) THEN
        RAISE NOTICE 'Migration v5 already applied';
        RETURN;
    END IF;
    
    -- Perform migration
    -- ... migration logic here ...
    
    -- Record migration
    INSERT INTO migrations (version, applied_at) VALUES (5, NOW());
    
    RAISE NOTICE 'Migration v5 applied successfully';
END;
$$ LANGUAGE plpgsql;

-- Execute migration
SELECT migrate_to_v5();
```

## 3. App Version Compatibility

### Version Management Strategy
```typescript
// src/config/appVersion.ts
export const APP_VERSION = '1.2.0';
export const MIN_SCHEMA_VERSION = 5;
export const CURRENT_SCHEMA_VERSION = 7;

// Check schema compatibility on app start
export async function checkSchemaCompatibility() {
  const { data } = await supabase
    .from('app_metadata')
    .select('schema_version')
    .single();
    
  const dbSchemaVersion = data?.schema_version || 1;
  
  if (dbSchemaVersion < MIN_SCHEMA_VERSION) {
    // Force app update
    throw new Error('APP_UPDATE_REQUIRED');
  }
  
  if (dbSchemaVersion > CURRENT_SCHEMA_VERSION) {
    // App is too old
    throw new Error('DATABASE_TOO_NEW');
  }
}
```

### Schema Metadata Table
```sql
CREATE TABLE app_metadata (
    id SERIAL PRIMARY KEY,
    schema_version INTEGER NOT NULL,
    app_version VARCHAR(20),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert current schema version
INSERT INTO app_metadata (schema_version, app_version) 
VALUES (1, '1.0.0');
```

## 4. Deployment Strategy

### Blue-Green Database Deployment (Advanced)
For zero-downtime deployments:

```
Production DB (Blue) → New DB (Green)
        ↓                    ↓
   Old App Version    →  New App Version
```

### Rolling Migration (Recommended for most cases)
1. **Deploy backward-compatible schema changes**
2. **Update app to use new schema**  
3. **Remove deprecated columns/tables in next release**

Example:
```sql
-- Step 1: Add new column (backward compatible)
ALTER TABLE loans ADD COLUMN payment_frequency VARCHAR(20);

-- Step 2: Update app to use new column
-- (Both old and new apps work)

-- Step 3: Later migration - remove old column
-- ALTER TABLE loans DROP COLUMN old_payment_schedule;
```

## 5. Migration Execution Process

### Pre-Migration Checklist
- [ ] Test migration on development database
- [ ] Test migration on staging database  
- [ ] Backup production database
- [ ] Schedule during low-traffic hours
- [ ] Prepare rollback plan
- [ ] Monitor error logs

### Migration Execution
```sql
-- 1. Start transaction
BEGIN;

-- 2. Create backup point
SELECT pg_create_restore_point('before_migration_v5');

-- 3. Apply migration
\i migrations/005_add_categories_table.sql

-- 4. Verify migration
SELECT COUNT(*) FROM user_categories; -- Should be 0
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'loans' AND column_name = 'custom_category_id';

-- 5. Commit if successful
COMMIT;
-- or ROLLBACK; if issues found
```

### Post-Migration Verification
```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- Check data integrity
SELECT COUNT(*) FROM loans WHERE custom_category_id IS NOT NULL;
SELECT COUNT(*) FROM user_categories;

-- Update schema version
UPDATE app_metadata SET 
    schema_version = 5, 
    app_version = '1.2.0',
    updated_at = NOW();
```

## 6. App Update Handling

### Force Update Strategy
```typescript
// src/services/appUpdateService.ts
export class AppUpdateService {
  static async checkForUpdates() {
    try {
      const { data } = await supabase
        .from('app_metadata')
        .select('schema_version, min_app_version')
        .single();
        
      const currentAppVersion = APP_VERSION;
      const requiredVersion = data.min_app_version;
      
      if (this.isVersionLower(currentAppVersion, requiredVersion)) {
        // Show force update modal
        Alert.alert(
          'Update Required',
          'A new version is available with important improvements.',
          [
            { text: 'Update Now', onPress: () => this.openAppStore() }
          ],
          { cancelable: false }
        );
      }
    } catch (error) {
      console.warn('Update check failed:', error);
    }
  }
}
```

### Graceful Degradation
```typescript
// Handle missing database features gracefully
export async function getLoansWithCategories(userId: string) {
  // Try new schema first
  try {
    const { data } = await supabase
      .from('loans')
      .select(`
        *,
        custom_category_id,
        user_categories(category_name, color_hex)
      `)
      .eq('user_id', userId);
      
    return data;
  } catch (error) {
    // Fallback to old schema
    console.warn('New schema not available, using fallback');
    const { data } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', userId);
      
    return data;
  }
}
```

## 7. Best Practices

### Schema Changes
✅ **DO:**
- Add new columns with DEFAULT values
- Use `IF NOT EXISTS` for tables/indexes
- Make changes backward compatible
- Test migrations thoroughly

❌ **DON'T:**
- Rename columns (add new, migrate data, remove old)
- Remove columns immediately (deprecate first)
- Change data types without migration
- Skip testing migrations

### Data Migrations
```sql
-- Safe data migration example
-- Step 1: Add new column
ALTER TABLE loans ADD COLUMN status VARCHAR(20) DEFAULT 'active';

-- Step 2: Migrate existing data
UPDATE loans SET status = 
  CASE 
    WHEN current_balance > 0 THEN 'active'
    WHEN current_balance = 0 THEN 'paid_off'
    ELSE 'inactive'
  END;

-- Step 3: Add constraints (later migration)
-- ALTER TABLE loans ALTER COLUMN status SET NOT NULL;
```

## 8. Rollback Strategy

### Emergency Rollback
```sql
-- Restore from backup
SELECT pg_restore_point('before_migration_v5');

-- or Manual rollback
DROP TABLE IF EXISTS user_categories;
ALTER TABLE loans DROP COLUMN IF EXISTS custom_category_id;
ALTER TABLE assets DROP COLUMN IF EXISTS custom_category_id;

-- Revert schema version
UPDATE app_metadata SET schema_version = 4;
```

### App Store Rollback
- Keep previous app version available
- Monitor crash reports after deployment
- Prepare hotfix releases for critical issues

This migration strategy ensures smooth updates without data loss or user disruption.