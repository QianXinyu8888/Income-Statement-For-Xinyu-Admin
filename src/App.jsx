import React, { useState, useEffect } from 'react';
import { authService, bitableService } from './services/api';
import Login from './components/Login';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import Dashboard from './components/Dashboard';
import TransactionManager from './components/TransactionManager';
import ProfitAnalytics from './components/ProfitAnalytics';
import Settings from './components/Settings';
import RecordModal from './components/RecordModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);

  // 主题模式: 'system' (默认跟随系统), 'dark', 'light'
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('theme_preference') || 'system';
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // 监听并应用主题模式


  useEffect(() => {
    localStorage.setItem('theme_preference', themeMode);

    const applyTheme = () => {
      let activeTheme = themeMode;
      if (themeMode === 'system') {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        activeTheme = isSystemDark ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', activeTheme);
    };

    applyTheme();

    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = () => applyTheme();
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
  }, [themeMode]);

  // 初始化检查登录
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      loadRecords();
    }
  }, []);

  // 加载交易记录
  const loadRecords = async () => {
    setLoading(true);
    try {
      const res = await bitableService.fetchRecords();
      setRecords(res.records);
      setIsLive(res.isLive);
    } catch (err) {
      console.error('Failed to load records:', err);
    } finally {
      setLoading(false);
    }
  };

  // 登录成功
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    loadRecords();
  };

  // 退出登录
  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  // 打开新增 Modal
  const handleOpenCreateModal = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  // 打开编辑 Modal
  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  // 保存记录 (新建或编辑)
  const handleSaveRecord = async (fields) => {
    setLoading(true);
    try {
      if (editingRecord) {
        await bitableService.updateRecord(editingRecord.record_id, fields);
      } else {
        await bitableService.createRecord(fields);
      }
      setIsModalOpen(false);
      await loadRecords();
    } catch (err) {
      alert('保存记录失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 批量更新状态
  const handleBatchUpdateStatus = async (recordIds, newStatus) => {
    setLoading(true);
    try {
      await bitableService.batchUpdateStatus(recordIds, newStatus);
      await loadRecords();
    } catch (err) {
      alert('批量更新失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 批量删除
  const handleDeleteRecords = async (recordIds) => {
    setLoading(true);
    try {
      await bitableService.deleteRecords(recordIds);
      await loadRecords();
    } catch (err) {
      alert('删除失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 若未登录则渲染 Login 页面
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-app)' }}>
      {/* 顶部 Navbar */}
      <Navbar
        user={currentUser}
        isLive={isLive}
        onRefresh={loadRecords}
        onLogout={handleLogout}
        loading={loading}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
      />

      {/* 中间主体区域 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 侧边栏：手机上隐藏 (768px以下)，Mac/桌面端 (768px+) 显示 */}
        <div className="sidebar-wrapper">
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenCreateModal={handleOpenCreateModal}
          />

        </div>

        {/* 内容区 */}
        <main className="main-content">
          {activeTab === 'dashboard' && (
            <Dashboard
              records={records}
              onNavigateToRecords={() => setActiveTab('transactions')}
              onOpenCreateModal={handleOpenCreateModal}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionManager
              records={records}
              onOpenCreateModal={handleOpenCreateModal}
              onEditRecord={handleEditRecord}
              onBatchUpdateStatus={handleBatchUpdateStatus}
              onDeleteRecords={handleDeleteRecords}
              loading={loading}
            />
          )}

          {activeTab === 'analytics' && <ProfitAnalytics records={records} />}

          {activeTab === 'settings' && (
            <Settings themeMode={themeMode} setThemeMode={setThemeMode} />
          )}
        </main>
      </div>

      {/* 底部 TabBar：仅手机端 (768px以下) 显示 */}
      <TabBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreateModal={handleOpenCreateModal}
      />

      {/* 新增/编辑 Modal 弹窗 */}
      <RecordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveRecord}
        editingRecord={editingRecord}
        loading={loading}
      />

      <style>{`
        /* ── 两段式响应：< 768px 为 iPhone/移动端，≥ 768px 为 Mac/桌面端 ── */
        .sidebar-wrapper {
          display: none;
          height: 100%;
        }
        @media (min-width: 768px) {
          .sidebar-wrapper {
            display: flex;
            flex-direction: column;
          }
          .mobile-tabbar {
            display: none !important;
          }
        }

        /* ── 主内容区响应式 padding ── */
        .main-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          /* 手机端底部留出 TabBar 高度 (60px) + 安全区 + 间距 */
          padding-bottom: calc(76px + env(safe-area-inset-bottom, 0px));
          max-width: 1400px;
          width: 100%;
          transition: padding 0.2s ease;
        }
        @media (min-width: 768px) {
          .main-content {
            padding: 24px;
            padding-bottom: 24px;
          }
        }
        @media (min-width: 1024px) {
          .main-content {
            padding: 32px;
            padding-bottom: 32px;
          }
        }
      `}</style>

    </div>
  );
}
