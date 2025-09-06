import React from 'react';
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';

interface AnalyticsKPICardsProps {
  data: {
    summary: {
      income: { total: number; count: number; average: number };
      expenses: { total: number; count: number; average: number };
      balance: number;
      totalTransactions: number;
    };
    trends?: {
      incomeChange?: number;
      expenseChange?: number;
      balanceChange?: number;
    };
  };
}

export const AnalyticsKPICards: React.FC<AnalyticsKPICardsProps> = ({ data }) => {
  const formatCurrency = (value: number) => `$${Math.abs(value).toLocaleString()}`;
  const formatPercentage = (value: number) => `${Math.abs(value).toFixed(1)}%`;

  const getTrendIcon = (change: number | undefined) => {
    if (!change) return null;
    return change > 0 ? (
      <ArrowUpIcon className="h-4 w-4 text-green-500" />
    ) : (
      <ArrowDownIcon className="h-4 w-4 text-red-500" />
    );
  };

  const getTrendColor = (change: number | undefined) => {
    if (!change) return 'text-gray-500 dark:text-gray-400';
    return change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const cards = [
    {
      title: 'Total Income',
      value: formatCurrency(data.summary.income.total),
      subtitle: `${data.summary.income.count} transactions`,
      average: `Avg: ${formatCurrency(data.summary.income.average)}`,
      icon: ArrowTrendingUpIcon,
      iconColor: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/10 dark:border dark:border-green-800',
      trend: data.trends?.incomeChange,
    },
    {
      title: 'Total Expenses',
      value: formatCurrency(data.summary.expenses.total),
      subtitle: `${data.summary.expenses.count} transactions`,
      average: `Avg: ${formatCurrency(data.summary.expenses.average)}`,
      icon: ArrowTrendingDownIcon,
      iconColor: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/10 dark:border dark:border-red-800',
      trend: data.trends?.expenseChange,
    },
    {
      title: 'Net Balance',
      value: formatCurrency(data.summary.balance),
      subtitle: `${data.summary.totalTransactions} total transactions`,
      average: data.summary.balance >= 0 ? 'Positive balance' : 'Negative balance',
      icon: CreditCardIcon,
      iconColor: data.summary.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400',
      bgColor: data.summary.balance >= 0 ? 'bg-blue-50 dark:bg-blue-900/10 dark:border dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/10 dark:border dark:border-orange-800',
      trend: data.trends?.balanceChange,
    },
    {
      title: 'Savings Rate',
      value: data.summary.income.total > 0 
        ? `${((data.summary.balance / data.summary.income.total) * 100).toFixed(1)}%`
        : '0%',
      subtitle: 'Of total income',
      average: data.summary.balance > 0 ? 'Above target' : 'Below target',
      icon: CalendarIcon,
      iconColor: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/10 dark:border dark:border-purple-800',
      trend: undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div key={index} className={`${card.bgColor} rounded-lg p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`flex-shrink-0 ${card.iconColor}`}>
                <card.icon className="h-8 w-8" />
              </div>
            </div>
            {card.trend !== undefined && (
              <div className={`flex items-center ${getTrendColor(card.trend)}`}>
                {getTrendIcon(card.trend)}
                <span className="ml-1 text-sm font-medium">
                  {formatPercentage(card.trend)}
                </span>
              </div>
            )}
          </div>
          <div className="mt-4">
            <div className={`text-2xl font-bold ${card.iconColor.replace('text-', 'text-').replace('-600', '-900').replace('dark:text-', 'dark:text-').replace('dark:text-green-400', 'dark:text-green-300').replace('dark:text-red-400', 'dark:text-red-300').replace('dark:text-blue-400', 'dark:text-blue-300').replace('dark:text-orange-400', 'dark:text-orange-300').replace('dark:text-purple-400', 'dark:text-purple-300')}`}>
              {card.value}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {card.subtitle}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {card.average}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
