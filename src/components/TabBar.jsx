import React from 'react';
import { LayoutDashboard, ReceiptText, PieChart, Settings, Plus } from 'lucide-react';

const TABS = [
  { id: 'dashboard',    label: '看板',  Icon: LayoutDashboard },
  { id: 'transactions', label: '明细',  Icon: ReceiptText },
  { id: 'analytics',   label: '算盘',  Icon: PieChart },
  { id: 'settings',    label: '设置',  Icon: Settings },
];

export default function TabBar({ activeTab, setActiveTab, onOpenCreateModal }) {
  return (
    <nav
      className="mobile-tabbar"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
        background: 'var(--tabbar-bg, rgba(255, 255, 255, 0.85))',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.05)',
      }}
    >
      {TABS.map(({ id, label, Icon }, i) => {
        const active = activeTab === id;
        const insertFab = i === 2;
        return (
          <React.Fragment key={id}>
            {insertFab && (
              <button
                onClick={onOpenCreateModal}
                title="新增记录"
                style={{
                  flexShrink: 0,
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent) 0%, #8F7AE0 100%)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  cursor: 'pointer',
                  margin: '0 4px',
                  boxShadow: '0 4px 14px rgba(110,86,207,0.45)',
                  transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), boxShadow 0.15s ease',
                  WebkitTapHighlightColor: 'transparent',
                }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <Plus size={20} strokeWidth={2.5} />
              </button>
            )}
            <button
              onClick={() => setActiveTab(id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                height: '60px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: active ? 'var(--accent)' : 'var(--text-tertiary)',
                transition: 'color 0.15s ease, transform 0.15s ease',
                position: 'relative',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Icon size={19} strokeWidth={active ? 2.2 : 1.6} />
              <span style={{ fontSize: '10px', fontWeight: active ? 600 : 400, letterSpacing: '-0.2px' }}>{label}</span>
              {active && (
                <span style={{
                  position: 'absolute',
                  top: '6px',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                }} />
              )}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

