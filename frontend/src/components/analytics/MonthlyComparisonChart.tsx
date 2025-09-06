import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface MonthlyComparisonChartProps {
  data: Array<{
    month: string;
    income: number;
    expenses: number;
    net: number;
    transactionCount: number;
  }>;
  height?: number;
}

export const MonthlyComparisonChart: React.FC<MonthlyComparisonChartProps> = ({ 
  data, 
  height = 400 
}) => {
  const formatCurrency = (value: number) => `$${(value || 0).toLocaleString()}`;
  
  // Safety check for data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">No monthly comparison data available</p>
          <p className="text-sm">Add some transactions to see monthly comparisons</p>
        </div>
      </div>
    );
  }
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}:</span> {formatCurrency(entry.value || 0)}
            </p>
          ))}
          {payload[0]?.payload?.transactionCount && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Transactions: {payload[0].payload.transactionCount || 0}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="month" 
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            tickFormatter={formatCurrency}
            stroke="#6b7280"
            fontSize={12}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey="income" 
            fill="#10b981" 
            name="Income"
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey="expenses" 
            fill="#ef4444" 
            name="Expenses"
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey="net" 
            fill="#3b82f6" 
            name="Net Balance"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
