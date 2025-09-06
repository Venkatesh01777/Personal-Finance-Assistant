import * as React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { authService } from '../../services/auth';
import {
  HomeIcon,
  BanknotesIcon,
  TagIcon,
  DocumentTextIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Transactions', href: '/transactions', icon: BanknotesIcon },
  { name: 'Categories', href: '/categories', icon: TagIcon },
  { name: 'Receipts', href: '/receipts', icon: DocumentTextIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, sidebarOpen, setSidebarOpen } = useAppStore();

  const handleLogout = () => {
    authService.logout();
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={`fixed inset-y-0 left-0 bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 z-30 ${
      sidebarOpen ? 'w-64' : 'w-16'
    }`}>
      <div className="flex flex-col h-full">
        {/* Logo and Toggle */}
        <div className={`flex items-center h-16 border-b border-gray-200 dark:border-gray-700 ${
          sidebarOpen ? 'justify-between px-4' : 'justify-center px-2'
        }`}>
          {sidebarOpen && (
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Finance Tracker</h1>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-6 space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-300 border-r-2 border-primary-700 dark:border-primary-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                } ${sidebarOpen ? 'px-4' : 'px-2 justify-center'}`
              }
              title={!sidebarOpen ? item.name : undefined}
            >
              <item.icon className={`w-5 h-5 ${sidebarOpen ? 'mr-3' : ''}`} />
              {sidebarOpen && item.name}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className={`border-t border-gray-200 dark:border-gray-700 ${sidebarOpen ? 'p-4' : 'p-2'}`}>
          {sidebarOpen ? (
            <>
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                  <span className="text-primary-700 dark:text-primary-300 font-medium">
                    {user?.firstName?.charAt(0).toUpperCase() || 
                     user?.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.firstName && user?.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user?.username
                    }
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
                Sign out
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center space-y-3">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <span className="text-primary-700 dark:text-primary-300 font-medium">
                  {user?.firstName?.charAt(0).toUpperCase() || 
                   user?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-10 h-10 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                title="Sign out"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
