import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppStore } from './store';
import { authService } from './services';
import Layout from './components/layout/Layout';
import AuthLayout from './components/layout/AuthLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Page imports
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import CategoriesPage from './pages/CategoriesPage';
import ReceiptsPage from './pages/ReceiptsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';

// Loading component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

function App() {
  const { isAuthenticated, isAuthLoading } = useAppStore();

  useEffect(() => {
    // Initialize authentication on app start
    console.log('App: Initializing authentication...');
    authService.initializeAuth();
  }, []); // Empty dependency array to run only once on mount

  // Show loading screen while authentication is being initialized
  if (isAuthLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="App">
      <Routes>
        {/* Auth Routes */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
            <Navigate to="/dashboard" replace /> : 
            <AuthLayout><LoginPage /></AuthLayout>
          } 
        />
        <Route 
          path="/register" 
          element={
            isAuthenticated ? 
            <Navigate to="/dashboard" replace /> : 
            <AuthLayout><RegisterPage /></AuthLayout>
          } 
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout><DashboardPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <Layout><TransactionsPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <ProtectedRoute>
              <Layout><CategoriesPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/receipts"
          element={
            <ProtectedRoute>
              <Layout><ReceiptsPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Layout><AnalyticsPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout><SettingsPage /></Layout>
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route
          path="/"
          element={
            <Navigate 
              to={isAuthenticated ? "/dashboard" : "/login"} 
              replace 
            />
          }
        />

        {/* 404 page */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                <p className="text-gray-600 mb-4">Page not found</p>
                <a 
                  href={isAuthenticated ? "/dashboard" : "/login"}
                  className="text-primary-600 hover:text-primary-700"
                >
                  Go back home
                </a>
              </div>
            </div>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
