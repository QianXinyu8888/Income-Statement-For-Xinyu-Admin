import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, LogOut, Sun, Moon, Monitor, ChevronDown, BarChart2 } from 'lucide-react';

export default function Navbar({ user, isLive, onRefresh, onLogout, loading, themeMode, setThemeMode }) {
  const [themeOpen, setThemeOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const themeRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (themeRef.current && !themeRef.current.contains(e.target)) setThemeOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const ThemeIcon = themeMode === 'dark' ? Moon : themeMode === 'light' ? Sun : Monitor;
  const themeLabel = themeMode === 'dark' ? '深色' : themeMode === 'light' ? '浅色' : '自动';

  const themes = [
    { key: 'system', label: '跟随系统', Icon: Monitor },
    { key: 'light',  label: '浅色模式', Icon: Sun  },
    { key: 'dark',   label: '深色模式', Icon: Moon },
  ];

  return (
    <header style={{
      height: '48px',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: '8px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      transition: 'background 0.2s',
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <div style={{
          width: '26px', height: '26px',
          background: 'linear-gradient(135deg, #facc15 0%, #ca8a04 100%)',
          borderRadius: '7px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          color: '#0a0a0a'
        }}>
          <BarChart2 size={15} strokeWidth={2.5} />
        </div>
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          交易控制台
        </span>
      </div>

      {/* Status badge — 小屏只显示脉冲点 */}
      <div style={{ marginLeft: '4px' }} className="status-badge-wrap">
        {isLive ? (
          <span className="badge badge-success">
            <span className="pulse-dot" style={{ width: '5px', height: '5px' }} />
            <span className="badge-text">飞书直连</span>
          </span>
        ) : (
          <span className="badge badge-neutral">
            <span className="badge-text">Demo 模式</span>
          </span>
        )}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Refresh */}
      <button
        className="btn-ghost"
        onClick={onRefresh}
        disabled={loading}
        title="同步数据"
        style={{ padding: '6px 8px' }}
      >
        <RefreshCw size={14} style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
        <span style={{ fontSize: '12px' }} className="hidden sm:inline">同步</span>
      </button>

      {/* Theme switcher */}
      <div style={{ position: 'relative' }} ref={themeRef}>
        <button
          className="btn-ghost"
          onClick={() => setThemeOpen(v => !v)}
          style={{ padding: '6px 8px', gap: '4px' }}
        >
          <ThemeIcon size={14} />
          <span style={{ fontSize: '12px' }} className="nav-label">{themeLabel}</span>
          <ChevronDown size={11} style={{ opacity: 0.5, transition: 'transform 0.15s', transform: themeOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} className="nav-chevron" />
        </button>

        {themeOpen && (
          <div style={{
            position: 'absolute', right: 0, top: 'calc(100% + 6px)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            padding: '4px',
            minWidth: '140px',
            zIndex: 100,
            animation: 'scaleIn 0.12s ease both',
          }}>
            {themes.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => { setThemeMode(key); setThemeOpen(false); }}
                className="btn-ghost"
                style={{
                  width: '100%', justifyContent: 'flex-start', padding: '7px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  color: themeMode === key ? 'var(--accent)' : 'var(--text-secondary)',
                  background: themeMode === key ? 'var(--accent-subtle)' : 'transparent',
                  fontWeight: themeMode === key ? 600 : 400,
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Separator */}
      <div style={{ width: '1px', height: '18px', background: 'var(--border)', margin: '0 2px' }} />

      {/* User */}
      <div style={{ position: 'relative' }} ref={userRef}>
        <button
          className="btn-ghost"
          onClick={() => setUserOpen(v => !v)}
          style={{ padding: '4px 6px', gap: '7px' }}
        >
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #facc15, #ca8a04)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#0a0a0a', fontSize: '11px', fontWeight: 800, flexShrink: 0,
          }}>
            {(user?.username || 'A')[0].toUpperCase()}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }} className="nav-label">
            {user?.username || 'admin'}
          </span>
        </button>

        {userOpen && (
          <div style={{
            position: 'absolute', right: 0, top: 'calc(100% + 6px)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            padding: '4px',
            minWidth: '150px',
            zIndex: 100,
            animation: 'scaleIn 0.12s ease both',
          }}>
            <div style={{ padding: '8px 10px 6px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.username || 'admin'}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>管理员</div>
            </div>
            <button
              className="btn-ghost"
              onClick={() => { onLogout(); setUserOpen(false); }}
              style={{
                width: '100%', justifyContent: 'flex-start', padding: '7px 10px',
                borderRadius: 'var(--radius-sm)', fontSize: '13px',
                color: 'var(--danger)',
              }}
            >
              <LogOut size={13} />
              退出登录
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        /* 小屏隐藏文字，只留图标 */
        @media (max-width: 480px) {
          .nav-label { display: none; }
          .nav-chevron { display: none; }
          .badge-text { display: none; }
        }
      `}</style>
    </header>
  );
}
