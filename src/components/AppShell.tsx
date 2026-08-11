import { BarChart3, List, LogOut, Moon, Settings, Sun, WalletCards } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { apiClient, type User } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';

const navigation = [
  { to: '/transactions', label: '交易', icon: List },
  { to: '/overview', label: '概览', icon: WalletCards },
  { to: '/analytics', label: '分析', icon: BarChart3 },
  { to: '/settings', label: '设置', icon: Settings },
];

export function AppShell({
  user,
  theme,
  onTheme,
}: {
  user: User;
  theme: 'light' | 'dark';
  onTheme: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = async () => {
    await apiClient.logout();
    queryClient.clear();
    navigate('/login', { replace: true });
  };
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="主导航">
        <div className="brand" aria-label="闲鱼损益">
          X
        </div>
        <nav>
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} title={label}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button
          className="icon-button sidebar-theme"
          onClick={onTheme}
          aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="topbar-user">{user.username}</span>
          <button className="text-button" onClick={logout}>
            <LogOut size={15} />
            退出
          </button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
      <nav className="bottom-nav" aria-label="移动端主导航">
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to}>
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
