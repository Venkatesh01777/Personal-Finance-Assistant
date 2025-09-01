import * as React from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoryService } from '../services/categories';
import { useAppStore } from '../store';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const CategoriesPage: React.FC = () => {
  const { isAuthenticated, isAuthLoading } = useAppStore();
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
    enabled: isAuthenticated && !isAuthLoading,
  });

  const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'both'>('all');

  const filteredCategories = categories?.data?.filter(category => {
    if (filter === 'all') return true;
    return category.type === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600">Organize your transactions with categories</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Category
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === 'all'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Categories
          </button>
          <button
            onClick={() => setFilter('income')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === 'income'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Income
          </button>
          <button
            onClick={() => setFilter('expense')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === 'expense'
                ? 'bg-red-100 text-red-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Expense
          </button>
          <button
            onClick={() => setFilter('both')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === 'both'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Both
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories?.map((category) => (
            <div key={category._id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl"
                    style={{ backgroundColor: category.color }}
                  >
                    {category.icon}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-500">{category.description}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-600">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    category.type === 'income'
                      ? 'bg-green-100 text-green-800'
                      : category.type === 'expense'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {category.type}
                </span>
                <span className="text-sm text-gray-500">
                  {category.transactionCount || 0} transactions
                </span>
              </div>
            </div>
          )) || (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">No categories found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
