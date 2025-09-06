import * as React from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoryService } from '../services/categories';
import { useAppStore } from '../store';
import { AddCategoryModal } from '../components/categories/AddCategoryModal';
import { EditCategoryModal } from '../components/categories/EditCategoryModal';
import { DeleteCategoryModal } from '../components/categories/DeleteCategoryModal';
import { Category } from '../types';
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

  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const filteredCategories = categories?.data?.filter(category => {
    if (filter === 'all') return true;
    return category.type === filter;
  });

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setShowEditModal(true);
  };

  const handleDeleteCategory = (category: Category) => {
    setSelectedCategory(category);
    setShowDeleteModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedCategory(null);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedCategory(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categories</h1>
          <p className="text-gray-600 dark:text-gray-400">Organize your transactions with categories</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 dark:bg-primary-700 hover:bg-primary-700 dark:hover:bg-primary-800"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Category
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === 'all'
                ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            All Categories
          </button>
          <button
            onClick={() => setFilter('income')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === 'income'
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Income
          </button>
          <button
            onClick={() => setFilter('expense')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === 'expense'
                ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Expense
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories?.map((category) => (
            <div key={category._id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl"
                    style={{ backgroundColor: category.color }}
                  >
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {category.name}
                      </h3>
                      {category.isDefault && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{category.description}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleEditCategory(category)}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Edit category"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteCategory(category)}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                    title="Delete category"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    category.type === 'income'
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      : category.type === 'expense'
                      ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                  }`}
                >
                  {category.type}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {category.transactionCount || 0} transactions
                </span>
              </div>
            </div>
          )) || (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No categories found</p>
            </div>
          )}
        </div>
      )}

      {/* Add Category Modal */}
      <AddCategoryModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
      />

      {/* Edit Category Modal */}
      <EditCategoryModal 
        isOpen={showEditModal} 
        onClose={handleCloseEditModal}
        category={selectedCategory}
      />

      {/* Delete Category Modal */}
      <DeleteCategoryModal 
        isOpen={showDeleteModal} 
        onClose={handleCloseDeleteModal}
        category={selectedCategory}
      />
    </div>
  );
};

export default CategoriesPage;
