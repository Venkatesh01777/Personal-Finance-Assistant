import * as React from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics';
import { useAppStore } from '../store';
import { SpendingTrendsChart } from '../components/analytics/SpendingTrendsChart';
import { CategoryPieChart } from '../components/analytics/CategoryPieChart';
import { MonthlyComparisonChart } from '../components/analytics/MonthlyComparisonChart';
import { BalanceOverTimeChart } from '../components/analytics/BalanceOverTimeChart';
import { AnalyticsKPICards } from '../components/analytics/AnalyticsKPICards';
import {
  ChartBarIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

const AnalyticsPage: React.FC = () => {
  const { isAuthenticated, isAuthLoading } = useAppStore();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'categories' | 'insights'>('overview');

  const { data: dashboardStats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboard-overview', period],
    queryFn: () => analyticsService.getDashboardOverview({ period }),
    enabled: isAuthenticated && !isAuthLoading,
  });

  const { data: spendingTrends, isLoading: trendsLoading, error: trendsError } = useQuery({
    queryKey: ['spending-trends', period],
    queryFn: () => analyticsService.getSpendingTrends({ period, groupBy: 'day' }),
    enabled: isAuthenticated && !isAuthLoading,
  });

  const { data: categoryBreakdown, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ['category-breakdown', period],
    queryFn: () => analyticsService.getCategoryBreakdown({ period, type: 'expense' }),
    enabled: isAuthenticated && !isAuthLoading,
  });

  const { data: incomeBreakdown, isLoading: incomeLoading } = useQuery({
    queryKey: ['income-breakdown', period],
    queryFn: () => analyticsService.getCategoryBreakdown({ period, type: 'income' }),
    enabled: isAuthenticated && !isAuthLoading,
  });

  const { data: monthlyComparison } = useQuery({
    queryKey: ['monthly-comparison', period],
    queryFn: () => analyticsService.getMonthlyComparison({ months: period === 'year' ? 12 : 6 }),
    enabled: isAuthenticated && !isAuthLoading,
  });

  // Debug logging (only when no data is found)
  React.useEffect(() => {
    if (!statsLoading && !trendsLoading && !categoriesLoading) {
      if (!dashboardStats?.summary?.totalTransactions && !spendingTrends?.trends?.length && !categoryBreakdown?.breakdown?.length) {
        console.log('Analytics Debug - No Data Found:', {
          isAuthenticated,
          isAuthLoading,
          period,
          dashboardStats,
          spendingTrends,
          categoryBreakdown,
          statsError,
          trendsError,
          categoriesError
        });
      }
    }
  }, [isAuthenticated, isAuthLoading, period, dashboardStats, spendingTrends, categoryBreakdown, statsLoading, trendsLoading, categoriesLoading, statsError, trendsError, categoriesError]);

  // Create balance over time data from spending trends
  const balanceData = React.useMemo(() => {
    if (!spendingTrends?.trends) return [];
    
    let runningBalance = 0;
    return spendingTrends.trends.map(trend => {
      runningBalance += trend.net;
      return {
        date: trend.date,
        balance: runningBalance,
        income: trend.income,
        expenses: trend.expenses,
      };
    });
  }, [spendingTrends]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Analyze your financial patterns and trends</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('trends')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'trends'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Trends
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'categories'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Categories
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'insights'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Insights
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {statsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
                </div>
              ) : (
                <>
                  {/* Enhanced KPI Cards */}
                  {dashboardStats && (
                    <AnalyticsKPICards data={dashboardStats} />
                  )}

                  {/* Balance Over Time Chart */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Balance Over Time</h3>
                    {balanceData.length > 0 ? (
                      <BalanceOverTimeChart data={balanceData} />
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                        <div className="text-center">
                          <ChartBarIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                          <p>No balance data available</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Top Categories */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Top Expense Categories</h3>
                      <div className="space-y-3">
                        {dashboardStats?.topCategories?.slice(0, 5).map((category) => (
                          <div key={category._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center">
                              <div
                                className="w-4 h-4 rounded-full mr-3"
                                style={{ backgroundColor: category.categoryColor }}
                              ></div>
                              <span className="font-medium text-gray-900 dark:text-white">{category.categoryName}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-gray-900 dark:text-white">${category.total.toLocaleString()}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{category.count} transactions</div>
                            </div>
                          </div>
                        )) || (
                          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                            No category data available
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recent Activity Summary */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Activity Summary</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">Average Transaction</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            ${(((dashboardStats?.summary.income.total || 0) + (dashboardStats?.summary.expenses.total || 0)) / Math.max(dashboardStats?.summary.totalTransactions || 1, 1)).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">Largest Expense</span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            ${dashboardStats?.topCategories && dashboardStats.topCategories.length > 0 ? Math.max(...dashboardStats.topCategories.map(c => c.total || 0)).toLocaleString() : '0'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">Transaction Frequency</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {dashboardStats?.summary.totalTransactions || 0} this {period}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">Categories Used</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {dashboardStats?.topCategories?.length || 0} categories
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'trends' && (
            <div className="space-y-6">
              {trendsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
                </div>
              ) : (
                <>
                  {/* Spending Trends Chart */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Spending Trends</h3>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {spendingTrends?.trends.length || 0} data points
                      </div>
                    </div>
                    {spendingTrends?.trends && spendingTrends.trends.length > 0 ? (
                      <SpendingTrendsChart data={spendingTrends.trends} height={400} />
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                        <div className="text-center">
                          <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                          <p>No trends data available</p>
                          <p className="text-sm mt-2">Add some transactions to see trends</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Monthly Comparison Chart */}
                  {monthlyComparison?.data && monthlyComparison.data.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Monthly Comparison</h3>
                      <MonthlyComparisonChart data={monthlyComparison.data} height={350} />
                    </div>
                  )}

                  {/* Trend Analysis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Trend Analysis</h3>
                      <div className="space-y-3">
                        {spendingTrends?.trends && spendingTrends.trends.length > 1 && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400">Income Trend</span>
                              <span className={`font-medium ${
                                spendingTrends.trends[spendingTrends.trends.length - 1].income > 
                                spendingTrends.trends[0].income ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                                {spendingTrends.trends[spendingTrends.trends.length - 1].income > 
                                 spendingTrends.trends[0].income ? '↗ Increasing' : '↘ Decreasing'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400">Expense Trend</span>
                              <span className={`font-medium ${
                                spendingTrends.trends[spendingTrends.trends.length - 1].expenses < 
                                spendingTrends.trends[0].expenses ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                                {spendingTrends.trends[spendingTrends.trends.length - 1].expenses < 
                                 spendingTrends.trends[0].expenses ? '↘ Decreasing' : '↗ Increasing'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400">Net Balance Trend</span>
                              <span className={`font-medium ${
                                spendingTrends.trends[spendingTrends.trends.length - 1].net > 
                                spendingTrends.trends[0].net ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                                {spendingTrends.trends[spendingTrends.trends.length - 1].net > 
                                 spendingTrends.trends[0].net ? '↗ Improving' : '↘ Declining'}
                              </span>
                            </div>
                          </>
                        )}
                        {(!spendingTrends?.trends || spendingTrends.trends.length <= 1) && (
                          <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                            Not enough data for trend analysis
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Stats</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">Best Day</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {spendingTrends?.trends && spendingTrends.trends.length > 0 ? 
                              new Date(spendingTrends.trends.reduce((best, current) => 
                                current.net > best.net ? current : best
                              ).date).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">Worst Day</span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            {spendingTrends?.trends && spendingTrends.trends.length > 0 ? 
                              new Date(spendingTrends.trends.reduce((worst, current) => 
                                current.net < worst.net ? current : worst
                              ).date).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">Avg Daily Spending</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            ${spendingTrends?.trends && spendingTrends.trends.length > 0 ? 
                              (spendingTrends.trends.reduce((sum, day) => sum + day.expenses, 0) / spendingTrends.trends.length).toFixed(2) : '0.00'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">Most Active Day</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {spendingTrends?.trends && spendingTrends.trends.length > 0 ? 
                              new Date(spendingTrends.trends.reduce((most, current) => 
                                (current.transactionCount || 0) > (most.transactionCount || 0) ? current : most
                              ).date).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-6">
              {categoriesLoading || incomeLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
                </div>
              ) : (
                <>
                  {/* Category Breakdown Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Expense Categories */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Expense Categories
                      </h3>
                      {categoryBreakdown?.breakdown && categoryBreakdown.breakdown.length > 0 ? (
                        <CategoryPieChart data={categoryBreakdown.breakdown} height={350} />
                      ) : (
                        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                          <div className="text-center">
                            <ChartBarIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                            <p>No expense data available</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Income Categories */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Income Categories
                      </h3>
                      {incomeBreakdown?.breakdown && incomeBreakdown.breakdown.length > 0 ? (
                        <CategoryPieChart data={incomeBreakdown.breakdown} height={350} />
                      ) : (
                        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                          <div className="text-center">
                            <ChartBarIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                            <p>No income data available</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Detailed Category Tables */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Expense Details */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Expense Details
                      </h3>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {categoryBreakdown?.breakdown?.map((category) => (
                          <div key={category._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center">
                              <div
                                className="w-4 h-4 rounded-full mr-3"
                                style={{ backgroundColor: category.categoryColor }}
                              ></div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">{category.categoryName}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{category.count} transactions</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-gray-900 dark:text-white">${category.total.toLocaleString()}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{category.percentage}%</div>
                            </div>
                          </div>
                        )) || (
                          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                            No expense categories available
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Income Details */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Income Details
                      </h3>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {incomeBreakdown?.breakdown?.map((category) => (
                          <div key={category._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center">
                              <div
                                className="w-4 h-4 rounded-full mr-3"
                                style={{ backgroundColor: category.categoryColor }}
                              ></div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">{category.categoryName}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{category.count} transactions</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-gray-900 dark:text-white">${category.total.toLocaleString()}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{category.percentage}%</div>
                            </div>
                          </div>
                        )) || (
                          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                            No income categories available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Category Insights */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Category Insights</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {(categoryBreakdown?.breakdown?.length || 0) + (incomeBreakdown?.breakdown?.length || 0)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Total Categories Used</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          ${(categoryBreakdown?.breakdown && categoryBreakdown.breakdown.length > 0 ? 
                            categoryBreakdown.breakdown.reduce((max, cat) => 
                              cat.total > max ? cat.total : max, 0) : 0)?.toLocaleString() || '0'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Highest Expense Category</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          ${(incomeBreakdown?.breakdown && incomeBreakdown.breakdown.length > 0 ? 
                            incomeBreakdown.breakdown.reduce((max, cat) => 
                              cat.total > max ? cat.total : max, 0) : 0)?.toLocaleString() || '0'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Highest Income Category</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Financial Health Score */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Financial Health Score</h3>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                      {dashboardStats ? Math.round(
                        (dashboardStats.summary.balance / Math.max(dashboardStats.summary.income.total, 1)) * 100
                      ) : 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">Based on savings rate</div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div 
                        className="bg-blue-600 dark:bg-blue-400 h-3 rounded-full" 
                        style={{ 
                          width: `${Math.min(100, Math.max(0, dashboardStats ? 
                            (dashboardStats.summary.balance / Math.max(dashboardStats.summary.income.total, 1)) * 100 : 0
                          ))}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Spending Patterns */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Spending Patterns</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Most Expensive Category</span>
                      <span className="font-medium text-red-600 dark:text-red-400">
                        {categoryBreakdown?.breakdown?.[0]?.categoryName || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Average Transaction Size</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        ${dashboardStats?.summary.totalTransactions ? 
                          ((dashboardStats.summary.income.total + dashboardStats.summary.expenses.total) / 
                           dashboardStats.summary.totalTransactions).toFixed(2) : '0'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Expense vs Income Ratio</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {dashboardStats?.summary.income.total ? 
                          (dashboardStats.summary.expenses.total / dashboardStats.summary.income.total * 100).toFixed(0) : '0'}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Transaction Frequency</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {dashboardStats?.summary.totalTransactions || 0} per {period}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Financial Recommendations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">💡 Insights</h4>
                    {dashboardStats && (
                      <>
                        {dashboardStats.summary.balance < 0 && (
                          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-800 dark:text-red-300">
                              Your expenses exceed income. Consider reviewing your spending in top categories.
                            </p>
                          </div>
                        )}
                        {dashboardStats.summary.balance > dashboardStats.summary.income.total * 0.2 && (
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <p className="text-sm text-green-800 dark:text-green-300">
                              Great job! You're saving over 20% of your income.
                            </p>
                          </div>
                        )}
                        {categoryBreakdown?.breakdown && categoryBreakdown.breakdown[0] && 
                         parseFloat(categoryBreakdown.breakdown[0].percentage) > 30 && (
                          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <p className="text-sm text-yellow-800 dark:text-yellow-300">
                              {categoryBreakdown.breakdown[0].categoryName} accounts for {categoryBreakdown.breakdown[0].percentage}% 
                              of your expenses. Consider if this is appropriate.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">🎯 Action Items</h4>
                    <div className="space-y-2">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          Set up automatic savings transfers to build an emergency fund
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          Review and categorize any miscellaneous expenses
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          Track your progress by setting monthly budget goals
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Period Comparison */}
              {monthlyComparison?.data && monthlyComparison.data.length > 1 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Period Comparison</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {monthlyComparison.data.length > 1 ? (
                          ((monthlyComparison.data[monthlyComparison.data.length - 1].income - 
                            monthlyComparison.data[monthlyComparison.data.length - 2].income) / 
                           Math.max(monthlyComparison.data[monthlyComparison.data.length - 2].income, 1) * 100).toFixed(1)
                        ) : '0'}%
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Income Change</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {monthlyComparison.data.length > 1 ? (
                          ((monthlyComparison.data[monthlyComparison.data.length - 1].expenses - 
                            monthlyComparison.data[monthlyComparison.data.length - 2].expenses) / 
                           Math.max(monthlyComparison.data[monthlyComparison.data.length - 2].expenses, 1) * 100).toFixed(1)
                        ) : '0'}%
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Expense Change</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {monthlyComparison.data.length > 1 ? (
                          ((monthlyComparison.data[monthlyComparison.data.length - 1].net - 
                            monthlyComparison.data[monthlyComparison.data.length - 2].net) / 
                           Math.max(Math.abs(monthlyComparison.data[monthlyComparison.data.length - 2].net), 1) * 100).toFixed(1)
                        ) : '0'}%
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Net Balance Change</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
