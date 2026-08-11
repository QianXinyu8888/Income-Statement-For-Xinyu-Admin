import React, { useState, useMemo } from 'react';
import {
  Search, Plus, Edit3, Trash2, CheckSquare, Square, LayoutList, Columns,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';

// 3 种飞书多维表格标准交易状态
const BASE_STATUSES = ['已售出', '自用中', '已退货'];

const STATUS_STYLES = {
  '已售出':   { cls: 'badge-success', dot: 'var(--success)' },
  '已完成':   { cls: 'badge-success', dot: 'var(--success)' },
  '交易成功': { cls: 'badge-success', dot: 'var(--success)' },
  '自用中':   { cls: 'badge-warning', dot: 'var(--warning)' },
  '已付订金': { cls: 'badge-warning', dot: 'var(--warning)' },
  '买家已付款': { cls: 'badge-warning', dot: 'var(--warning)' },
  '已退货':   { cls: 'badge-danger',  dot: 'var(--danger)' },
  '售后/退款':{ cls: 'badge-danger',  dot: 'var(--danger)' },
  '退款售后': { cls: 'badge-danger',  dot: 'var(--danger)' },
};

function getStatusStyle(status) {
  return STATUS_STYLES[status] || { cls: 'badge-neutral', dot: 'var(--text-tertiary)' };
}

export default function TransactionManager({
  records = [],
  onOpenCreateModal,
  onEditRecord,
  onBatchUpdateStatus,
  onDeleteRecords,
  loading,
}) {
  const [view, setView]               = useState('table'); // 'table' | 'kanban'
  const [search, setSearch]           = useState('');
  const [status, setStatus]           = useState('all');
  const [selected, setSelected]       = useState([]);

  // 多维表头排序控制
  const [sortField, setSortField]     = useState('date');
  const [sortOrder, setSortOrder]     = useState('desc');

  // 100% 确保标准状态完整存在，同时提取表内动态状态（过滤排除“交易中”）
  const uniqueStatuses = useMemo(() => {
    const st = new Set(BASE_STATUSES);
    records.forEach(r => {
      if (r.status && String(r.status).trim() !== '交易中') st.add(String(r.status).trim());
    });
    st.delete('交易中');
    return Array.from(st);
  }, [records]);

  // 切换列排序
  const handleSort = (field) => {
    if (sortField === field) {
      if (sortOrder === 'desc') setSortOrder('asc');
      else if (sortOrder === 'asc') {
        setSortField(null);
        setSortOrder(null);
      } else {
        setSortOrder('desc');
      }
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // 渲染排序 Icon
  const renderSortIcon = (field) => {
    if (sortField !== field || !sortOrder) {
      return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
    }
    return sortOrder === 'desc' ? (
      <ArrowDown size={12} style={{ color: 'var(--accent)' }} />
    ) : (
      <ArrowUp size={12} style={{ color: 'var(--accent)' }} />
    );
  };

  // 过滤与排序
  const filtered = useMemo(() => {
    let list = records.filter(r => {
      // 1. 文本搜索
      const matchSearch = !search ||
        r.title?.toLowerCase().includes(search.toLowerCase()) ||
        r.note?.toLowerCase().includes(search.toLowerCase());

      // 2. 飞书交易状态精确匹配
      const matchStatus = status === 'all' || r.status === status;

      return matchSearch && matchStatus;
    });

    // 排序
    if (sortField && sortOrder) {
      list = [...list].sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (['sale_price', 'cost_price', 'shipping_fee', 'profit'].includes(sortField)) {
          valA = Number(valA) || 0;
          valB = Number(valB) || 0;
        } else if (sortField === 'date') {
          const strA = String(valA || '').trim();
          const strB = String(valB || '').trim();
          if (strA && strB) {
            return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
          }
          if (strA && !strB) return -1;
          if (!strA && strB) return 1;
          return 0;
        } else {
          valA = String(valA || '').toLowerCase();
          valB = String(valB || '').toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [records, search, status, sortField, sortOrder]);

  const allSelected = selected.length === filtered.length && filtered.length > 0;
  const toggleAll   = () => setSelected(allSelected ? [] : filtered.map(r => r.record_id));
  const toggle      = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const handleDelete = () => {
    if (window.confirm(`确定删除选中的 ${selected.length} 笔交易记录吗？`)) {
      onDeleteRecords(selected);
      setSelected([]);
    }
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div className="tm-header">
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '4px' }}>
            交易明细
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            共 {filtered.length} 笔交易
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* 视图切换按钮 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '2px',
            background: 'var(--bg-subtle)', padding: '3px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
          }}>
            {[
              { id: 'table',  Icon: LayoutList, title: '表格视图' },
              { id: 'kanban', Icon: Columns, title: '看板视图' },
            ].map(({ id, Icon, title }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                title={title}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '28px', height: '26px',
                  borderRadius: '6px',
                  border: 'none', cursor: 'pointer',
                  transition: 'background 0.12s, color 0.12s',
                  background: view === id ? 'var(--bg-surface)' : 'transparent',
                  color: view === id ? 'var(--accent)' : 'var(--text-tertiary)',
                  boxShadow: view === id ? 'var(--shadow-sm)' : 'none',
                }}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>

          <button className="btn-primary" onClick={onOpenCreateModal}>
            <Plus size={14} />
            新增记录
          </button>
        </div>
      </div>

      {/* 搜索 & 4种飞书标准状态 Filter Bar */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          <input
            className="input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索商品名称、买家/防伪备注…"
            style={{ paddingLeft: '32px', fontSize: '13px' }}
          />
        </div>

        {/* 4种标准状态 Filter Chips */}
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setStatus('all')}
            style={{
              padding: '5px 12px', borderRadius: '100px', border: '1px solid', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              background: status === 'all' ? 'var(--accent)' : 'var(--bg-surface)',
              color: status === 'all' ? 'var(--accent-fg)' : 'var(--text-secondary)',
              borderColor: status === 'all' ? 'var(--accent)' : 'var(--border)',
            }}
          >
            全部状态
          </button>
          {uniqueStatuses.map(s => (
            <button
              key={s}
              onClick={() => setStatus(status === s ? 'all' : s)}
              style={{
                padding: '5px 12px', borderRadius: '100px', border: '1px solid', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                background: status === s ? 'var(--accent)' : 'var(--bg-surface)',
                color: status === s ? 'var(--accent-fg)' : 'var(--text-secondary)',
                borderColor: status === s ? 'var(--accent)' : 'var(--border)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 批量操作悬浮 Bar */}
      {selected.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'var(--accent-subtle)',
          border: '1px solid rgba(250,204,21,0.3)',
          borderRadius: 'var(--radius-md)',
          fontSize: '13px',
          animation: 'fadeSlideIn 0.15s ease both',
        }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>已选 {selected.length} 条</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {BASE_STATUSES.map(st => (
              <button
                key={st}
                className="btn-secondary"
                onClick={() => { onBatchUpdateStatus(selected, st); setSelected([]); }}
                style={{ fontSize: '12px', padding: '4px 10px', fontWeight: 600 }}
              >
                改为“{st}”
              </button>
            ))}
            <button
              onClick={handleDelete}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '4px 10px', fontSize: '12px', fontWeight: 600,
                background: 'var(--danger-subtle)', color: 'var(--danger)',
                border: '1px solid rgba(244,63,94,0.2)', borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={12} />删除
            </button>
          </div>
        </div>
      )}

      {/* 视图 1：表格视图 */}
      {view === 'table' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', width: '36px' }}>
                    <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                      {allSelected
                        ? <CheckSquare size={14} style={{ color: 'var(--accent)' }} />
                        : <Square size={14} />
                      }
                    </button>
                  </th>
                  {[
                    { key: 'title',        label: '商品名称', align: 'left' },
                    { key: 'category',     label: '分类',     align: 'left' },
                    { key: 'sale_price',   label: '售价',     align: 'right' },
                    { key: 'cost_price',   label: '成本',     align: 'right' },
                    { key: 'shipping_fee', label: '运费',     align: 'right' },
                    { key: 'profit',       label: '纯利',     align: 'right' },
                    { key: 'status',       label: '交易状态', align: 'left' },
                    { key: 'date',         label: '交易日期', align: 'left' },
                    { key: 'action',       label: '',        align: 'right' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => col.key !== 'action' && handleSort(col.key)}
                      style={{
                        padding: '10px 12px',
                        textAlign: col.align,
                        color: sortField === col.key ? 'var(--accent)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        letterSpacing: '-0.01em',
                        whiteSpace: 'nowrap',
                        fontSize: '12px',
                        cursor: col.key !== 'action' ? 'pointer' : 'default',
                        userSelect: 'none',
                      }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start' }}>
                        <span>{col.label}</span>
                        {col.key !== 'action' && renderSortIcon(col.key)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                      {search || status !== 'all' ? `没有找到状态为“${status === 'all' ? '' : status}”或搜索匹配的记录` : '暂无交易记录，点击「新增记录」开始'}
                    </td>
                  </tr>
                ) : filtered.map(r => {
                  const sel = selected.includes(r.record_id);
                  const ss  = getStatusStyle(r.status);
                  const profit = Number(r.profit) || 0;
                  return (
                    <tr
                      key={r.record_id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: sel ? 'var(--accent-subtle)' : 'transparent',
                        transition: 'background 0.1s ease',
                      }}
                      onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '11px 12px' }}>
                        <button onClick={() => toggle(r.record_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)' }}>
                          {sel ? <CheckSquare size={14} style={{ color: 'var(--accent)' }} /> : <Square size={14} />}
                        </button>
                      </td>
                      <td style={{ padding: '11px 12px', maxWidth: '220px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.title}
                        </div>
                        {r.note && (
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
                            {r.note}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '11px 12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {r.category || '3C数码'}
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        ¥{Number(r.sale_price || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>
                        ¥{Number(r.cost_price || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>
                        ¥{Number(r.shipping_fee || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'right' }}>
                        <span style={{
                          fontVariantNumeric: 'tabular-nums', fontWeight: 700,
                          color: profit >= 0 ? 'var(--success)' : 'var(--danger)',
                        }}>
                          {profit >= 0 ? '+' : ''}¥{profit.toLocaleString()}
                        </span>
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <span className={`badge ${ss.cls}`}>{r.status || '已售出'}</span>
                      </td>
                      <td style={{ padding: '11px 12px', color: 'var(--text-tertiary)', fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
                        {r.date || '—'}
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'right' }}>
                        <button
                          className="btn-ghost"
                          onClick={() => onEditRecord(r)}
                          style={{ padding: '4px 6px', color: 'var(--text-tertiary)' }}
                          title="编辑记录"
                        >
                          <Edit3 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 视图 2：4 种飞书标准状态看板视图 */}
      {view === 'kanban' && (
        <div className="kanban-grid">
          {BASE_STATUSES.map(col => {
            const items = filtered.filter(r => (r.status || '已售出') === col);
            const ss = getStatusStyle(col);
            return (
              <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px', marginBottom: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: ss.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{col}</span>
                  <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
                    无“{col}”记录
                  </div>
                ) : items.map(r => (
                  <div
                    key={r.record_id}
                    className="card card-hover"
                    onClick={() => onEditRecord(r)}
                    style={{ padding: '14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '10.5px' }}>{r.category || '3C数码'}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{r.date}</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.title}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>售价 ¥{Number(r.sale_price || 0).toLocaleString()}</span>
                      <span style={{ fontWeight: 700, color: Number(r.profit) >= 0 ? 'var(--success)' : 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>
                        +¥{Number(r.profit || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        /* Header 响应式 */
        .tm-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        /* 看板：手机 2列，桌面 4列 */
        .kanban-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 768px) {
          .kanban-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        /* 表格视图手机端横向滚动提示 */
        @media (max-width: 640px) {
          .tm-header {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}
