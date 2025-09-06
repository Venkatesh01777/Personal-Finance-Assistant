import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics';
import { useAppStore } from '../store';
import SpendingTrendsChart from '../components/charts/SpendingTrendsChart';
import CategoryPieChart from '../components/charts/CategoryPieChart';
import { useState } from 'react';
import {
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ReceiptPercentIcon,
} from '@heroicons/react/24/outline';

const DashboardPage: React.FC = () => {
  const { isAuthenticated, isAuthLoading } = useAppStore();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('year');

  // Fetch dashboard data only when authenticated and not loading
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', selectedPeriod],
    queryFn: () => analyticsService.getDashboardOverview({ 
      period: selectedPeriod === 'year' ? 'all' : selectedPeriod // Use 'all' for year to get all data
    }),
    enabled: isAuthenticated && !isAuthLoading, // Only run when fully authenticated
  });

  const { data: spendingTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ['spending-trends', selectedPeriod],
    queryFn: () => analyticsService.getSpendingTrends({ 
      period: selectedPeriod === 'week' ? 'week' : selectedPeriod === 'month' ? 'month' : 'year',
      groupBy: selectedPeriod === 'week' ? 'day' : selectedPeriod === 'month' ? 'day' : 'month'
    }),
    enabled: isAuthenticated && !isAuthLoading, // Only run when fully authenticated
  });

  // Debug logging (can be removed in production)
  console.log('Dashboard Debug - Stats:', dashboardStats);
  console.log('Dashboard Debug - Trends:', spendingTrends);

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
      </div>
    );
  }

  const stats = dashboardStats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome back! Here's what's happening with your finances.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="period-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Period:
            </label>
            <select
              id="period-select"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as 'week' | 'month' | 'quarter' | 'year')}
              className="block w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Income */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ArrowTrendingUpIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Total Income
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                    ${stats?.summary.income.total?.toLocaleString() || '0'}
                  </div>
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600 dark:text-green-400">
                    +12.5%
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ArrowTrendingDownIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Total Expenses
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                    ${stats?.summary.expenses.total?.toLocaleString() || '0'}
                    {/* Debug: Show raw value */}
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                      (Raw: {stats?.summary.expenses.total})
                    </span>
                  </div>
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-red-600 dark:text-red-400">
                    -3.2%
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Net Balance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BanknotesIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Net Balance
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                    ${stats?.summary.balance?.toLocaleString() || '0'}
                  </div>
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600 dark:text-green-400">
                    +8.1%
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Receipts Processed */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ReceiptPercentIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Receipts Processed
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {stats?.receiptSummary.processed || 0}
                  </div>
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                    {stats?.receiptSummary.pending || 0} pending
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Spending Trends
          </h3>
          {trendsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 dark:border-primary-400"></div>
            </div>
          ) : spendingTrends?.trends ? (
            <SpendingTrendsChart 
              trends={spendingTrends.trends}
              period={spendingTrends.period}
              groupBy={spendingTrends.groupBy}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <p className="text-lg mb-2">No trend data available</p>
                <p className="text-sm">Add some transactions to see spending trends</p>
              </div>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Categories
          </h3>
          
          {/* Show pie chart if we have category data */}
          {stats?.topCategories && stats.topCategories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pie Chart */}
              <div>
                <CategoryPieChart categories={stats.topCategories} />
              </div>
              
              {/* Category List */}
              <div className="space-y-3">
                {stats.topCategories.slice(0, 5).map((category) => (
                  <div key={category._id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: category.categoryColor }}
                      ></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{category.categoryName}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        ${category.total.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {category.count} transactions
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <p className="text-lg mb-2">No category data available</p>
              <p className="text-sm">Add some expense transactions to see category breakdown</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions and Receipt Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Transactions
          </h3>
          <div className="space-y-3">
            {stats?.recentTransactions?.slice(0, 5).map((transaction) => (
              <div key={transaction._id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {transaction.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(transaction.date).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-sm font-medium ${
                  transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'}
                  ${transaction.amount.toLocaleString()}
                </span>
              </div>
            )) || (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                No recent transactions
              </div>
            )}
          </div>
        </div>
        
        {/* Receipt Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Receipt Processing
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Receipts</span>
              <span className="font-medium text-gray-900 dark:text-white">{stats?.receiptSummary.total || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Processed</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {stats?.receiptSummary.processed || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
              <span className="font-medium text-yellow-600 dark:text-yellow-400">
                {stats?.receiptSummary.pending || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Failed</span>
              <span className="font-medium text-red-600 dark:text-red-400">
                {stats?.receiptSummary.failed || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
