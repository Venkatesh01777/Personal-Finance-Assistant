import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface CategoryPieChartProps {
  data: Array<{
    _id: string;
    categoryName: string;
    categoryColor: string;
    categoryIcon: string;
    total: number;
    count: number;
    percentage: string;
  }>;
  height?: number;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ 
  data, 
  height = 400 
}) => {
  const formatCurrency = (value: number) => `$${value?.toLocaleString() || '0'}`;
  
  // Safety check for data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">No category data available</p>
          <p className="text-sm">Add some transactions to see category breakdown</p>
        </div>
      </div>
    );
  }
  
  const chartData = data.map(item => ({
    name: item.categoryName || 'Unknown',
    value: item.total || 0,
    color: item.categoryColor || '#8884d8',
    count: item.count || 0,
    percentage: item.percentage || '0',
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white mb-2">{data.name || 'Unknown'}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Amount: <span className="font-medium">{formatCurrency(data.value || 0)}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Percentage: <span className="font-medium">{data.percentage || '0'}%</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Transactions: <span className="font-medium">{data.count || 0}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show labels for slices less than 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry: any) => (
              <span style={{ color: entry.color }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
