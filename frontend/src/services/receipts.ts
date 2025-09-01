import { apiClient } from './api';
import { Receipt, ReceiptFilters, ApiResponse } from '@/types';

export const receiptService = {
  // Get all receipts with filtering and pagination
  async getReceipts(filters?: ReceiptFilters): Promise<ApiResponse<Receipt[]>> {
    return await apiClient.get('/receipts', filters);
  },

  // Get single receipt
  async getReceipt(id: string): Promise<Receipt> {
    const response = await apiClient.get<Receipt>(`/receipts/${id}`);
    return response.data;
  },

  // Upload receipt file
  async uploadReceipt(file: File, metadata?: {
    description?: string;
    notes?: string;
    ocrMethod?: 'gemini' | 'tesseract' | 'hybrid';
  }): Promise<Receipt> {
    const formData = new FormData();
    formData.append('receipt', file);
    
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        if (value) {
          formData.append(key, value);
        }
      });
    }
    
    const response = await apiClient.uploadFile<Receipt>('/receipts', formData);
    return response.data;
  },

  // Update receipt
  async updateReceipt(id: string, data: {
    description?: string;
    notes?: string;
    parsedData?: any;
  }): Promise<Receipt> {
    const response = await apiClient.patch<Receipt>(`/receipts/${id}`, data);
    return response.data;
  },

  // Delete receipt
  async deleteReceipt(id: string): Promise<void> {
    await apiClient.delete(`/receipts/${id}`);
  },

  // Reprocess receipt OCR
  async reprocessReceipt(id: string, options?: {
    ocrMethod?: 'gemini' | 'tesseract' | 'hybrid';
    enhanceImage?: boolean;
    extractItemDetails?: boolean;
  }): Promise<Receipt> {
    const response = await apiClient.post<Receipt>(`/receipts/${id}/reprocess`, options || {});
    return response.data;
  },

  // Create transaction from receipt
  async createTransactionFromReceipt(id: string, data?: {
    categoryId?: string;
    customData?: {
      amount?: number;
      description?: string;
      date?: string;
      notes?: string;
    };
  }): Promise<any> {
    const response = await apiClient.post(`/receipts/${id}/create-transaction`, data || {});
    return response.data;
  },

  // Unlink receipt from transaction
  async unlinkReceiptFromTransaction(id: string): Promise<void> {
    await apiClient.patch(`/receipts/${id}/unlink-transaction`);
  },

  // Get receipt statistics
  async getReceiptStats(filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalReceipts: number;
    statusBreakdown: Record<string, number>;
    averageConfidence: number;
    averageProcessingTime: number;
    monthlyStats: any[];
  }> {
    const response = await apiClient.get('/receipts/analytics/stats', filters);
    return response.data as any;
  },

  // Get receipts by status
  async getReceiptsByStatus(status: 'uploaded' | 'processing' | 'processed' | 'failed'): Promise<Receipt[]> {
    const response = await apiClient.get<Receipt[]>('/receipts', { status });
    return response.data;
  },

  // Get recent receipts
  async getRecentReceipts(limit: number = 10): Promise<Receipt[]> {
    const response = await apiClient.get<Receipt[]>('/receipts', { 
      limit, 
      sort: '-createdAt' 
    });
    return response.data;
  },

  // Check processing status
  async checkProcessingStatus(id: string): Promise<{
    status: string;
    progress?: number;
    estimatedTimeRemaining?: number;
  }> {
    const receipt = await this.getReceipt(id);
    return {
      status: receipt.status,
      progress: receipt.status === 'processed' ? 100 : 
               receipt.status === 'processing' ? 50 : 0,
    };
  },

  // Download receipt file
  getReceiptFileUrl(receipt: Receipt): string {
    return receipt.fileUrl || `http://localhost:5000/${receipt.filePath}`;
  },
};
