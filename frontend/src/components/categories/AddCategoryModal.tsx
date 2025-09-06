import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '../../services/categories';
import { CategoryFormData } from '../../types';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LocalFormData {
  name: string;
  type: 'income' | 'expense';
  description: string;
}

interface FormErrors {
  name?: string;
  type?: string;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState<LocalFormData>({
    name: '',
    type: 'expense',
    description: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const queryClient = useQueryClient();

  const createCategoryMutation = useMutation({
    mutationFn: categoryService.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created successfully!');
      handleClose();
    },
    onError: (error: any) => {
      console.error('Failed to create category:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create category';
      toast.error(errorMessage);
    }
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Category name must be at least 2 characters';
    }

    if (!formData.type) {
      newErrors.type = 'Category type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Create the payload with required fields
    const categoryData: CategoryFormData = {
      name: formData.name.trim(),
      type: formData.type,
      description: formData.description.trim() || undefined,
      color: '#3B82F6', // Default blue color
      icon: 'folder' // Default icon
    };

    createCategoryMutation.mutate(categoryData);
  };

  const handleClose = () => {
    setFormData({
      name: '',
      type: 'expense',
      description: ''
    });
    setErrors({});
    onClose();
  };

  const handleInputChange = (field: keyof LocalFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (field === 'name' && errors.name) {
      setErrors(prev => ({ ...prev, name: undefined }));
    } else if (field === 'type' && errors.type) {
      setErrors(prev => ({ ...prev, type: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add New Category</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={createCategoryMutation.isPending}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${
                errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter category name"
              disabled={createCategoryMutation.isPending}
            />
            {errors.name && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Category Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category Type *
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value as 'income' | 'expense')}
              className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${
                errors.type ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={createCategoryMutation.isPending}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            {errors.type && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.type}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              placeholder="Enter category description"
              rows={3}
              disabled={createCategoryMutation.isPending}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              disabled={createCategoryMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={createCategoryMutation.isPending}
            >
              {createCategoryMutation.isPending ? 'Creating...' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
