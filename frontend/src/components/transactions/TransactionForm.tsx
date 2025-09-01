import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Transaction, TransactionFormData, Category } from '../../types';
import { transactionService } from '../../services/transactions';
import { toast } from 'react-hot-toast';

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  categoryId: z.string().min(1, 'Category is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  paymentMethod: z.enum(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'digital_wallet', 'other']),
  location: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurringDetails: z.object({
    frequency: z.string(),
    interval: z.number(),
    endDate: z.string().optional(),
  }).optional(),
});

interface TransactionFormProps {
  transaction?: Transaction;
  categories: Category[];
  onClose: () => void;
  isOpen: boolean;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  transaction,
  categories,
  onClose,
  isOpen
}) => {
  const queryClient = useQueryClient();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      categoryId: '',
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      location: '',
      tags: [],
      notes: '',
      isRecurring: false,
    }
  });

  const watchType = watch('type');
  const watchIsRecurring = watch('isRecurring');

  // Reset form when transaction changes
  useEffect(() => {
    console.log('Transaction changed in form:', transaction);
    
    if (transaction) {
      const formData = {
        type: transaction.type,
        categoryId: transaction.category?._id || '',
        amount: transaction.amount,
        description: transaction.description,
        date: new Date(transaction.date).toISOString().split('T')[0],
        paymentMethod: transaction.paymentMethod,
        location: transaction.location || '',
        tags: transaction.tags || [],
        notes: transaction.notes || '',
        isRecurring: transaction.isRecurring || false,
        recurringDetails: transaction.recurringDetails || undefined,
      };
      
      console.log('Resetting form with data:', formData);
      reset(formData);
      setTags(transaction.tags || []);
    } else {
      const defaultData = {
        type: 'expense' as const,
        categoryId: '',
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash' as const,
        location: '',
        tags: [],
        notes: '',
        isRecurring: false,
      };
      
      console.log('Resetting form with default data:', defaultData);
      reset(defaultData);
      setTags([]);
    }
  }, [transaction, reset]);

  const createMutation = useMutation({
    mutationFn: transactionService.createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['spending-trends'] });
      queryClient.invalidateQueries({ queryKey: ['category-breakdown'] });
      toast.success('Transaction created successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create transaction');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TransactionFormData> }) =>
      transactionService.updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['spending-trends'] });
      queryClient.invalidateQueries({ queryKey: ['category-breakdown'] });
      toast.success('Transaction updated successfully');
      onClose();
    },
    onError: (error: any) => {
      console.error('Update transaction error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update transaction';
      toast.error(`Update failed: ${errorMessage}`);
    }
  });

  const onSubmit = (data: TransactionFormData) => {
    console.log('🔥 onSubmit called!');
    console.log('Form submission data:', data);
    console.log('Current tags:', tags);
    console.log('Is editing transaction:', !!transaction);
    
    const formData = {
      ...data,
      tags,
      // Ensure required fields have valid values
      paymentMethod: data.paymentMethod || 'cash',
      // Remove empty optional fields
      location: data.location?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
    };

    // Remove undefined values
    Object.keys(formData).forEach(key => {
      if (formData[key as keyof TransactionFormData] === undefined) {
        delete formData[key as keyof TransactionFormData];
      }
    });

    console.log('Final form data to submit:', formData);

    if (transaction) {
      console.log('Updating transaction with ID:', transaction._id);
      updateMutation.mutate({ id: transaction._id, data: formData });
    } else {
      console.log('Creating new transaction');
      createMutation.mutate(formData);
    }
  };

  // Debug function to check form state
  const debugFormState = () => {
    console.log('=== FORM DEBUG ===');
    console.log('Form errors:', errors);
    console.log('Current form values:', watch());
    console.log('Transaction prop:', transaction);
    console.log('Tags state:', tags);
    console.log('Create mutation status:', {
      isPending: createMutation.isPending,
      error: createMutation.error
    });
    console.log('Update mutation status:', {
      isPending: updateMutation.isPending,
      error: updateMutation.error
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      setValue('tags', newTags);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    setValue('tags', newTags);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {transaction ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Debug form errors */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h4 className="text-red-800 font-medium">Form Validation Errors:</h4>
              <ul className="mt-2 text-red-700 text-sm">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>
                    {field}: {error?.message || 'Invalid value'}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {/* Transaction Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                )}
              />
              {errors.type && (
                <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Category</option>
                    {categories
                      .filter(cat => cat.type === watchType)
                      .map(category => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                )}
              />
              {errors.categoryId && (
                <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount
              </label>
              <Controller
                name="amount"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    step="0.01"
                    min="0"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              />
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="check">Check</option>
                    <option value="digital_wallet">Digital Wallet</option>
                    <option value="other">Other</option>
                  </select>
                )}
              />
              {errors.paymentMethod && (
                <p className="mt-1 text-sm text-red-600">{errors.paymentMethod.message}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location (Optional)
              </label>
              <Controller
                name="location"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags (Optional)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add a tag"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            />
          </div>

          {/* Recurring Transaction */}
          <div>
            <Controller
              name="isRecurring"
              control={control}
              render={({ field }) => (
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Recurring Transaction</span>
                </label>
              )}
            />
          </div>

          {watchIsRecurring && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency
                </label>
                <Controller
                  name="recurringDetails.frequency"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Frequency</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interval
                </label>
                <Controller
                  name="recurringDetails.interval"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="number"
                      min="1"
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date (Optional)
                </label>
                <Controller
                  name="recurringDetails.endDate"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                />
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6">
            {/* Debug button */}
            <button
              type="button"
              onClick={debugFormState}
              className="px-4 py-2 text-gray-700 bg-yellow-200 rounded-md hover:bg-yellow-300 transition-colors"
            >
              Debug
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={() => console.log('🚀 Submit button clicked!')}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : transaction ? 'Update Transaction' : 'Create Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;