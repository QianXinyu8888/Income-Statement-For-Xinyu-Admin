import { lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { apiClient } from './api/client';
import { AppShell } from './components/AppShell';
import { LoadingState } from './components/LoadingState';
import LoginPage from './pages/LoginPage';
import { useBrowserPreferences } from './preferences/BrowserPreferencesContext';

const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const SelfUsePage = lazy(() => import('./pages/SelfUsePage'));
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

export default function App() {
  const location = useLocation();
  const session = useQuery({ queryKey: ['session'], queryFn: apiClient.session, retry: false });
  const { effectiveTheme, toggleTheme } = useBrowserPreferences();
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
        element={<AppShell user={session.data.user} theme={effectiveTheme} onTheme={toggleTheme} />}
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
          path="/self-use"
          element={
            <Suspense fallback={<LoadingState />}>
              <SelfUsePage />
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
