import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, TransactionFilters, ReceiptFilters } from '@/types';

interface AppState {
  // User State
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  
  // UI State
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  loading: boolean;
  
  // Filter State
  transactionFilters: TransactionFilters;
  receiptFilters: ReceiptFilters;
  
  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuth: boolean) => void;
  setAuthLoading: (loading: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLoading: (loading: boolean) => void;
  updateTransactionFilters: (filters: Partial<TransactionFilters>) => void;
  updateReceiptFilters: (filters: Partial<ReceiptFilters>) => void;
  resetFilters: () => void;
  logout: () => void;
  initializeAuth: () => void;
}

const initialTransactionFilters: TransactionFilters = {
  page: 1,
  limit: 20,
  sort: '-date',
};

const initialReceiptFilters: ReceiptFilters = {
  page: 1,
  limit: 20,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial State
      user: null,
      isAuthenticated: false,
      isAuthLoading: true,
      sidebarOpen: true,
      theme: 'light',
      loading: false,
      transactionFilters: initialTransactionFilters,
      receiptFilters: initialReceiptFilters,

      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user, isAuthLoading: false }),
      
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      
      setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
      
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      
      setTheme: (theme) => set({ theme }),
      
      setLoading: (loading) => set({ loading }),
      
      updateTransactionFilters: (filters) =>
        set((state) => ({
          transactionFilters: { ...state.transactionFilters, ...filters },
        })),
      
      updateReceiptFilters: (filters) =>
        set((state) => ({
          receiptFilters: { ...state.receiptFilters, ...filters },
        })),
      
      resetFilters: () =>
        set({
          transactionFilters: initialTransactionFilters,
          receiptFilters: initialReceiptFilters,
        }),
      
      logout: () => {
        // Clear token from localStorage
        localStorage.removeItem('token');
        set({
          user: null,
          isAuthenticated: false,
          isAuthLoading: false,
          transactionFilters: initialTransactionFilters,
          receiptFilters: initialReceiptFilters,
        });
        // Clear persisted storage
        localStorage.removeItem('finance-tracker-storage');
      },
      
      initializeAuth: () => {
        const token = localStorage.getItem('token');
        if (!token) {
          set({ isAuthenticated: false, isAuthLoading: false });
        } else {
          // Token exists, keep loading true until verification
          set({ isAuthLoading: true });
        }
      },
    }),
    {
      name: 'finance-tracker-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        transactionFilters: state.transactionFilters,
        receiptFilters: state.receiptFilters,
      }),
    }
  )
);
