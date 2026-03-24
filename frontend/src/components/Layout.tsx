import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LayoutDashboard, ListTodo, Wallet, Bot, Shield, LogOut, Key } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
    { path: '/tasks', label: '任务管理', icon: ListTodo },
    { path: '/wallet', label: '钱包', icon: Wallet },
    { path: '/api-keys', label: 'API密钥', icon: Key },
    ...(user?.role === 'node' || user?.role === 'admin'
      ? [{ path: '/node', label: '节点管理', icon: Bot }]
      : []),
    ...(user?.role === 'admin'
      ? [{ path: '/admin', label: '后台管理', icon: Shield }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-primary-600">
                AI Factory
              </Link>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'text-primary-600 bg-primary-50'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-1.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {user?.email}
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-700">
                  {user?.role === 'node' ? '节点' : user?.role === 'admin' ? '管理员' : '用户'}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="退出登录"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
