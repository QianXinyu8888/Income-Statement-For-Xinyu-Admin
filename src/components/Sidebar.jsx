import React from 'react';
import { LayoutDashboard, ReceiptText, PieChart, Settings, Plus } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard',    label: '经营看板',  Icon: LayoutDashboard },
  { id: 'transactions', label: '交易明细',  Icon: ReceiptText },
  { id: 'analytics',   label: '损益算盘',  Icon: PieChart },
  { id: 'settings',    label: '系统设置',  Icon: Settings },
];

export default function Sidebar({ activeTab, setActiveTab, onOpenCreateModal }) {
  return (
    <aside style={{
      width: '200px',
      flexShrink: 0,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '12px 8px',
      gap: '4px',
      overflowY: 'auto',
      height: '100%',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '2px 6px 10px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '8px',
      }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          主导航
        </span>
      </div>

      {/* Primary Action */}
      <button
        className="btn-primary"
        onClick={onOpenCreateModal}
        style={{
          margin: '0 0 10px',
          padding: '9px 14px',
          fontSize: '13px',
          borderRadius: 'var(--radius-md)',
          width: '100%',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <Plus size={16} strokeWidth={2.5} />
        <span>新增记录</span>
      </button>

      {/* Nav items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: active ? 600 : 500,
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.15s ease, color 0.15s ease',
                background: active ? 'var(--accent-subtle)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                position: 'relative',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
            >
              {active && (
                <span style={{
                  position: 'absolute',
                  left: 0,
                  top: '15%',
                  bottom: '15%',
                  width: '3px',
                  borderRadius: '0 2px 2px 0',
                  background: 'var(--accent)',
                }} />
              )}
              <Icon size={18} strokeWidth={active ? 2.2 : 1.75} style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom info */}
      <div style={{
        padding: '10px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-subtle)',
        fontSize: '11px',
        color: 'var(--text-tertiary)',
        lineHeight: 1.4,
      }}>
        <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '2px' }}>Seller Dashboard</div>
        <div>飞书多维表格数据系统</div>
      </div>
    </aside>
  );
}


