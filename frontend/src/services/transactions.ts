import { apiClient } from './api';
import { Transaction, TransactionFilters, TransactionFormData, ApiResponse } from '@/types';

export const transactionService = {
  // Get all transactions with filtering and pagination
  async getTransactions(filters?: TransactionFilters): Promise<ApiResponse<Transaction[]>> {
    return await apiClient.get('/transactions', filters);
  },

  // Get single transaction
  async getTransaction(id: string): Promise<Transaction> {
    const response = await apiClient.get<Transaction>(`/transactions/${id}`);
    return response.data;
  },

  // Create new transaction
  async createTransaction(data: TransactionFormData): Promise<Transaction> {
    // Map categoryId to category for backend compatibility
    const transactionData: any = {
      ...data,
      category: data.categoryId,
    };
    delete transactionData.categoryId;
    
    const response = await apiClient.post<Transaction>('/transactions', transactionData);
    return response.data;
  },

  // Update transaction
  async updateTransaction(id: string, data: Partial<TransactionFormData>): Promise<Transaction> {
    console.log('Transaction service - updating transaction:', id, data);
    
    // Map categoryId to category for backend compatibility
    const updateData: any = { ...data };
    if (updateData.categoryId) {
      updateData.category = updateData.categoryId;
      delete updateData.categoryId;
      console.log('Mapped categoryId to category:', updateData.category);
    }
    
    console.log('Final update data being sent to backend:', updateData);
    
    const response = await apiClient.patch<Transaction>(`/transactions/${id}`, updateData);
    console.log('Update response:', response);
    return response.data;
  },

  // Delete transaction
  async deleteTransaction(id: string): Promise<void> {
    await apiClient.delete(`/transactions/${id}`);
  },

  // Bulk delete transactions
  async bulkDeleteTransactions(ids: string[]): Promise<void> {
    await apiClient.post('/transactions/bulk-delete', { transactionIds: ids });
  },

  // Duplicate transaction
  async duplicateTransaction(id: string): Promise<Transaction> {
    const response = await apiClient.post<Transaction>(`/transactions/${id}/duplicate`);
    return response.data;
  },

  // Get transactions by category
  async getTransactionsByCategory(
    categoryId: string, 
    filters?: { startDate?: string; endDate?: string; page?: number; limit?: number }
  ): Promise<ApiResponse<{ category: any; transactions: Transaction[] }>> {
    return await apiClient.get(`/transactions/category/${categoryId}`, filters);
  },

  // Get transaction summary for date range
  async getTransactionSummary(filters: {
    startDate: string;
    endDate: string;
    type?: 'income' | 'expense';
    categoryId?: string;
  }): Promise<any> {
    const response = await apiClient.get('/transactions/summary/date-range', filters);
    return response.data;
  },

  // Export transactions
  async exportTransactions(filters?: {
    startDate?: string;
    endDate?: string;
    type?: 'income' | 'expense';
    categoryId?: string;
    format?: 'csv' | 'json';
  }): Promise<any> {
    const response = await apiClient.get('/transactions/export/data', filters);
    return response.data;
  },

  // Search transactions
  async searchTransactions(query: string, filters?: TransactionFilters): Promise<ApiResponse<Transaction[]>> {
    return await apiClient.get('/transactions', { 
      ...filters, 
      search: query 
    });
  },

  // Get recent transactions
  async getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    const response = await apiClient.get<Transaction[]>('/transactions', { 
      limit, 
      sort: '-date' 
    });
    return response.data;
  },
};
