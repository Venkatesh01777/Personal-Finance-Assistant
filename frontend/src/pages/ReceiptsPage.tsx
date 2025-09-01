import * as React from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { receiptService } from '../services/receipts';
import { useAppStore } from '../store';
import { Receipt } from '../types';
import ReceiptUpload from '../components/receipts/ReceiptUpload';
import ReceiptViewModal from '../components/receipts/ReceiptViewModal';
import {
  PlusIcon,
  EyeIcon,
  ArrowPathIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

const ReceiptsPage: React.FC = () => {
  const { isAuthenticated, isAuthLoading } = useAppStore();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [processingReceipts, setProcessingReceipts] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: '',
    startDate: '',
    endDate: '',
  });

  const { data: receipts, isLoading } = useQuery({
    queryKey: ['receipts', filters],
    queryFn: () => receiptService.getReceipts(filters),
    enabled: isAuthenticated && !isAuthLoading,
  });

  const reprocessMutation = useMutation({
    mutationFn: (id: string) => receiptService.reprocessReceipt(id),
    onMutate: (id) => {
      setProcessingReceipts(prev => new Set(prev).add(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
    onError: () => {
      // Error handled by react-query
    },
    onSettled: (_, __, id) => {
      setProcessingReceipts(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    },
  });

  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setIsViewModalOpen(true);
  };

  const handleProcessReceipt = (receiptId: string) => {
    reprocessMutation.mutate(receiptId);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedReceipt(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
          <p className="text-gray-600">Upload and process your receipts with AI</p>
        </div>
        <button 
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Upload Receipt
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="uploaded">Uploaded</option>
              <option value="processing">Processing</option>
              <option value="processed">Processed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <button className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <FunnelIcon className="h-4 w-4 mr-2" />
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Receipts Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {receipts?.data?.map((receipt) => (
            <div key={receipt._id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                {receipt.fileUrl ? (
                  <img
                    src={receipt.fileUrl}
                    alt={receipt.originalName}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-48 bg-gray-100">
                    <span className="text-gray-400 text-sm">No preview available</span>
                  </div>
                )}
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {receipt.originalName}
                  </h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(receipt.status)}`}>
                    {receipt.status}
                  </span>
                </div>
                
                <p className="text-sm text-gray-500 mb-4">
                  Uploaded: {new Date(receipt.createdAt).toLocaleDateString()}
                </p>
                
                {receipt.parsedData && (
                  <div className="space-y-2 mb-4">
                    {receipt.parsedData.merchantName?.value && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Merchant:</span>
                        <span className="text-sm font-medium">{receipt.parsedData.merchantName.value}</span>
                      </div>
                    )}
                    {receipt.parsedData.totalAmount?.value && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Amount:</span>
                        <span className="text-sm font-medium">${receipt.parsedData.totalAmount.value.toLocaleString()}</span>
                      </div>
                    )}
                    {receipt.parsedData.date?.value && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Date:</span>
                        <span className="text-sm font-medium">
                          {new Date(receipt.parsedData.date.value).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleViewReceipt(receipt)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <EyeIcon className="h-4 w-4 mr-2" />
                    View
                  </button>
                  <button 
                    onClick={() => handleProcessReceipt(receipt._id)}
                    disabled={processingReceipts.has(receipt._id) || receipt.status === 'processing'}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowPathIcon className={`h-4 w-4 mr-2 ${processingReceipts.has(receipt._id) || receipt.status === 'processing' ? 'animate-spin' : ''}`} />
                    {processingReceipts.has(receipt._id) || receipt.status === 'processing' ? 'Processing...' : 'Process'}
                  </button>
                </div>
              </div>
            </div>
          )) || (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">No receipts found</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {receipts?.meta?.pagination && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Previous
            </button>
            <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {(receipts.meta.pagination.currentPage - 1) * receipts.meta.pagination.itemsPerPage + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(
                    receipts.meta.pagination.currentPage * receipts.meta.pagination.itemsPerPage,
                    receipts.meta.pagination.totalItems
                  )}
                </span>{' '}
                of{' '}
                <span className="font-medium">{receipts.meta.pagination.totalItems}</span>{' '}
                results
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <ReceiptUpload 
        isOpen={isUploadOpen} 
        onClose={() => {
          setIsUploadOpen(false);
          // Refresh receipts after upload
          queryClient.invalidateQueries({ queryKey: ['receipts'] });
        }} 
      />

      {/* View Modal */}
      <ReceiptViewModal
        receipt={selectedReceipt}
        isOpen={isViewModalOpen}
        onClose={handleCloseViewModal}
      />
    </div>
  );
};

export default ReceiptsPage;
