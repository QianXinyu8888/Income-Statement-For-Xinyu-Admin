import React, { useState, useEffect } from 'react';
import { X, DollarSign, Save, AlertCircle } from 'lucide-react';

const STATUSES = ['已售出', '自用中', '已退货'];

export default function RecordModal({ isOpen, onClose, onSave, editingRecord, loading }) {
  const [form, setForm] = useState({
    name: '', cost: '', price: '', shipping: '0', status: '已售出', date: new Date().toISOString().slice(0, 10), note: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    if (editingRecord) {
      const f = editingRecord.fields || {};
      setForm({
        name:     f['商品名称'] || f['物品名称'] || '',
        cost:     String(f['购入成本(¥)'] || f['买入成本'] || f['总成本(¥)'] || ''),
        price:    String(f['成交价(¥)']  || f['卖出价格'] || ''),
        shipping: String(f['运费(¥)']    || f['快递运费'] || '0'),
        status:   f['交易状态'] || '已售出',
        date:     f['交易日期'] || f['日期'] || new Date().toISOString().slice(0, 10),
        note:     f['备注'] || '',
      });
    } else {
      setForm({ name: '', cost: '', price: '', shipping: '0', status: '已售出', date: new Date().toISOString().slice(0, 10), note: '' });
    }
  }, [isOpen, editingRecord]);

  if (!isOpen) return null;

  const profit = (Number(form.price) || 0) - (Number(form.cost) || 0) - (Number(form.shipping) || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      '商品名称':   form.name,
      '成交价(¥)':  form.price,
      '购入成本(¥)': form.cost,
      '运费(¥)':    form.shipping || '0',
      '交易状态':   form.status,
      '交易日期':   form.date,
      '备注':       form.note,
    });
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <>
      {/* Overlay */}
      <div
        className="overlay-enter"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Dialog — Desktop center / Mobile bottom sheet */}
      <div
        className="record-modal-dialog modal-enter"
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 14px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {editingRecord ? '编辑记录' : '新增交易'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {editingRecord ? '修改已有交易记录' : '记录一笔买卖明细'}
            </div>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={16} />
          </button>
        </div>

        {/* Profit preview */}
        <div style={{
          margin: '14px 20px 0',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          background: profit >= 0 ? 'var(--success-subtle)' : 'var(--danger-subtle)',
          border: `1px solid ${profit >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <DollarSign size={13} />
            预估落袋纯利
          </div>
          <span style={{
            fontSize: '18px', fontWeight: 700, letterSpacing: '-0.04em',
            fontVariantNumeric: 'tabular-nums',
            color: profit >= 0 ? 'var(--success)' : 'var(--danger)',
          }}>
            {profit >= 0 ? '+' : ''}¥{profit.toFixed(2)}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '14px 20px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '5px' }}>
              商品名称 *
            </label>
            <input className="input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="如：iPhone 15 Pro 256G 深空黑" />
          </div>

          {/* Price / Cost / Shipping */}
          <div className="price-grid">
            {[
              { label: '买入成本 *', key: 'cost',     req: true  },
              { label: '出售价格 *', key: 'price',    req: true  },
              { label: '快递运费',   key: 'shipping', req: false },
            ].map(({ label, key, req }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  {label}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>¥</span>
                  <input
                    className="input"
                    type="number" step="0.01"
                    required={req}
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder="0.00"
                    style={{ paddingLeft: '20px', fontVariantNumeric: 'tabular-nums' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Status / Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                交易状态
              </label>
              <select
                className="input"
                value={form.status}
                onChange={e => set('status', e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                交易日期
              </label>
              <input
                className="input"
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '5px' }}>
              备注
            </label>
            <textarea
              className="input"
              rows={2}
              value={form.note}
              onChange={e => set('note', e.target.value)}
              placeholder="成色描述、买家信息或其他说明…"
              style={{ resize: 'vertical', minHeight: '60px', lineHeight: 1.5 }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.7s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  保存中…
                </>
              ) : (
                <>
                  <Save size={13} />
                  保存记录
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .record-modal-dialog {
          position: fixed;
          z-index: 61;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
          max-width: 480px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          overflow: hidden;
        }
        /* 手机端：底部上滑 Sheet */
        @media (max-width: 640px) {
          .record-modal-dialog {
            left: 0;
            top: auto;
            bottom: 0;
            transform: none;
            max-width: 100%;
            border-radius: var(--radius-xl) var(--radius-xl) 0 0;
            max-height: 92vh;
            animation: slideInBottom 0.25s cubic-bezier(0.32,0.72,0,1) both !important;
          }
        }
        /* 金额输入 3列 → 手机上 2行布局 */
        .price-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }
        @media (max-width: 480px) {
          .price-grid {
            grid-template-columns: 1fr 1fr;
          }
          .price-grid > div:last-child {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </>
  );
}
