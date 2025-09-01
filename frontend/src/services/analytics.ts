import { apiClient } from './api';
import { 
  DashboardStats, 
  SpendingTrends, 
  CategoryBreakdown, 
  MonthlyComparison 
} from '@/types';

export const analyticsService = {
  // Dashboard overview
  async getDashboardOverview(filters?: {
    period?: 'week' | 'month' | 'quarter' | 'year' | 'all';
  }): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>('/analytics/dashboard', filters);
    console.log('Analytics API Response:', response);
    return response.data; // response is ApiResponse<DashboardStats>, so response.data is DashboardStats
  },

  // Spending trends
  async getSpendingTrends(filters?: {
    period?: 'week' | 'month' | 'quarter' | 'year' | 'last6months' | 'last12months';
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<SpendingTrends> {
    const response = await apiClient.get<SpendingTrends>('/analytics/trends', filters);
    console.log('Trends API Response:', response);
    return response.data; // response is ApiResponse<SpendingTrends>, so response.data is SpendingTrends
  },

  // Category breakdown
  async getCategoryBreakdown(filters?: {
    type?: 'income' | 'expense';
    period?: 'week' | 'month' | 'quarter' | 'year';
  }): Promise<CategoryBreakdown> {
    const response = await apiClient.get<CategoryBreakdown>('/analytics/categories', filters);
    console.log('Category API Response:', response);
    return response.data; // response is ApiResponse<CategoryBreakdown>, so response.data is CategoryBreakdown
  },

  // Monthly comparison (specific month or multiple months)
  async getMonthlyComparison(filters?: {
    year?: number;
    month?: number;
    months?: number;
  }): Promise<MonthlyComparison> {
    const response = await apiClient.get<MonthlyComparison>('/analytics/monthly', filters);
    return response.data;
  },

  // Budget analysis
  async getBudgetAnalysis(filters?: {
    period?: 'week' | 'month' | 'quarter' | 'year';
  }): Promise<any> {
    const response = await apiClient.get('/analytics/budget', filters);
    return response.data;
  },

  // Export analytics data
  async exportAnalytics(filters?: {
    reportType?: 'summary' | 'trends' | 'categories';
    format?: 'json' | 'csv';
    period?: 'week' | 'month' | 'quarter' | 'year';
  }): Promise<any> {
    const response = await apiClient.get('/analytics/export', filters);
    return response.data;
  },

  // Get analytics for date range
  async getAnalyticsForDateRange(startDate: string, endDate: string): Promise<{
    summary: {
      totalIncome: number;
      totalExpenses: number;
      netIncome: number;
      transactionCount: number;
    };
    trends: any[];
    categoryBreakdown: any[];
  }> {
    // Note: Backend doesn't support date range filters for analytics yet
    // Using period-based filters instead
    console.log('Date range requested:', startDate, endDate);
    
    const [summary, trends, categories] = await Promise.all([
      this.getDashboardOverview(),
      this.getSpendingTrends(),
      this.getCategoryBreakdown(),
    ]);

    return {
      summary: {
        totalIncome: summary.summary.income.total,
        totalExpenses: summary.summary.expenses.total,
        netIncome: summary.summary.balance,
        transactionCount: summary.summary.totalTransactions,
      },
      trends: trends.trends,
      categoryBreakdown: categories.breakdown,
    };
  },

  // Get financial health score
  async getFinancialHealthScore(): Promise<{
    score: number;
    factors: {
      savingsRate: number;
      expenseVariability: number;
      budgetAdherence: number;
      categoryDiversification: number;
    };
    recommendations: string[];
  }> {
    // This would be calculated on frontend based on analytics data
    const dashboard = await this.getDashboardOverview();
    const trends = await this.getSpendingTrends();
    
    // Simple scoring algorithm using trends data
    const savingsRate = dashboard.summary.balance / dashboard.summary.income.total;
    const expenseVariability = trends.trends.length > 0 ? 20 : 0;
    const score = Math.min(100, Math.max(0, (savingsRate * 100 + expenseVariability) / 2));
    
    return {
      score,
      factors: {
        savingsRate: savingsRate * 100,
        expenseVariability,
        budgetAdherence: 80, // Calculate from budget analysis
        categoryDiversification: 70, // Calculate from category data
      },
      recommendations: [
        'Consider increasing your emergency fund',
        'Review recurring subscriptions',
        'Set up automatic savings',
      ],
    };
  },
};
