import { apiClient } from './api';
import { Category, CategoryFormData, ApiResponse } from '@/types';

export const categoryService = {
  // Get all categories
  async getCategories(filters?: {
    type?: 'income' | 'expense' | 'both';
    includeTransactionCounts?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Category[]>> {
    return await apiClient.get('/categories', filters);
  },

  // Get single category
  async getCategory(id: string): Promise<Category> {
    const response = await apiClient.get<Category>(`/categories/${id}`);
    return response.data;
  },

  // Create new category
  async createCategory(data: CategoryFormData): Promise<Category> {
    const response = await apiClient.post<Category>('/categories', data);
    return response.data;
  },

  // Update category
  async updateCategory(id: string, data: Partial<CategoryFormData>): Promise<Category> {
    const response = await apiClient.patch<Category>(`/categories/${id}`, data);
    return response.data;
  },

  // Delete category
  async deleteCategory(id: string, options?: {
    action: 'reassign' | 'delete';
    newCategoryId?: string;
  }): Promise<void> {
    let url = `/categories/${id}`;
    
    if (options) {
      const params = new URLSearchParams();
      params.append('action', options.action);
      if (options.newCategoryId) {
        params.append('newCategoryId', options.newCategoryId);
      }
      url += `?${params.toString()}`;
    }
    
    await apiClient.delete(url);
  },

  // Get category statistics
  async getCategoryStats(filters?: {
    startDate?: string;
    endDate?: string;
    type?: 'income' | 'expense';
  }): Promise<any> {
    const response = await apiClient.get('/categories/analytics/stats', filters);
    return response.data;
  },

  // Get popular categories
  async getPopularCategories(filters?: {
    period?: 'week' | 'month' | 'quarter' | 'year';
    limit?: number;
  }): Promise<any> {
    const response = await apiClient.get('/categories/analytics/popular', filters);
    return response.data;
  },

  // Reset to default categories
  async resetToDefaultCategories(): Promise<Category[]> {
    const response = await apiClient.post<Category[]>('/categories/reset-defaults');
    return response.data;
  },

  // Get categories by type
  async getCategoriesByType(type: 'income' | 'expense'): Promise<Category[]> {
    const response = await apiClient.get<Category[]>('/categories', { type });
    return response.data;
  },

  // Get category with transaction count
  async getCategoryWithStats(id: string): Promise<any> {
    const response = await apiClient.get(`/categories/${id}?includeStats=true`);
    return response.data;
  },
};
