import * as React from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  Line
} from 'recharts';

interface TrendData {
  date: string;
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
}

interface SpendingTrendsChartProps {
  trends: TrendData[];
  period: string;
  groupBy: string;
}

const SpendingTrendsChart: React.FC<SpendingTrendsChartProps> = ({
  trends,
  period,
  groupBy
}) => {
  // Format the data for better display
  const formattedData = trends.map((trend: TrendData) => ({
    ...trend,
    date: formatDate(trend.date, groupBy),
    income: Number(trend.income) || 0,
    expenses: Number(trend.expenses) || 0,
    net: Number(trend.net) || 0
  }));

  // Format date based on groupBy period
  function formatDate(dateStr: string, groupBy: string): string {
    if (groupBy === 'day') {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (groupBy === 'week') {
      return dateStr.replace('W', 'Week ');
    } else if (groupBy === 'month') {
      const [year, month] = dateStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    return dateStr;
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {entry.name}: ${entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!trends || trends.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">No trend data available</p>
          <p className="text-sm">Add some transactions to see spending trends</p>
        </div>
      </div>
    );
  }

  console.log('Chart Data:', formattedData);
  console.log('Period:', period);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#666"
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* Income area */}
          <Area
            type="monotone"
            dataKey="income"
            stackId="1"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.6}
            name="Income"
          />
          
          {/* Expenses area */}
          <Area
            type="monotone"
            dataKey="expenses"
            stackId="2"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.6}
            name="Expenses"
          />
          
          {/* Net line */}
          <Line
            type="monotone"
            dataKey="net"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            name="Net"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SpendingTrendsChart;
