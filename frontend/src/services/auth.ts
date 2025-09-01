import { apiClient } from './api';
import { useAppStore } from '@/store';
import { 
  User, 
  AuthResponse, 
  LoginCredentials, 
  RegisterData,
  DashboardStats 
} from '@/types';

export const authService = {
  // Authentication
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<{ user: User }>('/auth/login', credentials);
    
    if (response.success && response.token) {
      apiClient.setToken(response.token);
      // Update store with user data
      const { setUser } = useAppStore.getState();
      if (response.data.user) {
        setUser(response.data.user);
      }
    }
    
    return {
      success: response.success,
      message: response.message,
      token: response.token || '',
      data: response.data,
    };
  },

  async register(userData: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<{ user: User }>('/auth/register', userData);
    
    if (response.success && response.token) {
      apiClient.setToken(response.token);
      // Update store with user data
      const { setUser } = useAppStore.getState();
      if (response.data.user) {
        setUser(response.data.user);
      }
    }
    
    return {
      success: response.success,
      message: response.message,
      token: response.token || '',
      data: response.data,
    };
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Even if logout fails on server, clear local token
      console.error('Logout error:', error);
    } finally {
      // Use store logout which clears everything
      const { logout } = useAppStore.getState();
      logout();
      apiClient.clearToken();
    }
  },

  // Profile Management
  async getProfile(): Promise<User> {
    const response = await apiClient.get<User>('/auth/profile');
    return response.data;
  },

  async updateProfile(profileData: Partial<User>): Promise<User> {
    const response = await apiClient.patch<User>('/auth/profile', profileData);
    // Update store with new user data
    const { setUser } = useAppStore.getState();
    setUser(response.data);
    return response.data;
  },

  async changePassword(passwordData: { 
    currentPassword: string; 
    newPassword: string; 
  }): Promise<void> {
    await apiClient.patch('/auth/change-password', passwordData);
  },

  async deactivateAccount(): Promise<void> {
    await apiClient.patch('/auth/deactivate');
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>('/auth/dashboard');
    return response.data;
  },

  // Use Zustand store as single source of truth for authentication state
  isAuthenticated(): boolean {
    const { isAuthenticated } = useAppStore.getState();
    return isAuthenticated;
  },

  clearSession(): void {
    const { logout } = useAppStore.getState();
    logout();
    apiClient.clearToken();
  },

  // Initialize authentication state by checking token and verifying with server
  async initializeAuth(): Promise<void> {
    const { initializeAuth, setUser, setAuthLoading } = useAppStore.getState();
    
    // Initialize the store first
    initializeAuth();
    
    const token = localStorage.getItem('token');
    if (!token) {
      setAuthLoading(false);
      return;
    }

    try {
      setAuthLoading(true);
      const user = await this.getProfile();
      setUser(user);
    } catch (error) {
      console.error('Failed to verify authentication:', error);
      // Clear invalid token and user state
      this.clearSession();
    } finally {
      setAuthLoading(false);
    }
  },
};
