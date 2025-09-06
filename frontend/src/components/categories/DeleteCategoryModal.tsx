import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { categoryService } from '../../services/categories';
import { Category } from '../../types';
import { toast } from 'react-hot-toast';
import { X, AlertTriangle } from 'lucide-react';

interface DeleteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
}

export const DeleteCategoryModal: React.FC<DeleteCategoryModalProps> = ({ isOpen, onClose, category }) => {
  const [deleteAction, setDeleteAction] = useState<'delete' | 'reassign'>('delete');
  const [newCategoryId, setNewCategoryId] = useState('');

  const queryClient = useQueryClient();

  // Fetch other categories for reassignment option
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
    enabled: isOpen && deleteAction === 'reassign',
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: ({ id, options }: { id: string; options?: { action: 'reassign' | 'delete'; newCategoryId?: string } }) =>
      categoryService.deleteCategory(id, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Category deleted successfully!');
      handleClose();
    },
    onError: (error: any) => {
      console.error('Failed to delete category:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete category';
      toast.error(errorMessage);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category) return;

    if (deleteAction === 'reassign' && !newCategoryId) {
      toast.error('Please select a category to reassign transactions to');
      return;
    }

    const options = deleteAction === 'reassign' 
      ? { action: 'reassign' as const, newCategoryId }
      : { action: 'delete' as const };

    deleteCategoryMutation.mutate({ id: category._id, options });
  };

  const handleClose = () => {
    setDeleteAction('delete');
    setNewCategoryId('');
    onClose();
  };

  if (!isOpen || !category) return null;

  // Filter out the current category from reassignment options
  const availableCategories = categories?.data?.filter(cat => 
    cat._id !== category._id && cat.type === category.type
  ) || [];

  const hasTransactions = (category.transactionCount || 0) > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">Delete Category</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={deleteCategoryMutation.isPending}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Warning Message */}
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Are you sure you want to delete this category?
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>Category: <strong>{category.name}</strong></p>
                  {category.isDefault && (
                    <p className="text-orange-700 dark:text-orange-300 font-medium">⚠️ This is a default category</p>
                  )}
                  {hasTransactions && (
                    <p>This category has {category.transactionCount} transaction(s) associated with it.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Delete Options - Only show if category has transactions */}
          {hasTransactions && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What should happen to existing transactions?
                </label>
                
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="deleteAction"
                      value="delete"
                      checked={deleteAction === 'delete'}
                      onChange={(e) => setDeleteAction(e.target.value as 'delete' | 'reassign')}
                      className="mr-2"
                      disabled={deleteCategoryMutation.isPending}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Delete all transactions in this category
                    </span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="deleteAction"
                      value="reassign"
                      checked={deleteAction === 'reassign'}
                      onChange={(e) => setDeleteAction(e.target.value as 'delete' | 'reassign')}
                      className="mr-2"
                      disabled={deleteCategoryMutation.isPending}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Move transactions to another category
                    </span>
                  </label>
                </div>
              </div>

              {/* Category Selection for Reassignment */}
              {deleteAction === 'reassign' && (
                <div>
                  <label htmlFor="newCategory" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select new category *
                  </label>
                  <select
                    id="newCategory"
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    disabled={deleteCategoryMutation.isPending}
                    required
                  >
                    <option value="">Choose a category...</option>
                    {availableCategories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  
                  {availableCategories.length === 0 && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      No other {category.type} categories available for reassignment.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              disabled={deleteCategoryMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={deleteCategoryMutation.isPending || (deleteAction === 'reassign' && !newCategoryId)}
            >
              {deleteCategoryMutation.isPending ? 'Deleting...' : 'Delete Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
