import * as React from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics';
import { useAppStore } from '../store';
import {
  ChartBarIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

const AnalyticsPage: React.FC = () => {
  const { isAuthenticated, isAuthLoading } = useAppStore();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'categories'>('overview');

  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-overview', period],
    queryFn: () => analyticsService.getDashboardOverview({ period }),
    enabled: isAuthenticated && !isAuthLoading,
  });

  const { data: spendingTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ['spending-trends', period],
    queryFn: () => analyticsService.getSpendingTrends({ period, groupBy: 'day' }),
    enabled: isAuthenticated && !isAuthLoading,
  });

  const { data: categoryBreakdown, isLoading: categoriesLoading } = useQuery({
    queryKey: ['category-breakdown', period],
    queryFn: () => analyticsService.getCategoryBreakdown({ period, type: 'expense' }),
    enabled: isAuthenticated && !isAuthLoading,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Analyze your financial patterns and trends</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('trends')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'trends'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Trends
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'categories'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Categories
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {statsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-green-50 rounded-lg p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <ChartBarIcon className="h-8 w-8 text-green-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-green-900 truncate">
                              Total Income
                            </dt>
                            <dd className="text-lg font-medium text-green-900">
                              ${dashboardStats?.summary.income.total?.toLocaleString() || '0'}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 rounded-lg p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <ChartBarIcon className="h-8 w-8 text-red-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-red-900 truncate">
                              Total Expenses
                            </dt>
                            <dd className="text-lg font-medium text-red-900">
                              ${dashboardStats?.summary.expenses.total?.toLocaleString() || '0'}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <ChartBarIcon className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-blue-900 truncate">
                              Net Balance
                            </dt>
                            <dd className="text-lg font-medium text-blue-900">
                              ${dashboardStats?.summary.balance?.toLocaleString() || '0'}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Categories */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Top Categories</h3>
                    <div className="space-y-3">
                      {dashboardStats?.topCategories?.slice(0, 5).map((category) => (
                        <div key={category._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <div
                              className="w-4 h-4 rounded-full mr-3"
                              style={{ backgroundColor: category.categoryColor }}
                            ></div>
                            <span className="font-medium text-gray-900">{category.categoryName}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900">${category.total.toLocaleString()}</div>
                            <div className="text-sm text-gray-500">{category.count} transactions</div>
                          </div>
                        </div>
                      )) || (
                        <div className="text-center text-gray-500 py-8">
                          No category data available
                        </div>
                      )}
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p>Trends chart will be implemented with Recharts</p>
                    <p className="text-sm mt-2">
                      {spendingTrends?.trends.length || 0} data points available
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-6">
              {categoriesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Category Breakdown - Expenses
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      {categoryBreakdown?.breakdown?.map((category) => (
                        <div key={category._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <div
                              className="w-4 h-4 rounded-full mr-3"
                              style={{ backgroundColor: category.categoryColor }}
                            ></div>
                            <div>
                              <div className="font-medium text-gray-900">{category.categoryName}</div>
                              <div className="text-sm text-gray-500">{category.count} transactions</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900">${category.total.toLocaleString()}</div>
                            <div className="text-sm text-gray-500">{category.percentage}%</div>
                          </div>
                        </div>
                      )) || (
                        <div className="text-center text-gray-500 py-8">
                          No category breakdown available
                        </div>
                      )}
                    </div>
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <ChartBarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p>Pie chart will be implemented with Recharts</p>
                      </div>
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
