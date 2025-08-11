/**
 * Analytics service for collecting anonymous usage data
 * Respects user privacy while gathering insights for app improvement
 */

export interface AnalyticsData {
  loanCount: number;
  assetCount: number;
  mostUsedFeatures: string[];
  userTier: 'basic' | 'active' | 'power';
  loanCategories: Record<string, number>;
  assetCategories: Record<string, number>;
}

export class AnalyticsService {
  private static instance: AnalyticsService;

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Collect anonymous usage data (no sensitive financial amounts)
   */
  async collectUsageData(userId: string, loans: any[], assets: any[]): Promise<void> {
    const analyticsData: AnalyticsData = {
      loanCount: loans.length,
      assetCount: assets.length,
      mostUsedFeatures: await this.getMostUsedFeatures(userId),
      userTier: this.calculateUserTier(loans, assets),
      loanCategories: this.categorizeLoanTypes(loans),
      assetCategories: this.categorizeAssetTypes(assets),
    };

    // Send to analytics endpoint (no sensitive data)
    await this.sendAnalytics(analyticsData);
  }

  /**
   * Categorize loan types for market insights
   */
  private categorizeLoanTypes(loans: any[]): Record<string, number> {
    const categories: Record<string, number> = {};
    
    loans.forEach(loan => {
      const type = loan.loan_type || 'other';
      categories[type] = (categories[type] || 0) + 1;
    });

    return categories;
  }

  /**
   * Categorize asset types for portfolio insights
   */
  private categorizeAssetTypes(assets: any[]): Record<string, number> {
    const categories: Record<string, number> = {};
    
    assets.forEach(asset => {
      const type = asset.type || 'other';
      categories[type] = (categories[type] || 0) + 1;
    });

    return categories;
  }

  /**
   * Calculate user engagement tier
   */
  private calculateUserTier(loans: any[], assets: any[]): 'basic' | 'active' | 'power' {
    const totalItems = loans.length + assets.length;
    
    if (totalItems >= 10) return 'power';
    if (totalItems >= 3) return 'active';
    return 'basic';
  }

  /**
   * Track feature usage (anonymous)
   */
  async trackFeatureUsage(feature: string): Promise<void> {
    try {
      const featureEvent = {
        event_type: 'feature_usage',
        timestamp: new Date().toISOString(),
        data: { feature, count: 1 },
        user_tier: null,
        loan_count: 0,
        asset_count: 0
      };

      const { supabase } = await import('../services/supabase');
      
      const { error } = await supabase
        .from('analytics_events')
        .insert([featureEvent]);

      if (error) {
        console.warn('Feature tracking failed:', error.message);
      }
    } catch (error) {
      console.warn('Feature tracking error:', error);
    }
  }

  private async getMostUsedFeatures(userId: string): Promise<string[]> {
    // Return user's most used features for analysis
    return ['dashboard', 'loans', 'assets'];
  }

  private async sendAnalytics(data: AnalyticsData): Promise<void> {
    try {
      const analyticsEvent = {
        event_type: 'user_activity_summary',
        timestamp: new Date().toISOString(),
        data: data, // Store as JSONB object, not string
        user_tier: data.userTier,
        loan_count: data.loanCount,
        asset_count: data.assetCount
      };

      // Import supabase client at the top level if available
      const { supabase } = await import('../services/supabase');
      
      const { error } = await supabase
        .from('analytics_events')
        .insert([analyticsEvent]);

      if (error) {
        console.warn('Analytics storage failed:', error.message);
      } else {
        console.log('Analytics data stored successfully');
      }
    } catch (error: any) {
      // Gracefully handle cases where supabase config isn't available
      console.warn('Analytics tracking error:', error.message || 'Supabase not configured');
    }
  }
}

export const analyticsService = AnalyticsService.getInstance();