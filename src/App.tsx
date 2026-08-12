import { lazy, Suspense, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { apiClient } from './api/client';
import { AppShell } from './components/AppShell';
import { LoadingState } from './components/LoadingState';
import LoginPage from './pages/LoginPage';

const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

export default function App() {
  const location = useLocation();
  const session = useQuery({ queryKey: ['session'], queryFn: apiClient.session, retry: false });
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    localStorage.getItem('theme') === 'dark' ? 'dark' : 'light',
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);
  if (session.isLoading && location.pathname !== '/login')
    return <LoadingState label="正在验证登录状态" />;
  if (!session.data?.user)
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  return (
    <Routes>
      <Route
        element={
          <AppShell
            user={session.data.user}
            theme={theme}
            onTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
        }
      >
        <Route
          path="/transactions"
          element={
            <Suspense fallback={<LoadingState />}>
              <TransactionsPage />
            </Suspense>
          }
        />
        <Route
          path="/overview"
          element={
            <Suspense fallback={<LoadingState />}>
              <OverviewPage />
            </Suspense>
          }
        />
        <Route
          path="/analytics"
          element={
            <Suspense fallback={<LoadingState />}>
              <AnalyticsPage />
            </Suspense>
          }
        />
        <Route
          path="/settings"
          element={
            <Suspense fallback={<LoadingState />}>
              <SettingsPage />
            </Suspense>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/transactions" replace />} />
    </Routes>
  );
}
