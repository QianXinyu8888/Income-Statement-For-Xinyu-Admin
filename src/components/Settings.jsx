import React, { useState, useEffect } from 'react';
import { Monitor, Moon, Sun, RefreshCw, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { bitableService, authService } from '../services/api';

const THEMES = [
  { key: 'system', label: '跟随系统', desc: 'Auto', Icon: Monitor },
  { key: 'light',  label: '浅色模式', desc: 'Light', Icon: Sun  },
  { key: 'dark',   label: '深色模式', desc: 'Dark',  Icon: Moon },
];

function Section({ title, children }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
        {title}
      </div>
      <div style={{ padding: '16px 20px' }}>
        {children}
      </div>
    </div>
  );
}

export default function Settings({ themeMode, setThemeMode }) {
  const [health, setHealth]   = useState(null);
  const [loading, setLoading] = useState(false);
  const user = authService.getCurrentUser();

  const checkHealth = async () => {
    setLoading(true);
    try {
      const d = await bitableService.checkHealth();
      setHealth(d);
    } catch (e) {
      setHealth({ connected: false, message: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { checkHealth(); }, []);

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '4px' }}>
          系统设置
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          外观偏好与飞书数据连接配置
        </p>
      </div>

      {/* Theme */}
      <Section title="外观主题">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {THEMES.map(({ key, label, desc, Icon }) => {
            const active = themeMode === key;
            return (
              <button
                key={key}
                onClick={() => setThemeMode(key)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                  padding: '16px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  background: active ? 'var(--accent-subtle)' : 'var(--bg-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={18} style={{ color: active ? 'var(--accent)' : 'var(--text-secondary)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: active ? 'var(--accent)' : 'var(--text-primary)' }}>{label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px', fontFamily: 'monospace' }}>{desc}</div>
                </div>
                {active && (
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />
                )}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Feishu connection */}
      <Section title="飞书 API 连接">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {health?.connected
                ? <CheckCircle size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
                : <XCircle size={16} style={{ color: health === null ? 'var(--text-tertiary)' : 'var(--warning)', flexShrink: 0 }} />
              }
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {health === null ? '检测中…' : health?.connected ? '飞书 Bitable 已连接' : 'Demo 模式（离线）'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', fontFamily: 'monospace' }}>
                  Base ID: I8uhbjG29aOl9Rs9wcjcWVmYnvd
                </div>
              </div>
            </div>
            <button
              className="btn-secondary"
              onClick={checkHealth}
              disabled={loading}
              style={{ fontSize: '12px', padding: '5px 10px' }}
            >
              <RefreshCw size={12} style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
              重新检测
            </button>
          </div>

          <a
            href="https://kcn1zihxx6ro.feishu.cn/base/I8uhbjG29aOl9Rs9wcjcWVmYnvd"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: '13px', color: 'var(--accent)', fontWeight: 600,
              textDecoration: 'none', padding: '4px 0',
              width: 'fit-content',
            }}
          >
            <ExternalLink size={13} />
            在飞书中打开原始多维表格
          </a>
        </div>
      </Section>

      {/* Account */}
      <Section title="当前账户">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #facc15, #ca8a04)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#0a0a0a', fontSize: '14px', fontWeight: 800,
          }}>
            {(user?.username || 'A')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {user?.username || 'admin'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              系统管理员 · JWT 已验证
            </div>
          </div>
          <span className="badge badge-success">已登录</span>
        </div>
      </Section>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
